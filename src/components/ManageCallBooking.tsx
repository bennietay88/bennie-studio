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
  const [loadError, setLoadError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [bookingResponse, availabilityResponse] = await Promise.all([fetch(`/api/public/call-bookings/${token}`), fetch("/api/public/call-availability")]);
      const bookingPayload = await bookingResponse.json().catch(() => ({}));
      const availabilityPayload = await availabilityResponse.json().catch(() => ({}));
      if (!bookingResponse.ok) throw new Error(bookingPayload.error || "Booking not found");
      setBooking(bookingPayload.booking);
      setSlots(Array.isArray(availabilityPayload.slots) ? availabilityPayload.slots : []);
    } catch (error: any) { setBooking(null); setLoadError(error.message || "Unable to load the booking."); } finally { setLoading(false); }
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
      void load();
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

  return <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]"><PublicSiteHeader /><main className="brand-shell mx-auto max-w-3xl px-5 py-14 sm:py-20"><Button variant="ghost" onClick={() => navigate("/book-demo")} className="mb-6 rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Back to booking</Button><Card className="rounded-2xl border-[#d8e0eb] bg-white shadow-[0_20px_65px_-44px_rgba(15,23,42,0.48)]"><CardContent className="p-6 sm:p-10">{loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : !booking ? <div role="status" className="py-14 text-center"><XCircle className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-5 text-3xl font-bold">Unable to open booking</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{loadError || "This management link may be invalid or expired."}</p><Button type="button" variant="outline" onClick={() => void load()} className="mt-6 border-[#d8e0eb]">Try again</Button></div> : <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1741ed]">Bennie Studio · Your consultation</p><h1 className="mt-3 break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{booking.business_name || "Manage your consultation"}</h1><div className={`mt-6 rounded-2xl p-5 ${booking.status === "cancelled" ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-950"}`}><div className="flex gap-3">{booking.status === "cancelled" ? <XCircle className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5" />}<div><p className="font-bold capitalize">{booking.status}</p><p className="mt-1 text-sm font-medium leading-6">{new Date(booking.start_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: booking.timezone || "UTC" })} · {booking.timezone || "UTC"}</p></div></div></div>{booking.status !== "cancelled" && <div className="mt-8"><label htmlFor="reschedule-slot" className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><CalendarDays className="h-4 w-4" /> Choose a different time</label><select id="reschedule-slot" value={selectedSlot} disabled={working || slots.length === 0} onChange={(event) => setSelectedSlot(event.target.value)} className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Select an available time</option>{slots.map((slot) => <option key={slot} value={slot}>{new Date(slot).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: booking.timezone || "UTC" })}</option>)}</select>{slots.length === 0 && <p role="status" className="mt-2 text-sm leading-6 text-slate-600">No confirmed alternative times are available. Your existing booking is unchanged.</p>}<div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button onClick={() => void reschedule()} disabled={working || !selectedSlot} className="rounded-lg bg-[#1741ed] text-white hover:bg-[#1035c2]">Confirm new time</Button><Button variant="outline" onClick={() => void cancel()} disabled={working} className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50">Cancel call</Button></div></div>}</div>}</CardContent></Card></main><PublicSiteFooter /></div>;
}
