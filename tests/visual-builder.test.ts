import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { applyBuilderAction, matchesBuilderSnapshot } from "../src/lib/visualBuilder";
import type { WebsiteSection } from "../src/types";
const a:WebsiteSection={id:"a",type:"hero",content:{headline:"A"}};
const b:WebsiteSection={id:"b",type:"features",content:{items:["B"]}};
const c:WebsiteSection={id:"c",type:"cta",content:{title:"C"}};
test("insert and move use drop boundaries and preserve original sections",()=>{
  const initial=[a,b,c];
  assert.deepEqual(applyBuilderAction(initial,{kind:"move",id:"a",index:3}).map(s=>s.id),["b","c","a"]);
  assert.deepEqual(applyBuilderAction(initial,{kind:"move",id:"c",index:0}).map(s=>s.id),["c","a","b"]);
  assert.deepEqual(applyBuilderAction([a,c],{kind:"insert",section:b,index:1}),initial);
  assert.deepEqual(initial,[a,b,c]);
});
test("duplicate, visibility, content and removal are immutable",()=>{
  const duplicate=applyBuilderAction([a,b],{kind:"duplicate",id:"b",newId:"copy"});
  assert.equal(duplicate[2].id,"copy");assert.notEqual(duplicate[2].content,b.content);
  assert.equal(applyBuilderAction([a],{kind:"visibility",id:"a"})[0].isVisible,false);
  assert.equal(applyBuilderAction([a],{kind:"content",id:"a",patch:{headline:"Edited"}})[0].content.headline,"Edited");
  assert.equal(a.content.headline,"A");
  assert.deepEqual(applyBuilderAction([a,b],{kind:"remove",id:"a"}),[b]);
  assert.equal(matchesBuilderSnapshot([a],[{...a}]),true);
  assert.equal(matchesBuilderSnapshot([a],[b]),false);
});
test("visual canvas is editor-only and template insertion preserves feature checks",()=>{
  const renderer=readFileSync("src/components/WebsiteRenderer.tsx","utf8");
  const editor=readFileSync("src/components/WebsiteEditor.tsx","utf8");
  assert.match(renderer,/const canvas = isEditingPreview \? visualCanvas : undefined/);
  assert.match(editor,/builderAllowed\(key\)/);
  assert.match(editor,/matchesBuilderSnapshot\(page.sections,expected\)/);
  assert.match(editor,/<VisualBuilderLibrary/);
  assert.match(editor,/<VisualBuilderInspector/);
});
