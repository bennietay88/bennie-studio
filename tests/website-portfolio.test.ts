import test from "node:test";
import assert from "node:assert/strict";
import { filterPortfolioSites, selectPortfolioSite, siteLabel } from "../src/lib/websitePortfolio";
const sites = [
  {id:"a",business_id:"tenant-a",status:"draft",seo:{title:"Business site"},updated_at:"2026-11-20"},
  {id:"b",business_id:"tenant-a",status:"published",slug:"personal",updated_at:"2026-11-21"},
  {id:"c",business_id:"tenant-b",status:"published",seo:{title:"Business site"},updated_at:"2026-11-22"}
];
test("site selection requires an exact site and tenant match; no fallback",()=>{
  assert.equal(selectPortfolioSite(sites,"tenant-a","b")?.id,"b");
  assert.equal(selectPortfolioSite(sites,"tenant-a","c"),null);
  assert.equal(selectPortfolioSite(sites,"tenant-a","missing"),null);
});
test("portfolio search and status filters cannot include sibling tenants",()=>{
  assert.deepEqual(filterPortfolioSites(sites,"tenant-a").map(s=>s.id),["b","a"]);
  assert.deepEqual(filterPortfolioSites(sites,"tenant-a","business").map(s=>s.id),["a"]);
  assert.deepEqual(filterPortfolioSites(sites,"tenant-a","","published").map(s=>s.id),["b"]);
  assert.deepEqual(filterPortfolioSites(sites,""),[]);
  assert.equal(siteLabel(sites[1]),"personal");
});
