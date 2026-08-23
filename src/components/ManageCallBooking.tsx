import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export default function ManageCallBooking() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = React.useState<any>(null);
  const [slots, setSlots] = React.useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [bookingResponse, availabilityResponse] = await Promise.all([fetch(`/api/public/call-bookings/${token}`), fetch("/api/public/call-availability")]);
      const bookingPayload = await bookingResponse.json().catch(() => ({}));
      const availabilityPayload = await availabilityResponse.json().catch(() => ({}));
      if (!bookingResponse.ok) throw new Error(bookingPayload.error || "Booking not found");
      setBooking(bookingPayload.booking);
      setSlots(Array.isArray(availabilityPayload.slots) ? availabilityPayload.slots : []);
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  }, [token]);

  React.useEffect(() => { void load(); }, [load]);

  const reschedule = async () => {
    if (!selectedSlot) return toast.error("Choose a new available time.");
    setWorking(true);
    try {
      const response = await fetch(`/api/public/call-bookings/${token}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startAt: selectedSlot }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Booking could not be rescheduled");
      setBooking(payload.booking);
      setSelectedSlot("");
      toast.success("Your new call time is confirmed.");
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this website growth call?")) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/public/call-bookings/${token}/cancel`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Booking could not be cancelled");
      setBooking((current: any) => ({ ...current, status: "cancelled" }));
      toast.success("The call has been cancelled.");
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  return <div className="min-h-screen bg-slate-50 text-slate-950"><PublicSiteHeader /><main className="mx-auto max-w-3xl px-5 py-16 sm:py-24"><Button variant="ghost" onClick={() => navigate("/book-demo")} className="mb-6 rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Back to booking</Button><Card className="rounded-[2rem] border-slate-200 shadow-xl"><CardContent className="p-7 sm:p-10">{loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : !booking ? <div className="py-16 text-center"><XCircle className="mx-auto h-10 w-10 text-rose-500" /><h1 className="mt-5 text-3xl font-black">Booking not found</h1><p className="mt-2 text-slate-500">This management link may be invalid or expired.</p></div> : <div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Manage website growth call</p><h1 className="mt-3 text-4xl font-black tracking-tight">{booking.business_name}</h1><div className={`mt-6 rounded-2xl p-5 ${booking.status === "cancelled" ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-950"}`}><div className="flex gap-3">{booking.status === "cancelled" ? <XCircle className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5" />}<div><p className="font-black capitalize">{booking.status}</p><p className="mt-1 text-sm font-semibold leading-6">{new Date(booking.start_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })} · {booking.timezone}</p></div></div></div>{booking.status !== "cancelled" && <div className="mt-8"><label htmlFor="reschedule-slot" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><CalendarDays className="h-4 w-4" /> Choose a different time</label><select id="reschedule-slot" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Select an available time</option>{slots.map((slot) => <option key={slot} value={slot}>{new Date(slot).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</option>)}</select><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button onClick={() => void reschedule()} disabled={working || !selectedSlot} className="rounded-xl bg-indigo-600 text-white">Confirm new time</Button><Button variant="outline" onClick={() => void cancel()} disabled={working} className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50">Cancel call</Button></div></div>}</div>}</CardContent></Card></main><PublicSiteFooter /></div>;
}
