import { expect, test } from "@playwright/test";

for(const route of ["/contact","/resources","/generate-preview"]) {
  test(route+" has a single main heading and a clear primary action",async({page})=>{
    await page.goto(route,{waitUntil:"domcontentloaded"});
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".c27-footer-cta")).toHaveCount(0);
  });
  for(const width of [320,390,768,1440]) {
    test(route+" has no horizontal overflow at "+width,async({page})=>{
      await page.setViewportSize({width,height:820});
      await page.goto(route,{waitUntil:"domcontentloaded"});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+3);
    });
  }
}

test("contact project brief preserves lead submission and preview handoff without URL PII",async({page})=>{
  let body:Record<string,unknown>|undefined;
  await page.route("**/api/platform-leads",async(route)=>{
    body=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({success:true,leadId:"lead-contact-round4"})});
  });
  await page.goto("/contact",{waitUntil:"domcontentloaded"});
  const form=page.getByRole("form",{name:"Contact project brief"});
  await form.getByRole("textbox",{name:"Your name"}).fill("Test Person");
  await form.getByRole("textbox",{name:"Business or company"}).fill("Example Service");
  await form.getByRole("textbox",{name:"Work email"}).fill("person@example.test");
  await form.getByRole("button",{name:/Send brief & continue to preview/i}).click();
  await expect(page).toHaveURL(/\/generate-preview\?mode=business&source=contact/);
  expect(new URL(page.url()).searchParams.has("email")).toBe(false);
  expect(body).toMatchObject({name:"Test Person",email:"person@example.test",businessName:"Example Service",formName:"Contact project brief",leadType:"project_brief"});
  await expect(page.locator("#preview-name")).toHaveValue("Test Person");
});
test("contact failure shows error and never navigates away",async({page})=>{
  await page.route("**/api/platform-leads",r=>r.fulfill({status:503,contentType:"application/json",body:JSON.stringify({success:false,message:"Service temporarily unavailable"})}));
  await page.goto("/contact",{waitUntil:"domcontentloaded"});
  const form=page.getByRole("form",{name:"Contact project brief"});
  await form.getByRole("textbox",{name:"Your name"}).fill("Test Person");
  await form.getByRole("textbox",{name:"Business or company"}).fill("Example Service");
  await form.getByRole("textbox",{name:"Work email"}).fill("person@example.test");
  await form.getByRole("button",{name:/Send brief & continue to preview/i}).click();
  await expect(form.getByRole("alert")).toContainText("Service temporarily unavailable");
  await expect(page).toHaveURL(/\/contact$/);
});
test("resources search and category controls filter real article routes",async({page})=>{
  await page.goto("/resources",{waitUntil:"domcontentloaded"});
  const cards=page.locator(".s33-resource-card");
  await expect(cards.first()).toBeVisible();
  const count=await cards.count();expect(count).toBeGreaterThan(0);
  await page.getByRole("button",{name:"All",exact:true}).click();
  await page.getByRole("button",{name:"Conversion",exact:true}).click();
  await expect(page.getByRole("button",{name:"Clear filters"})).toBeVisible();
  expect(await cards.count()).toBeLessThanOrEqual(count);
  await page.getByRole("button",{name:"Clear filters"}).click();
  await expect(cards).toHaveCount(count);
  await cards.first().click();
  await expect(page).toHaveURL(/\/resources\/[^/]+$/);
});
test("resources optional newsletter is collapsed and contact form separate",async({page})=>{
  await page.goto("/resources",{waitUntil:"domcontentloaded"});
  const disclosure=page.locator(".s33-checklist-details");
  await expect(disclosure).toHaveCount(1);
  await expect(disclosure).not.toHaveAttribute("open");
  await disclosure.locator("summary").click();
  await expect(page.getByRole("form",{name:"Website tips email signup"})).toBeVisible();
});
test("preview offers existing site and from-scratch modes without changing lead rules",async({page})=>{
  await page.goto("/generate-preview",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".s33-preview-guide")).toBeVisible();
  await expect(page.locator("#preview-brief")).toBeVisible();
  await page.getByRole("button",{name:/I already have a website/i}).click();
  await expect(page.locator("#preview-url-first")).toBeVisible();
  await page.getByRole("button",{name:/I need a website from scratch/i}).click();
  await expect(page.locator("#preview-business-type")).toBeVisible();
  await expect(page.getByRole("button",{name:/Show instant concept/i})).toBeVisible();
});
