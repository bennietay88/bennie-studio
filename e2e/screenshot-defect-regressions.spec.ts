import { expect, test } from "@playwright/test";

test("marketing footer is legible and uses a compact desktop grid", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/", {waitUntil:"domcontentloaded"});
  const footer=page.locator(".sfn-footer");
  await expect(footer).toBeVisible();
  const diagnostics=await footer.evaluate(el => {
    const desc=el.querySelector("p");
    const groups=[...el.querySelectorAll(":scope > div:first-child > div")];
    const style=getComputedStyle(el);
    const text=desc?getComputedStyle(desc).color:"";
    return {background:style.backgroundColor,text,gridCols:getComputedStyle(el.querySelector(":scope > div")!).gridTemplateColumns,groups:groups.length};
  });
  expect(diagnostics.background).toBe("rgb(23, 43, 66)");
  expect(diagnostics.text).toBe("rgb(229, 237, 248)");
  expect(diagnostics.gridCols.split(" ").length).toBe(6);
  expect(diagnostics.groups).toBeGreaterThanOrEqual(5);
});

test("all 18 portfolio cards load unique captured website images", async ({page}) => {
  await page.route("**/api/public/studio-showcases", route => route.fulfill({json:{showcases:{}}}));
  await page.goto("/case-studies", {waitUntil:"domcontentloaded"});
  const cards=page.getByTestId("portfolio-card");
  await expect(cards).toHaveCount(18);
  const images=cards.getByTestId("portfolio-screenshot");
  await expect(images).toHaveCount(18);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>=900)).toBe(true);
  }
  const sources=await images.evaluateAll(nodes=>nodes.map(node=>(node as HTMLImageElement).currentSrc));
  expect(new Set(sources).size).toBe(18);
  expect(sources.every(src=>src.endsWith("-cover.webp"))).toBe(true);
  await expect(page.locator(".portfolio-concept-preview")).toHaveCount(0);
});

test("case study walkthrough loads desktop and mobile captures", async ({page}) => {
  await page.route("**/api/public/studio-showcases", route => route.fulfill({json:{showcases:{}}}));
  for (const slug of ["dental-clinic","accounting-firm","event-planning"]) {
    await page.goto("/case-studies/showcase/"+slug,{waitUntil:"domcontentloaded"});
    for (const kind of ["desktop","mobile"]) {
      const section=page.getByTestId("study-"+kind+"-screenshot");
      const image=section.locator("img");
      await image.scrollIntoViewIfNeeded();
      await expect.poll(()=>image.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
      await expect(section.getByRole("link",{name:"View full image"})).toHaveAttribute("href",new RegExp(slug+"-"+kind+"\\.jpg$"));
    }
  }
});

test("unverified prices do not masquerade as monthly quote amounts", async ({page}) => {
  await page.goto("/pricing", {waitUntil:"domcontentloaded"});
  await expect(page.locator(".s28-price-card")).toHaveCount(4);
  const first=page.locator(".s28-price-card").first();
  await expect(first.locator(".s28-price-amount")).toBeVisible();
  await expect(first.locator(".s28-price-amount")).not.toHaveText("Ask for quote");
  await expect(first.locator(".s28-price-amount")).not.toHaveText("By quote");
  // The rate can be live or unavailable. If unavailable, enquiry remains possible
  // but checkout cannot silently use invented fallback dollars.
  if (await first.locator(".s28-price-amount").textContent() === "Price unavailable") {
    await expect(first.locator(".s28-price-period")).toHaveCount(0);
    await expect(first.getByRole("button",{name:/Ask about this plan/i})).toBeEnabled();
  }
});

test("interactive designs load locally hosted industry photography",async({page})=>{
 await page.route("**/api/public/studio-showcases",route=>route.fulfill({json:{showcases:{}}}));
 for(const slug of ["dental-clinic","accounting-firm","physiotherapy-clinic","event-planning"]){
  await page.goto("/case-studies/showcase/"+slug+"/preview",{waitUntil:"domcontentloaded"});
  const photo=page.getByTestId("demo-industry-photo").first();
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src","/images/case-studies/photography/"+slug+".jpg");
  await expect.poll(()=>photo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>=500)).toBe(true);
 }
});
