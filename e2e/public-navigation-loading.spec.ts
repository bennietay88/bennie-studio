import {test,expect} from "@playwright/test";
test("published CMS page never flashes built-in content on initial load",async({page})=>{
 await page.route("**/api/public/platform-site-cms",async route=>{
  await new Promise(resolve=>setTimeout(resolve,600));
  await route.fulfill({json:{content:{pages:{"/about":{replacePageContent:true,heroTitle:"Published about page",heroDescription:"Published content",sections:[]}}}}});
 });
 await page.addInitScript(()=>{
  const seen:string[]=[];
  (window as any).__headings=seen;
  new MutationObserver(()=>{const h=document.querySelector("main h1");if(h?.textContent)seen.push(h.textContent.trim());}).observe(document,{subtree:true,childList:true,characterData:true});
 });
 await page.goto("/about",{waitUntil:"domcontentloaded"});
 await expect(page.getByRole("heading",{name:"Published about page",exact:true})).toBeVisible();
 const seen=await page.evaluate(()=>(window as any).__headings as string[]);
 expect(seen.length).toBeGreaterThan(0);
 expect(seen.every(title=>title==="Published about page")).toBe(true);
});
test("portfolio CMS request is shared between catalogue and detail navigation",async({page})=>{
 let requests=0;
 await page.route("**/api/public/studio-showcases",route=>{requests++;return route.fulfill({json:{showcases:{}}});});
 await page.goto("/case-studies",{waitUntil:"domcontentloaded"});
 await expect(page.getByTestId("portfolio-card")).toHaveCount(18);
 await page.getByTestId("portfolio-card").first().locator('a[href*="/case-studies/showcase/"]').first().click();
 await expect(page).toHaveURL(/case-studies\/showcase\//);
 await expect(page.locator("main h1")).toBeVisible();
 expect(requests).toBe(1);
});
