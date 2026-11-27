/** Only public marketing routes are eligible for content preloading. */
const marketingPaths = new Set(["/services","/pricing","/about","/resources","/contact","/templates","/how-it-works","/case-studies","/generate-preview","/website-audit","/dental-clinics","/clinic-website-design","/renovation-contractor-website-design","/beauty-salon-website-design","/tuition-centre-website-design","/consultant-website-design","/professional-services-website-design","/accounting-firm-website-design","/local-service-website-design"]);
export function publicRouteKind(pathname:string){
 const path=pathname.replace(/\/+$/,"")||"/";
 if(path==="/")return "home";
 if(/^\/case-studies\/showcase\/[^/]+\/preview(?:\/[^/]+)?$/.test(path))return "showcase-preview";
 if(/^\/case-studies\/showcase\/[^/]+$/.test(path))return "showcase-detail";
 if(path==="/case-studies")return "portfolio";
 if(marketingPaths.has(path))return "marketing";
 if(/^\/blog\/[^/]+$/.test(path))return "blog";
 if(/^\/resources\/[^/]+$/.test(path))return "resource";
 if(/^\/portfolio\/sample\/[^/]+$/.test(path))return "sample";
 if(path==="/personal-profile")return "profile";
 if(path==="/pay-monthly-websites"||path==="/website-subscription-service")return "sales";
 if(path==="/managed-website-vs-diy"||path==="/managed-website-vs-agency")return "comparison";
 if(path==="/book-demo")return "book";
 return null;
}
export function needsPortfolioContent(kind:ReturnType<typeof publicRouteKind>){return kind==="portfolio"||kind==="showcase-detail"||kind==="showcase-preview";}
