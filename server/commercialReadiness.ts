/** Read-only, super-admin-only report. Counts use exact database counts, not capped row samples. */
export async function loadCommercialReadiness(db:any,getStripe:()=>Promise<any>){
 const since=new Date(Date.now()-30*86400000).toISOString();
 const count=async(table:string,filter:(q:any)=>any=(q)=>q)=>{
  try{const {count,error}=await filter(db.from(table).select("*",{count:"exact",head:true}));return error?null:count??null;}catch{return null;}
 };
 const events=["pricing_view","preview_start","preview_started","submit_business_details","preview_generated","preview_checkout_started","checkout_started","preview_checkout_failed","preview_checkout_redirected","platform_lead_submitted","consultation_request_saved"];
 const [eventCounts,openTasks,unreconciled,newLeads,bookings,orders,paidOrders,contracts,affiliates,referrals,invoiceResult,priceResult]=await Promise.all([
  Promise.all(events.map(async event=>[event,await count("tracking_events",q=>q.eq("event_type",event).is("business_id",null).gte("created_at",since))] as const)),
  count("sales_tasks",q=>q.eq("status","open")),
  count("sales_tasks",q=>q.eq("status","open").eq("task_type","reply_reconciliation")),
  count("leads",q=>q.eq("status","new")),
  count("sales_call_bookings"),
  count("orders"),
  count("orders",q=>q.eq("status","paid")),
  count("checkout_contract_snapshots",q=>q.gte("created_at",since)),
  count("affiliates"),count("affiliate_referrals"),
  db.from("finance_invoices").select("currency,total,payment_status",{count:"exact"}).eq("payment_status","paid").limit(1000),
  db.from("commercial_market_prices").select("market,currency,recurring_monthly_price,recurring_setup_fee,minimum_term_months,recurring_config_status,recurring_stripe_monthly_price_id,recurring_stripe_setup_price_id,commercial_products!inner(slug,active)").eq("market","INTL").eq("active",true).eq("commercial_products.active",true)
 ]);
 const paidInvoiceTotals:Record<string,number>={};
 if(!invoiceResult.error&&invoiceResult.count===(invoiceResult.data||[]).length)for(const row of invoiceResult.data||[]){const currency=String(row.currency||"").toUpperCase();const total=Number(row.total);if(/^[A-Z]{3}$/.test(currency)&&Number.isFinite(total))paidInvoiceTotals[currency]=(paidInvoiceTotals[currency]||0)+total;}
 const rows=priceResult.error?[]:priceResult.data||[];
 let stripe:any=null;try{stripe=await getStripe();}catch{/* unavailable is not zero */}
 const prices=await Promise.all(rows.map(async(row:any)=>{
  const check=async(id:any,amount:any,recurring:boolean)=>{
   if(!id)return "not_configured";
   if(!stripe)return "unverified";
   try{const price=await stripe.prices.retrieve(id);return price.active&&price.currency===String(row.currency).toLowerCase()&&price.unit_amount===Math.round(Number(amount)*100)&&(recurring?price.recurring?.interval==="month":!price.recurring)?"matches":"differs";}catch{return "unverified";}
  };
  return {slug:row.commercial_products?.slug,currency:row.currency,monthly:row.recurring_monthly_price,setup:row.recurring_setup_fee,term:row.minimum_term_months,status:row.recurring_config_status,storedMonthlyPrice:await check(row.recurring_stripe_monthly_price_id,row.recurring_monthly_price,true),storedSetupPrice:await check(row.recurring_stripe_setup_price_id,row.recurring_setup_fee,false)};
 }));
 // Checkout session evidence, restricted to this application's explicit metadata.
 // Never return customer identities, session IDs or URLs.
 let stripeEvidence:null|{livePaid:number;liveOpen:number;liveExpired:number;test:number;completeScan:boolean;grossPaidMinor:Record<string,number>}=null;
 if(stripe)try{
  const result={livePaid:0,liveOpen:0,liveExpired:0,test:0,completeScan:false,grossPaidMinor:{} as Record<string,number>};
  let cursor:string|undefined;
  for(let page=0;page<5;page++){
   const batch=await stripe.checkout.sessions.list({limit:100,created:{gte:Math.floor(Date.parse(since)/1000)},...(cursor?{starting_after:cursor}:{})});
   for(const session of batch.data){
    if(session.metadata?.publicOrder!=="1"&&!session.metadata?.proposalId)continue;
    if(!session.livemode){result.test++;continue;}
    if(session.status==="complete"&&session.payment_status==="paid"){result.livePaid++;const c=String(session.currency||"").toUpperCase();if(c)result.grossPaidMinor[c]=(result.grossPaidMinor[c]||0)+Number(session.amount_total||0);}
    else if(session.status==="open")result.liveOpen++;
    else if(session.status==="expired")result.liveExpired++;
   }
   if(!batch.has_more){result.completeScan=true;break;}
   cursor=batch.data.at(-1)?.id;if(!cursor)break;
  }
  stripeEvidence=result;
 }catch{/* report unavailable, not zero */}
 return {generatedAt:new Date().toISOString(),periodDays:30,events:Object.fromEntries(eventCounts),operations:{openTasks,unreconciled,newLeads,bookings,orders,paidOrders,contracts,affiliates,referrals},prices:priceResult.error?null:prices,paidInvoiceTotals:invoiceResult.error||invoiceResult.count!==(invoiceResult.data||[]).length?null:paidInvoiceTotals,stripeEvidence,notes:["Events are not unique visitors or a matched conversion cohort.","Stored Stripe price references are diagnostics; public preview checkout uses authoritative inline server-side recurring catalogue amounts and applicable waivers.","Stripe checkout gross excludes renewals, refunds and unrelated payments; it is not net revenue.","Paid invoice ledger may include manual or test records; reconcile before reporting cash or MRR. Margin and retention remain unverified without cost and cohort evidence."]};
}
