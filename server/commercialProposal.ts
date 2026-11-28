import {createHmac,timingSafeEqual} from "node:crypto";
import {COMMERCIAL_PILOTS,isSalesProduct} from "../src/lib/commercialExecution.js";
export function proposalExpired(row:any,now=Date.now()){
 const date=String(row.expires_at||row.valid_until||"");
 return !/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T23:59:59Z"))||Date.parse(date+"T23:59:59Z")<now;
}
export function proposalCharge(row:any){
 const currency=String(row.config?.currency||"").toUpperCase();
 const monthly=Number(row.value??row.amount??0),setup=Number(row.setup_fee??0),term=Number(row.config?.commitmentMonths??0);
 if(currency!=="USD"||!Number.isFinite(monthly)||!Number.isFinite(setup)||monthly<0||setup<0||monthly+setup<=0||monthly+setup>100000||!Number.isInteger(term)||term<0)return null;
 if(row.config?.pilotId){
  const pilot=COMMERCIAL_PILOTS.find(p=>p.id===row.config.pilotId);
  if(!pilot||!String(row.config?.scopeNotes||"").trim()||term!==0|| (pilot.billing==="monthly"?(monthly<=0||setup!==0):(monthly!==0||setup<=0)))return null;
 }else if(!isSalesProduct(row.config?.commercialProductSlug)||monthly<=0)return null;
 return {currency:"usd",monthlyMinor:Math.round(monthly*100),setupMinor:Math.round(setup*100),term};
}
export function quoteSignature(row:any,secret:string){
 if(!secret)throw Error("Commercial approval signing unavailable");
 return createHmac("sha256",secret).update("commercial-proposal-v1:").update(JSON.stringify([row.id,row.lead_id,row.business_id,row.title,row.package_name,row.value,row.amount,row.setup_fee,row.expires_at,row.scope,row.outcome,row.config?.currency,row.config?.commitmentMonths,row.config?.pilotId,row.config?.commercialProductSlug,row.config?.billing,row.config?.scopeNotes])).digest("hex");
}
export function approvedPilot(row:any,secret:string){
 if(!row.config?.pilotId||!secret||row.config?.approvalState!=="approved")return false;
 const actual=Buffer.from(String(row.config?.approvalSignature||""));
 const expected=Buffer.from(quoteSignature(row,secret));
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function proposalCanShare(row:any,secret:string,now=Date.now()){
 return ["Sent","Accepted"].includes(row.status)&&!proposalExpired(row,now)&&(!row.config?.pilotId||approvedPilot(row,secret));
}
export function collectedCheckout(session: { status?: string | null; payment_status?: string | null; amount_total?: number | null }) {
 return session.status === "complete" && session.payment_status === "paid" && Number.isSafeInteger(session.amount_total) && Number(session.amount_total) > 0;
}
export function proposalPaymentMatches(row:any,session:any){
 const charge=proposalCharge(row);
 return Boolean(charge&&collectedCheckout(session)&&session.currency==="usd"&&session.amount_total===charge.monthlyMinor+charge.setupMinor&&session.metadata?.proposalId===row.id&&session.mode===(charge.monthlyMinor>0?"subscription":"payment"));
}

export const PILOT_TRANSITIONS:Record<string,readonly string[]>={paid:["access_confirmed"],access_confirmed:["in_delivery"],in_delivery:["review"],review:["delivered","in_delivery"],delivered:["maintenance","closed"],maintenance:["closed"],closed:[]};
export function nextPilotStage(row:any,next:string){
 const current=String(row.config?.fulfilment?.stage||"paid");
 if(!row.config?.pilotId||!row.config?.payment?.paidAt||!row.config?.payment?.stripeSessionId)return false;
 if(next==="maintenance"&&row.config.pilotId!=="website-care")return false;
 return (PILOT_TRANSITIONS[current]||[]).includes(next);
}
