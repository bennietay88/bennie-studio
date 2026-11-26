import test from "node:test";
import assert from "node:assert/strict";
import { createVisualBlock, insertBlock, moveBlock, findBlock, normalizeBlockMotion, normalizeBlocks, safeBlockUrl } from "../src/lib/visualBlocks";
test("nested blocks move across columns without cycles or lost content",()=>{
  const group=createVisualBlock("columns","group"), text=createVisualBlock("text","text");
  const first=insertBlock([group],{parent:"group",side:"left",index:0},text);
  const moved=moveBlock(first,"text",{parent:"group",side:"right",index:0});
  assert.equal(moved[0].left?.length,0);assert.equal(moved[0].right?.[0].id,"text");
  assert.deepEqual(moveBlock(moved,"group",{parent:"group",side:"left",index:0}),moved);
  assert.equal(findBlock(moved,"text")?.kind,"text");
});
test("motion timing and column widths are bounded; unsafe URLs rejected",()=>{
  assert.equal(normalizeBlockMotion({effect:"slide",duration:9999,delay:-1}).duration,1600);
  assert.equal(normalizeBlockMotion({delay:-1}).delay,0);
  assert.equal(normalizeBlocks([{id:"g",kind:"columns",ratio:99}])[0].ratio,80);
  assert.equal(safeBlockUrl("javascript:alert(1)"),"");assert.equal(safeBlockUrl("//evil.example"),"");assert.equal(safeBlockUrl("/contact"),"/contact");
});
