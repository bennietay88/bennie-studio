import { test, expect } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";
const routes=["/","/services","/pricing","/case-studies","/generate-preview","/contact"];
function supabaseCorsHeaders(request:any){
 // WebKit omits Origin from some intercepted preflight request snapshots.
 // The app is always served from this isolated loopback origin in E2E.
 const origin=request.headers().origin||`http://127.0.0.1:${process.env.E2E_PORT||4173}`;
 const requestedHeaders=request.headers()["access-control-request-headers"];
 return {
  "access-control-allow-origin":origin,
  "access-control-allow-credentials":"true",
  "access-control-allow-methods":"GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-headers":requestedHeaders||"apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer,range,x-supabase-api-version",
  "access-control-expose-headers":"content-range,range,content-profile",
  "access-control-max-age":"600",
  "vary":"Origin, Access-Control-Request-Headers",
 };
}
async function mockSupabaseRoute(route:any){
 const headers=supabaseCorsHeaders(route.request());
 if(route.request().method()==="OPTIONS") return route.fulfill({status:204,headers});
 return route.fulfill({status:200,headers,contentType:"application/json",body:JSON.stringify([])});
}
async function mockPublicDependencies(page:any){
 await page.route("**/api/public/site-config",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({platform:{maintenanceMode:false,salesCookieBannerEnabled:false},landingPage:null,policies:[],posts:[]})}));
 await page.route("**/api/public/platform-site-cms",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({content:null})}));
 await page.route("**/api/public/studio-showcases",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({showcases:{}})}));
 await page.route("**/api/public/pricing**",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({products:[]})}));
 await page.route("**/api/platform-events",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true})}));
 await page.route("https://ipapi.co/json/",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({country_code:"US",country_name:"United States"})}));
 await page.route("**/auth/v1/**",(route:any)=>route.fulfill({status:200,headers:supabaseCorsHeaders(route.request()),contentType:"application/json",body:JSON.stringify({user:null,session:null})}));
 await page.route("**/rest/v1/**",mockSupabaseRoute);
}
test.beforeEach(async({page})=>{await mockPublicDependencies(page);});

async function mockPublicPricing(page:any){
 await page.route("**/api/public/pricing**",(route:any)=>{
  const market=new URL(route.request().url()).searchParams.get("market")||"INTL";
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({products:COMMERCIAL_FALLBACK_PRODUCTS.map(product=>({...product,price:{...getCommercialPrice(product,market as "MY"|"SG"|"GB"|"INTL"),monthlyConfigured:product.salesMotion==="self_serve",recurringConfigured:product.salesMotion==="self_serve",recurringConfigStatus:product.salesMotion==="self_serve"?"live":"draft"}}))})});
 });
 await page.route("**/api/public/site-config",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({platform:{maintenanceMode:false,salesCookieBannerEnabled:false},landingPage:null,policies:[],posts:[]})}));
 await page.route("https://ipapi.co/json/",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({country_code:"US",country_name:"United States"})}));
 await page.route("**/api/platform-events",(route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true})}));
}

