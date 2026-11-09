import { test, expect } from "@playwright/test";
import { EXPANDED_DEMO_SLUGS } from "../src/lib/studioInteractiveDemos";

async function mockDependencies(page:any) {
  await page.route("**/api/public/site-config", (route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({platform:{maintenanceMode:false,salesCookieBannerEnabled:false},landingPage:null,policies:[],posts:[]})}));
  await page.route("**/api/public/platform-site-cms", (route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({content:null})}));
  await page.route("**/api/public/studio-showcases", (route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({showcases:{}})}));
  await page.route("**/api/platform-events", (route:any)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true})}));
  await page.route("**/auth/v1/**", (route:any)=>route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},contentType:"application/json",body:JSON.stringify({user:null,session:null})}));
  await page.route("**/rest/v1/**", (route:any)=>route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},contentType:"application/json",body:"[]"}));
}
test.beforeEach(async({page})=>{await mockDependencies(page);});

for (const slug of EXPANDED_DEMO_SLUGS) {
  test("interactive portfolio: "+slug, async({page,isMobile})=>{
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    const root="/case-studies/showcase/"+slug+"/preview";
    await page.goto(root,{waitUntil:"domcontentloaded"});
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/fictional business.*not an active service/i)).toBeVisible();
    await expect(page.locator("main button[aria-pressed]")).toHaveCount(3);
    await page.locator("main button[aria-pressed]").nth(1).click();
    await expect(page.locator("main button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed","true");

    if (isMobile) {
      await page.getByRole("button",{name:"Open demo navigation"}).click();
      await page.getByRole("navigation",{name:"Mobile demo navigation"}).getByRole("link",{name:"Services"}).click();
    } else {
      await page.getByRole("navigation",{name:"Demo website navigation"}).getByRole("link",{name:"Services"}).click();
    }
    await expect(page).toHaveURL(new RegExp(root+"/services$"));
    await expect(page.getByRole("group",{name:"Select a service"}).getByRole("button")).toHaveCount(3);
    await page.getByRole("group",{name:"Select a service"}).getByRole("button").last().click();
    await expect(page.getByRole("group",{name:"Select a service"}).getByRole("button").last()).toHaveAttribute("aria-pressed","true");

    await page.goto(root+"/contact",{waitUntil:"domcontentloaded"});
    await expect(page.getByRole("heading",{level:1})).toBeVisible();
    await page.getByLabel("A few words about your project (optional)").fill("Example brief only");
    await page.getByRole("button",{name:"Preview enquiry summary"}).click();
    await expect(page.getByRole("status")).toContainText("Example brief only");
    await expect(page.getByRole("status")).toContainText("nothing has been submitted");
    await expect(page.getByRole("link",{name:/Explore Bennie Studio/})).toHaveAttribute("href",/\/generate-preview/);
    expect(errors,slug).toEqual([]);
  });
}
