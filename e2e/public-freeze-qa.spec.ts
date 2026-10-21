import { test, expect } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";
const routes=["/","/services","/pricing","/case-studies","/generate-preview","/contact"];

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
    await expect(page.getByRole("heading",{name:/see the websites/i})).toBeVisible();
    const links=page.locator('a[href^="/case-studies/showcase/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(6);
    await links.first().click();
    await expect(page).toHaveURL(/\/case-studies\/showcase\//);
    await expect(page.getByText(/not paid client work|not a paid customer/i)).toBeVisible();
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
      await expect(card.getByText(/initial term/i).first()).toBeVisible();
    }
  });
});
for(const width of [375,390,768,1024,1440]){
  test("No horizontal overflow at "+width+"px",async({page})=>{
    await page.setViewportSize({width,height:850});
    for(const path of ["/","/services","/pricing","/case-studies","/generate-preview"]){
      await page.goto(path,{waitUntil:"domcontentloaded"});
      await page.locator("h1:visible").first().waitFor();
      const extra=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
      expect(extra,path+" at "+width+"px").toBeLessThanOrEqual(3);
    }
  });
}
test("free preview rejects an empty form before submission",async({page})=>{
 await page.goto("/generate-preview");
 const form=page.locator("form").first();await expect(form).toBeVisible();
 await form.locator('button[type="submit"]').first().click();
 await expect(page.getByText(/enter an email|select your business type|required/i).first()).toBeVisible();
});
