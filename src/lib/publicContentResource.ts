/**
 * Public, document-scoped content snapshot. No customer/session data or
 * persistent browser storage. A bounded first read prevents template flashes;
 * a failed fetch settles to defaults, never swaps in a late response.
 */
export function createPublicContentResource<T>(fallback:T,load:(signal:AbortSignal)=>Promise<T>,timeoutMs=2500){
 let snapshot:T=fallback;
 let request:Promise<T>|null=null;
 let settled=false;
 let pending=false;
 const listeners=new Set<()=>void>();
 const publish=(value:T)=>{snapshot=value;settled=true;listeners.forEach(listener=>listener());return value;};
 function ensure(force=false):Promise<T>{
  if(request&&(!force||pending))return request;
  pending=true;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>;
  const timeout=new Promise<T>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(snapshot);},timeoutMs);});
  const fetchResult=Promise.resolve().then(()=>load(controller.signal)).catch(()=>snapshot);
  request=Promise.race([fetchResult,timeout]).then(publish).finally(()=>{clearTimeout(timer);pending=false;});
  return request;
 }
 return {ensure,getSnapshot:()=>snapshot,isSettled:()=>settled,subscribe:(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener);};}};
}
