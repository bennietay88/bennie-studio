import { expect, test } from "@playwright/test";

for(const path of ["/services", "/pricing"]){
 test(path + " preserves accessible main and principal CTA", async ({page})=>{
  await page.goto(path,{waitUntil:"domcontentloaded"});
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main").getByRole("link",{name:/free website preview|free preview/i}).first()).toBeVisible();
 });
 for(const width of [320,390,768,1440]){
  test(path + " does not overflow at " + width,async({page})=>{
   await page.setViewportSize({width,height:800});
   await page.goto(path,{waitUntil:"domcontentloaded"});
   const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   expect(scrollWidth).toBeLessThanOrEqual(width+3);
  });
 }
}
test("services conveys clear outcomes and a single service-delivery narrative",async({page})=>{
 await page.goto("/services",{waitUntil:"domcontentloaded"});
 await expect(page.locator(".s31-outcomes")).toHaveCount(1);
 await expect(page.locator(".s31-outcome-row")).toHaveCount(3);
 await expect(page.locator(".s28-chapter")).toHaveCount(3);
 await expect(page.locator(".s28-steps-section")).toHaveCount(0);
 await expect(page.locator(".s31-services-close")).toHaveCount(1);
 await expect(page.locator(".s28-website-grid article")).toHaveCount(3);
});
test("pricing highlights two plans while keeping all 4, rates, and order buttons",async({page})=>{
 await page.goto("/pricing",{waitUntil:"domcontentloaded"});
 const cards=page.locator(".s31-price-plans .s28-price-card");
 await expect(cards).toHaveCount(4);
 await expect(cards.filter({has:page.getByRole("heading",{name:"Managed Website",exact:true})})).toHaveClass(/s31-primary-plan/);
 await expect(cards.filter({has:page.getByRole("heading",{name:"Website Growth",exact:true})})).toHaveClass(/s31-primary-plan/);
 await expect(cards.locator(".s28-price-action button")).toHaveCount(4);
 await expect(page.locator(".s28-compare")).toHaveCount(1);
 const details=page.locator(".s31-pricing-optin-details");
 await expect(details).not.toHaveAttribute("open");
 await details.locator("summary").click();
 await expect(page.getByRole("form",{name:"Website tips email signup"})).toBeVisible();
});
