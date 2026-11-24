import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type TrafficPoint = { date: string; views: number; uniques: number; clicks?: number; registrations?: number };

/** Loaded only when the traffic report is displayed. */
export default function AdminTrafficChart({ trend }: { trend: TrafficPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={trend}>
                       <defs>
                         <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} stroke="#94a3b8" />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} stroke="#94a3b8" />
                       <Tooltip />
                       <Area type="linear" dataKey="views" name="Page views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                       <Area type="linear" dataKey="clicks" name="CTA / link clicks" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} />
                       <Area type="linear" dataKey="registrations" name="Registrations" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
  );
}
