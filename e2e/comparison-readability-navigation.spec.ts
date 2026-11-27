import {expect,test} from "@playwright/test";

test("both homepage comparison designs meet normal-text contrast and retain usable divider at endpoints",async({page})=>{
 await page.goto("/");
 const scene=page.locator(".bt-studio-comparison .bt-comparison-scene");
 const range=page.locator(".bt-studio-comparison input[type=range]");
 await expect(scene).toBeVisible();
 for(const [key,value,selector] of [["Home","0",".bt-design-refined"],["End","100",".bt-design-basic"]] as const){
  await range.focus();await range.press(key);await expect(range).toHaveValue(value);
  const contrast=await scene.locator(selector+" .bt-design-content p").evaluate(el=>{
   const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
   const lum=(s:string)=>rgb(s).map(v=>{const x=v/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
   const fg=lum(getComputedStyle(el).color),bg=lum(getComputedStyle(el.closest(".bt-design-example")!).backgroundColor);
   return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  const frame=await scene.boundingBox(),handle=await scene.locator(".bt-comparison-handle").boundingBox();
  expect(frame).not.toBeNull();expect(handle).not.toBeNull();
  expect(handle!.x).toBeGreaterThanOrEqual(frame!.x-.5);
  expect(handle!.x+handle!.width).toBeLessThanOrEqual(frame!.x+frame!.width+.5);
 }
 await page.locator(".bt-studio-comparison").getByRole("button",{name:"Reset"}).click();
 await expect(range).toHaveValue("50");
});

test("public navigation resets scroll without moving or fading the entire page shell",async({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.goto("/");
 const link=page.locator("main a[href='/case-studies']:visible").first();
 await link.scrollIntoViewIfNeeded();
 await link.click();
 await expect(page).toHaveURL(/\/case-studies$/);
 await expect(page.locator("main")).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThanOrEqual(2);
 const style=await page.locator(".bt-public-route-transition").evaluate(el=>({transform:getComputedStyle(el).transform,animation:getComputedStyle(el).animationName}));
 expect(style.transform).toBe("none");expect(style.animation).toBe("none");
});
