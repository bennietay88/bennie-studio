import test from "node:test";
import assert from "node:assert/strict";
import { createDesignPreset,instantiateDesignPreset,convertSectionToLayout } from "../src/lib/designLibrary";
import type { WebsiteSection } from "../src/types";
let n=0;const id=()=>String(++n);
test("design presets discard client content and mint new IDs",()=>{
 const original:WebsiteSection={id:"original",type:"hero",content:{headline:"Private customer",imageUrl:"https://private.example/logo",buttonAction:{target:"https://private.example"}},settings:{backgroundImage:"https://private.example/image",textAlign:"center"}};
 const preset=createDesignPreset([original],"page",id);assert.ok(!JSON.stringify(preset).includes("private.example"));assert.ok(!JSON.stringify(preset).includes("Private customer"));assert.equal(preset.sections[0].settings?.textAlign,"center");assert.notEqual(instantiateDesignPreset(preset,id)[0].id,preset.sections[0].id);
 const converted=convertSectionToLayout(original,id);assert.equal(converted?.content.interaction,"visual_layout");assert.equal(original.content.headline,"Private customer");
 assert.equal(convertSectionToLayout({id:"contact",type:"contact",content:{}},id),null);
});
