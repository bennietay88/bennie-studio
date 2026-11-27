import {z} from "zod";
const marker="bennie_website_slot";
const enabled=()=>process.env.MULTI_SITE_DRAFT_LIFECYCLE==="true"&&process.env.MULTI_SITE_ADDON_BILLING==="true";
const priceId=z.string().regex(/^price_[A-Za-z0-9_]+$/).max(150);
const id=z.string().uuid();
const ref=(x:any):string|null=>typeof x==="string"?x:typeof x?.id==="string"?x.id:null;
const fields="id,business_id,stripe_customer_id,stripe_price_id,stripe_checkout_session_id,stripe_subscription_id,status,paid_through,cancel_at_period_end,last_event_created";
function checked(result:any){if(result.error)throw result.error;return result.data;}
export function validWebsiteAddonPrice(p:any){return p?.active===true&&p?.type==="recurring"&&p?.recurring?.usage_type==="licensed"&&p?.recurring?.interval==="month"&&p?.recurring?.interval_count===1&&Number.isSafeInteger(p?.unit_amount)&&p.unit_amount>0;}
export function websiteAddonPaidState(s:any,now=Date.now()){
 const invoice=typeof s.latest_invoice==="object"?s.latest_invoice:null;
 const end=Number(s.items?.data?.[0]?.current_period_end??s.current_period_end??0);
 const active=s.status==="active"&&invoice?.status==="paid"&&Number.isFinite(end)&&end*1000>now;
 return {status:s.status==="canceled"||s.status==="incomplete_expired"?"cancelled":active?"active":"inactive",paid_through:active?new Date(end*1000).toISOString():null,cancel_at_period_end:Boolean(s.cancel_at_period_end)};
}
export async function handleWebsiteAddonWebhook(db:any,getStripe:()=>Promise<any>,event:any):Promise<boolean>{
 const obj=event.data?.object;const type=String(event.type||"");
 if(!obj)return false;
 const checkout=type.startsWith("checkout.session.");
 const subEvent=type.startsWith("customer.subscription.");
 const invoice=type==="invoice.paid"||type==="invoice.payment_failed";
 if(!checkout&&!subEvent&&!invoice)return false;
 let metadata=invoice?(obj.parent?.subscription_details?.metadata||obj.subscription_details?.metadata):obj.metadata;
 const subscriptionId=checkout?ref(obj.subscription):subEvent?ref(obj):ref(obj.subscription||obj.parent?.subscription_details?.subscription);
 if(metadata?.type!==marker&&invoice&&subscriptionId&&process.env.MULTI_SITE_DRAFT_LIFECYCLE==="true"){
  const known=checked(await db.from("website_addon_orders").select(fields).eq("stripe_subscription_id",subscriptionId).maybeSingle());
  if(known)metadata={type:marker,orderId:known.id,businessId:known.business_id};
 }
 if(metadata?.type!==marker)return false;
 if(!id.safeParse(metadata.orderId).success)throw Error("Invalid website add-on metadata");
 const order=checked(await db.from("website_addon_orders").select(fields).eq("id",metadata.orderId).maybeSingle());
 if(!order||order.business_id!==metadata.businessId||order.stripe_customer_id!==ref(obj.customer))throw Error("Website add-on ownership mismatch");
 if(checkout&&order.stripe_checkout_session_id&&order.stripe_checkout_session_id!==obj.id)throw Error("Website add-on checkout mismatch");
 if(order.stripe_subscription_id&&subscriptionId&&order.stripe_subscription_id!==subscriptionId)throw Error("Website add-on subscription mismatch");
 const stamp=Number(event.created);
 if(!Number.isSafeInteger(stamp)||stamp<order.last_event_created)return true;
 if(checkout&&type==="checkout.session.expired"&&!subscriptionId){
  checked(await db.from("website_addon_orders").update({status:"expired",last_event_created:stamp}).eq("id",order.id).eq("status","pending").lte("last_event_created",stamp));return true;
 }
 if(!subscriptionId)return true;
 const stripe=await getStripe();
 const subscription=await stripe.subscriptions.retrieve(subscriptionId,{expand:["latest_invoice"]});
 if(subscription.metadata?.type!==marker||subscription.metadata?.orderId!==order.id||subscription.metadata?.businessId!==order.business_id||ref(subscription.customer)!==order.stripe_customer_id||subscription.items?.data?.length!==1||subscription.items.data[0].price?.id!==order.stripe_price_id||subscription.items.data[0].quantity!==1)throw Error("Website add-on subscription validation failed");
 const state=websiteAddonPaidState(subscription);
 checked(await db.from("website_addon_orders").update({...state,stripe_subscription_id:subscriptionId,last_event_created:stamp}).eq("id",order.id).eq("business_id",order.business_id).lte("last_event_created",stamp));
 return true;
}
export async function cancelWebsiteAddonsWithParent(db:any,getStripe:()=>Promise<any>,businessId:string){
 if(process.env.MULTI_SITE_DRAFT_LIFECYCLE!=="true")return;
 const orders=checked(await db.from("website_addon_orders").select(fields).eq("business_id",businessId).in("status",["active","inactive","pending"]));
 if(!orders?.length)return;
 const stripe=await getStripe();
 for(const order of orders){
  if(order.stripe_subscription_id){
   const sub=await stripe.subscriptions.retrieve(order.stripe_subscription_id);
   if(sub.metadata?.type!==marker||sub.metadata?.orderId!==order.id||ref(sub.customer)!==order.stripe_customer_id)throw Error("Website add-on cancellation scope mismatch");
   if(sub.status!=="canceled")await stripe.subscriptions.cancel(sub.id);
   checked(await db.from("website_addon_orders").update({status:"cancelled",paid_through:null}).eq("id",order.id).eq("business_id",businessId));
  }else if(order.stripe_checkout_session_id){
   const session=await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
   if(session.status==="open")await stripe.checkout.sessions.expire(session.id);
  }
 }
}
export function registerWebsiteAddonRoutes(app:any,db:any,authenticate:any,getProfile:any,getStripe:()=>Promise<any>){
 const fail=(res:any,e:any)=>{console.error("Website add-on operation failed",{code:e?.code});return res.status(503).json({error:"Website add-on operation unavailable. No website entitlement has been granted."});};
 async function admin(req:any,res:any){
  res.setHeader("Cache-Control","private, no-store");const p=await getProfile(req.user.id);
  if(p?.status!=="active"||p.role!=="super_admin"){res.status(403).json({error:"Super administrator required"});return false;}return true;
 }
 async function owner(req:any,res:any){
  res.setHeader("Cache-Control","private, no-store");const p=await getProfile(req.user.id);
  if(p?.status!=="active"||p.role!=="business_admin"||!p.business_id){res.status(403).json({error:"Business administrator required"});return null;}
  return checked(await db.from("businesses").select("id,status,subscription_status,stripe_customer_id,stripe_subscription_id").eq("id",p.business_id).single());
 }
 async function configured(){
  const config=checked(await db.from("website_addon_price").select("stripe_price_id").eq("singleton",true).maybeSingle());
  if(!config)return null;
  const price=await (await getStripe()).prices.retrieve(config.stripe_price_id);
  return validWebsiteAddonPrice(price)?price:null;
 }
 app.get("/api/admin/website-addon-price",authenticate,async(req:any,res:any)=>{
  try{if(!await admin(req,res))return;const config=checked(await db.from("website_addon_price").select("stripe_price_id").eq("singleton",true).maybeSingle());return res.json({priceId:config?.stripe_price_id||"",purchasesEnabled:enabled()});}catch(e){return fail(res,e);}
 });
 app.patch("/api/admin/website-addon-price",authenticate,async(req:any,res:any)=>{
  const input=z.object({priceId}).strict().safeParse(req.body);if(!input.success)return res.status(400).json({error:"Enter an existing Stripe Price ID"});
  try{if(!await admin(req,res))return;const price=await (await getStripe()).prices.retrieve(input.data.priceId);
   if(!validWebsiteAddonPrice(price))return res.status(400).json({error:"Use an active, positive, fixed monthly recurring Stripe price."});
   checked(await db.from("website_addon_price").upsert({singleton:true,stripe_price_id:price.id,updated_by:req.user.id,updated_at:new Date().toISOString()},{onConflict:"singleton"}));
   return res.json({priceId:price.id,purchasesEnabled:enabled()});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/account/website-addons",authenticate,async(req:any,res:any)=>{
  try{const b=await owner(req,res);if(!b)return;
   const orders=checked(await db.from("website_addon_orders").select("id,status,paid_through,cancel_at_period_end").eq("business_id",b.id).order("created_at",{ascending:false}).limit(100));
   const price=enabled()?await configured():null;
   return res.json({businessId:b.id,enabled:Boolean(price&&b.status==="active"&&b.subscription_status==="active"&&b.stripe_customer_id&&b.stripe_subscription_id),price:price?{id:price.id,currency:price.currency,amount:price.unit_amount}:null,orders:orders||[]});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/account/website-addons/checkout",authenticate,async(req:any,res:any)=>{
  if(!enabled())return res.status(503).json({error:"Website add-on purchases are disabled."});
  const input=z.object({priceId,confirmation:z.literal(true)}).strict().safeParse(req.body);if(!input.success)return res.status(400).json({error:"Confirm the displayed recurring price"});
  try{const b=await owner(req,res);if(!b)return;
   if(b.status!=="active"||b.subscription_status!=="active"||!b.stripe_customer_id||!b.stripe_subscription_id)return res.status(403).json({error:"An active billed subscription is required."});
   const price=await configured();if(!price||price.id!==input.data.priceId)return res.status(409).json({error:"Pricing unavailable or changed. Refresh first."});
   const limit=checked(await db.rpc("effective_website_limit",{p_business:b.id}));if(limit>=1000)return res.status(409).json({error:"Website allowance maximum reached."});
   const stripe=await getStripe();
   const parent=await stripe.subscriptions.retrieve(b.stripe_subscription_id);
   if(parent.status!=="active"||ref(parent.customer)!==b.stripe_customer_id)return res.status(403).json({error:"Active parent subscription required"});
   let order=checked(await db.from("website_addon_orders").select(fields).eq("business_id",b.id).eq("status","pending").maybeSingle());
   if(!order){
    const created=await db.from("website_addon_orders").insert({business_id:b.id,created_by:req.user.id,stripe_customer_id:b.stripe_customer_id,stripe_price_id:price.id}).select(fields).single();
    if(created.error?.code==="23505")order=checked(await db.from("website_addon_orders").select(fields).eq("business_id",b.id).eq("status","pending").single());else order=checked(created);
   }
   if(order.stripe_price_id!==price.id||order.stripe_customer_id!==b.stripe_customer_id)return res.status(409).json({error:"An older checkout is pending. Contact support."});
   if(order.stripe_checkout_session_id){
    const session=await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if(session.status==="open"&&session.url)return res.json({url:session.url});
    return res.status(409).json({error:"Checkout is awaiting synchronization. Refresh later."});
   }
   const metadata={type:marker,businessId:b.id,orderId:order.id};
   const origin=String(process.env.APP_PUBLIC_URL||process.env.PUBLIC_APP_URL||"https://app.bennietay.com").replace(/\/+$/,"");
   const session=await stripe.checkout.sessions.create({mode:"subscription",customer:b.stripe_customer_id,line_items:[{price:price.id,quantity:1}],metadata,subscription_data:{metadata},success_url:origin+"/dashboard/websites?addon=returned",cancel_url:origin+"/dashboard/websites?addon=cancelled"},{idempotencyKey:"website-slot-"+order.id});
   checked(await db.from("website_addon_orders").update({stripe_checkout_session_id:session.id}).eq("id",order.id).eq("business_id",b.id));
   if(!session.url)throw Error("Checkout URL missing");return res.json({url:session.url});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/account/website-addons/:orderId/cancel",authenticate,async(req:any,res:any)=>{
  if(!id.safeParse(req.params.orderId).success||req.body?.confirmation!==true)return res.status(400).json({error:"Invalid cancellation"});
  try{const b=await owner(req,res);if(!b)return;
   const order=checked(await db.from("website_addon_orders").select(fields).eq("id",req.params.orderId).eq("business_id",b.id).maybeSingle());
   if(!order)return res.status(404).json({error:"Add-on not found"});
   const stripe=await getStripe();
   if(order.status==="pending"&&order.stripe_checkout_session_id){
    const session=await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if(session.metadata?.orderId!==order.id||ref(session.customer)!==order.stripe_customer_id||session.status!=="open")return res.status(409).json({error:"Checkout is no longer open"});
    await stripe.checkout.sessions.expire(session.id);checked(await db.from("website_addon_orders").update({status:"expired"}).eq("id",order.id).eq("status","pending"));return res.json({ok:true});
   }
   if(!order.stripe_subscription_id||!["active","inactive"].includes(order.status))return res.status(409).json({error:"No renewable add-on found"});
   const sub=await stripe.subscriptions.retrieve(order.stripe_subscription_id);
   if(sub.metadata?.type!==marker||sub.metadata?.orderId!==order.id||ref(sub.customer)!==order.stripe_customer_id)throw Error("Add-on cancellation scope mismatch");
   await stripe.subscriptions.update(sub.id,{cancel_at_period_end:true});
   checked(await db.from("website_addon_orders").update({cancel_at_period_end:true}).eq("id",order.id).eq("business_id",b.id));return res.json({ok:true});
  }catch(e){return fail(res,e);}
 });
}
