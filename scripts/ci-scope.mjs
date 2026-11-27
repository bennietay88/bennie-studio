import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Only narrowly scoped, explicitly reviewed paths may use reduced browser coverage.
// New, unknown, shared, commercial, authentication, database and workflow changes
// always run the complete desktop/mobile regression suite.
const portfolioPath = /^(?:src\/components\/(?:StudioExpandedLivePreview|StudioShowcaseLivePreview|StudioCaseStudyDetail|StudioShowcasePreviewRouter|DemoIndustryPhoto|IndustryExperience|PortfolioShowcaseVisual)\.tsx|src\/lib\/(?:demoDesignProfiles|demoPhotography|studioInteractiveDemos|portfolioCatalog)\.ts|src\/styles\/demoDesigns\.css|public\/images\/case-studies\/.+|e2e\/(?:portfolio-design-diversity|portfolio-expanded-demos|screenshot-defect-regressions)\.spec\.ts)$/;
const marketingPath = /^(?:src\/styles\/(?:studioCaseStudies|studioReadability|studioCreativeDirection|studioFieldNotes|studioEditorialRound3|studioEditorialRound4|homepageEditorialPolish|homepageSecondPass|conversionHomepage|studioSalesRefinements|studioSalesRound1)\.css|public\/images\/design-directions\/.+)$/;
const documentation = /^(?:[^/]+\.md|docs\/.+\.md)$/i;
export function classify(paths) {
 const list=paths.map(p=>p.trim()).filter(Boolean);
 if(!list.length)return {scope:"full",codeChanged:true,shards:4};
 if(list.every(p=>documentation.test(p)))return {scope:"docs",codeChanged:false,shards:1};
 const relevant=list.filter(p=>!documentation.test(p));
 if(relevant.every(p=>portfolioPath.test(p)))return {scope:"portfolio",codeChanged:true,shards:3};
 if(relevant.every(p=>portfolioPath.test(p)||marketingPath.test(p)))return {scope:"marketing",codeChanged:true,shards:3};
 return {scope:"full",codeChanged:true,shards:4};
}
// Keep revenue and access-boundary smoke tests even on reduced UI runs.
export const smokeSpecs=["e2e/api-auth-boundaries.spec.ts","e2e/revenue-path.spec.ts"];
export const portfolioSpecs=[...smokeSpecs,"e2e/portfolio-expanded-demos.spec.ts","e2e/portfolio-design-diversity.spec.ts","e2e/screenshot-defect-regressions.spec.ts","e2e/public-readability.spec.ts","e2e/p2-mobile-accessibility.spec.ts"];
export const marketingSpecs=[...portfolioSpecs,"e2e/agency-quality.spec.ts","e2e/creative-redesign.spec.ts","e2e/editorial-round3.spec.ts","e2e/editorial-round4.spec.ts","e2e/homepage-editorial-clarity.spec.ts","e2e/marketing-design-system.spec.ts","e2e/preview-conversion-review.spec.ts","e2e/public-freeze-qa.spec.ts","e2e/services-pricing-round1.spec.ts","e2e/short-audit-review.spec.ts"];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=classify(readFileSync(0,"utf8").split("\n"));
 console.log("code_changed="+result.codeChanged);
 console.log("browser_scope="+result.scope);
 console.log("shards="+result.shards);
 console.log("matrix="+JSON.stringify(Array.from({length:result.shards},(_,i)=>i+1)));
}