test.describe("Public site freeze QA",()=>{
  test("E2E telemetry keeps payload validation without calling the remote Supabase fixture",async({page,request})=>{
    await page.goto("/");
    const endpoint=new URL("/api/platform-events",page.url()).toString();
    const valid=await request.post(endpoint,{data:{eventType:"e2e_telemetry_probe",sourcePage:"/"}});
    expect(valid.status()).toBe(200);
    expect(await valid.json()).toEqual({success:true});
    const invalid=await request.post(endpoint,{data:{eventType:"",sourcePage:"/"}});
    expect(invalid.status()).toBe(400);
  });
  test("buyer comparison guides render complete, linked and responsive tables",async({page})=>{
    for(const [path,heading] of [
      ["/managed-website-vs-diy","Managed website vs a DIY website builder"],
      ["/managed-website-vs-agency","Managed website vs a web design agency"],
    ]){
      const result=await page.goto(path,{waitUntil:"domcontentloaded"});
      expect(result?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading",{level:1,name:heading})).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("link",{name:/compare current plans/i})).toBeVisible();
      await expect(page.getByRole("link",{name:/managed website vs/i}).last()).toBeVisible();
      const extra=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
      expect(extra,path).toBeLessThanOrEqual(3);
    }
  });
  test("core pages render with one visible primary heading",async({page})=>{
    for(const path of routes){
      const errors:string[]=[];const listener=(e:Error)=>errors.push(e.message);
      page.on("pageerror",listener);
      const result=await page.goto(path,{waitUntil:"domcontentloaded"});
      expect(result?.status()).toBeLessThan(400);
      await expect(page.locator("h1:visible").first()).toBeVisible();
      expect(await page.locator("h1:visible").count(),path).toBe(1);
      expect(errors,path).toEqual([]);
      page.off("pageerror",listener);
    }
  });
  test("services CTA opens the free preview",async({page})=>{
    await page.goto("/services");
    const link=page.getByRole("link",{name:/get your free website preview/i}).first();
    await expect(link).toBeVisible();await link.click();
    await expect(page).toHaveURL(/\/generate-preview/);
    await expect(page.locator("form").first()).toBeVisible();
  });
  test("case study gallery opens a labelled studio project",async({page})=>{
    await page.goto("/case-studies");
    await expect(page.getByRole("heading",{name:/websites designed to/i})).toBeVisible();
    const links=page.locator('a[href^="/case-studies/showcase/"]:not([href*="/preview"])');
    expect(await links.count()).toBeGreaterThanOrEqual(6);
    await links.first().click();
    await expect(page).toHaveURL(/\/case-studies\/showcase\//);
    await expect(page.getByText(/illustrative design concept, not a claimed client commission/i)).toBeVisible();
  });
  test("portfolio category and visual-style filters only show matching published examples",async({page})=>{
    await page.goto("/case-studies");
    const cards=page.getByTestId("portfolio-card");
    await expect(cards).toHaveCount(18);
    await page.getByLabel("Filter by industry").selectOption("Healthcare");
    await expect(cards).toHaveCount(2);
    await expect(cards.first().getByRole("heading",{name:"Dental clinic"})).toBeVisible();
    await page.getByRole("button",{name:"Clear filters"}).click();
    await expect(cards).toHaveCount(18);
    await page.getByLabel("Search portfolio").fill("accounting");
    await expect(cards).toHaveCount(1);
    await expect(cards.first().getByRole("heading",{name:"Accounting firm"})).toBeVisible();
  });
  test("pricing presents costs and commitments",async({page})=>{
    await mockPublicPricing(page);
    await page.goto("/pricing");
    const cards=page.locator(".s28-price-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(4);
    for(const card of await cards.all()){
      await expect(card.locator(".s28-price-number")).toBeVisible();
      await expect(card.getByText(/setup/i).first()).toBeVisible();
      await expect(card.getByText(/Billing terms/i).first()).toBeVisible();
    }
  });
});
for(const width of [375,390,768,1024,1440]){
  test("No horizontal overflow at "+width+"px",async({page})=>{
    await page.setViewportSize({width,height:850});
    for(const path of ["/","/services","/pricing","/case-studies","/generate-preview"]){
      await page.goto(path,{waitUntil:"domcontentloaded"});
      await page.locator("h1:visible").first().waitFor();
      const overflow=await page.evaluate(()=>({
        extra:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
        elements:Array.from(document.querySelectorAll("body *"))
          .map((element)=>({tag:element.tagName.toLowerCase(),id:(element as HTMLElement).id,classes:typeof (element as HTMLElement).className==="string"?(element as HTMLElement).className:"",right:Math.round(element.getBoundingClientRect().right),width:Math.round(element.getBoundingClientRect().width),parents:(()=>{const result=[] as string[];let parent=element.parentElement;while(parent&&result.length<5){const rect=parent.getBoundingClientRect();result.push(`${parent.tagName.toLowerCase()}#${parent.id}.${typeof parent.className==="string"?parent.className:""} ${Math.round(rect.width)}px`);parent=parent.parentElement;}return result;})()}))
          .filter((item)=>item.right>document.documentElement.clientWidth+3&&item.width>0)
          .sort((a,b)=>b.right-a.right).slice(0,5),
      }));
      expect(overflow.extra,path+" at "+width+"px; offenders="+JSON.stringify(overflow.elements)).toBeLessThanOrEqual(3);
    }
  });
}
test("free preview rejects an empty form before submission",async({page})=>{
 await page.goto("/generate-preview");
 const form=page.locator("form").first();await expect(form).toBeVisible();
 await form.locator('button[type="submit"]').first().click();
 await expect(page.getByText(/enter an email|select your business type|required/i).first()).toBeVisible();
});
