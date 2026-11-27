export const DEMO_DESIGN_PROFILES: Record<string,{layout:string;type:string;services:string}> = {
 "dental-clinic":{layout:"clinical",type:"clean",services:"columns"},
 "renovation-contractor":{layout:"architectural",type:"editorial",services:"rows"},
 "professional-advisory":{layout:"editorial",type:"editorial",services:"rows"},
 "tuition-centre":{layout:"community",type:"friendly",services:"columns"},
 "beauty-wellness":{layout:"immersive",type:"luxury",services:"menu"},
 "accounting-firm":{layout:"authority",type:"clean",services:"rows"},
 "physiotherapy-clinic":{layout:"care",type:"clean",services:"columns"},
 "real-estate-agency":{layout:"panorama",type:"luxury",services:"menu"},
 "cleaning-service":{layout:"utility",type:"friendly",services:"rows"},
 "hvac-specialist":{layout:"industrial",type:"bold",services:"rows"},
 "landscape-design":{layout:"landscape",type:"editorial",services:"menu"},
 "business-consulting":{layout:"strategy",type:"clean",services:"rows"},
 "interior-design":{layout:"gallery",type:"luxury",services:"menu"},
 "auto-detailing":{layout:"cinematic",type:"bold",services:"rows"},
 "fitness-coaching":{layout:"athletic",type:"bold",services:"columns"},
 "photography-studio":{layout:"portfolio",type:"luxury",services:"menu"},
 "pet-wellness":{layout:"playful",type:"friendly",services:"columns"},
 "event-planning":{layout:"celebration",type:"luxury",services:"menu"},
};
export function demoDesign(slug:string){return DEMO_DESIGN_PROFILES[slug]||{layout:"clinical",type:"clean",services:"columns"};}
function luminance(hex:string){
 const value=hex.replace(/^#/,"");
 const channels=[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
export function contrastRatio(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function readableInk(surface:string,preferred:string){
 if(/^#[0-9a-f]{6}$/i.test(surface)&&/^#[0-9a-f]{6}$/i.test(preferred)&&contrastRatio(surface,preferred)>=4.5)return preferred;
 if(!/^#[0-9a-f]{6}$/i.test(surface))return "#ffffff";
 return contrastRatio(surface,"#ffffff")>=contrastRatio(surface,"#111111")?"#ffffff":"#111111";
}
