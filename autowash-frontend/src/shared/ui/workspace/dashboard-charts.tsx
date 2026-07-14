import * as React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type TrendItem = { label: string; bookings: number };
type StatusItem = { name: string; value: number; color: string };
type PeakHourItem = { hour: string; bookings: number };
type VoucherItem = { name: string; value: number; color: string };

export function BookingTrendChart({ trend }: { trend: TrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Area type="monotone" dataKey="bookings" stroke="#06b6d4" strokeWidth={2}
          fill="url(#bookingGrad)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BookingStatusChart({ data }: { data: StatusItem[] }) {
  return (
    <ResponsiveContainer width={160} height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45}
          outerRadius={72} paddingAngle={2} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PeakHoursChart({ data }: { data: PeakHourItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={(v: string) => v.replace(":00", "")} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
        <Bar dataKey="bookings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VoucherStatsChart({ data }: { data: VoucherItem[] }) {
  return (
    <ResponsiveContainer width={140} height={140}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={38}
          outerRadius={65} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
