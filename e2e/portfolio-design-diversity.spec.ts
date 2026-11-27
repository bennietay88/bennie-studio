import { expect,test } from "@playwright/test";
import { DEFAULT_PORTFOLIO_ITEMS } from "../src/lib/portfolioCatalog";
import { demoDesign, demoNavigation } from "../src/lib/demoDesignProfiles";
test("18 industry-specific designs have distinct structures",async({page})=>{
 test.setTimeout(120000);
 await page.route("**/api/public/studio-showcases",route=>route.fulfill({json:{showcases:{}}}));
 for(const item of DEFAULT_PORTFOLIO_ITEMS){
  await page.goto("/case-studies/showcase/"+item.slug+"/preview",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".bt-demo-design")).toHaveAttribute("data-demo-layout",demoDesign(item.slug).layout);
  await expect(page.getByTestId("industry-experience")).toHaveAttribute("data-industry-experience",item.slug);
  await expect(page.getByTestId("industry-experience").locator("h2").first()).toBeVisible();
  await expect(page.locator("main h1")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),item.slug+" horizontal overflow").toBe(true);
 }
 expect(new Set(DEFAULT_PORTFOLIO_ITEMS.map(i=>demoDesign(i.slug).layout)).size).toBe(18);
});
test("auto detailing case study and every demo page use readable heading and paragraph colours",async({page})=>{
 await page.route("**/api/public/studio-showcases",route=>route.fulfill({json:{showcases:{}}}));
 for(const suffix of ["","/preview","/preview/services","/preview/about","/preview/contact"]){
  await page.goto("/case-studies/showcase/auto-detailing"+suffix,{waitUntil:"domcontentloaded"});
  const heading=page.locator("main h1").first();
  await expect(heading).toBeVisible();
  const colours=await heading.evaluate(el=>{
   const rgb=(value:string)=>value.match(/[\d.]+/g)?.slice(0,3).map(Number)||[0,0,0];
   const luminance=(values:number[])=>values.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const fg=luminance(rgb(getComputedStyle(el).color));
   let parent:Element|null=el;
   let bg=0;
   while(parent){const value=getComputedStyle(parent).backgroundColor;if(value!=="rgba(0, 0, 0, 0)"&&value!=="transparent"){bg=luminance(rgb(value));break;}parent=parent.parentElement;}
   return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
  expect(colours,suffix+" heading contrast").toBeGreaterThanOrEqual(4.5);
 }
});
test("cleaning scope selector updates its local summary",async({page})=>{
 await page.goto("/case-studies/showcase/cleaning-service/preview",{waitUntil:"domcontentloaded"});
 await page.getByLabel("Approximate space").selectOption("Large space");
 await expect(page.getByTestId("industry-experience")).toContainText("Large space");
});
