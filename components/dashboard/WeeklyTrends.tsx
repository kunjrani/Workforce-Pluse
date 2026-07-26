'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { WeeklyStats } from '@/lib/types';

interface Props { weeks: WeeklyStats[]; }

export default function WeeklyTrends({ weeks }: Props) {
  const data = weeks.map(w => ({
    name: `W${w.week}`,
    label: w.label,
    share: Math.round(w.repetitiveShare * 100),
    total: Math.round(w.totalMinutes / 60),
  }));

  const avg = data.length ? data.reduce((s, d) => s + d.share, 0) / data.length : 0;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Repetitive Work Trend — 4 Weeks</p>
        <span className="badge badge-indigo">{avg.toFixed(0)}% avg repetitive</span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={v => `${v}%`}
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: '#0f1629',
              border: '1px solid #6366f1',
              borderRadius: 8,
              fontSize: 12,
              color: '#f1f5f9',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
            itemStyle={{ color: '#a5b4fc' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 700 }}
            formatter={(v: number) => [`${v}%`, 'Repetitive share']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
          />
          <ReferenceLine
            y={avg}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            label={{ value: `avg ${avg.toFixed(0)}%`, position: 'right', fontSize: 10, fill: 'var(--warning)' }}
          />
          <Line
            type="monotone"
            dataKey="share"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--accent)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
