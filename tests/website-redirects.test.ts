import test from "node:test";
import assert from "node:assert/strict";
import {validateWebsiteRedirects,matchWebsiteRedirect} from "../src/lib/websiteRedirects";
test("same-host redirects reject open redirects, reserved paths, duplicate sources and cycles",()=>{
 const rule={from:"/old",to:"/new",status:301};
 assert.equal(validateWebsiteRedirects([rule]),true);
 assert.deepEqual(matchWebsiteRedirect([rule],"/old"),rule);
 for(const to of ["//evil.example","https://evil.example","/api/private","/dashboard","/old","/../x"])assert.equal(validateWebsiteRedirects([{...rule,to}]),false);
 assert.equal(validateWebsiteRedirects([rule,rule]),false);
 assert.equal(validateWebsiteRedirects([rule,{from:"/new",to:"/old",status:302}]),false);
});
