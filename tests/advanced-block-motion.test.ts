import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBlockMotion,blockMotionFrames,motionScrollProgress} from "../src/lib/visualBlocks";
test("advanced motion uses bounded keyframes and neutral final pose",()=>{
 const config=normalizeBlockMotion({effect:"sequence",trigger:"scrub",pin:true,pinDistance:999,keyframes:[{x:500,y:-500,scale:8,rotateY:90,opacity:0}]});
 assert.equal(config.pin,true);assert.equal(config.pinDistance,60);assert.equal(config.keyframes?.[0].x,32);assert.equal(config.keyframes?.[0].rotateY,18);assert.equal(config.keyframes?.[0].opacity,.5);
 assert.equal(config.keyframes?.[2].scale,1);assert.equal(config.keyframes?.[2].rotateY,0);assert.equal(blockMotionFrames(config).length,3);
 assert.equal(normalizeBlockMotion({effect:"none",trigger:"scrub",pin:true}).pin,false);
 assert.equal(normalizeBlockMotion({effect:"tilt",trigger:"hover",pin:true}).pin,false);
});
test("scroll progress is bounded and stable",()=>{assert.equal(motionScrollProgress(1000,400,800),0);assert.equal(motionScrollProgress(-1000,400,800),1);assert.ok(motionScrollProgress(400,400,800)>0);});
