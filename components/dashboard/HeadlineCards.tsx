'use client';
import { useState } from 'react';
import { Clock, TrendingUp, Users, Zap, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { formatInr, formatHours } from '@/lib/analytics';
import type { HeadlineMetrics, DeptStats } from '@/lib/types';

interface Props {
  headline: HeadlineMetrics;
  topDept: DeptStats | null;
}

interface KpiCard {
  id: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  delay: string;
  methodology?: string;
}

const HOURS_METHODOLOGY = `Recoverable Hours = (Repetitive Minutes ÷ 60) × 0.70 × (30.44 ÷ 28)

• Repetitive Minutes: sum of duration where is_repetitive = true
• 0.70: automation feasibility factor (70% of repetitive work)
• 30.44 ÷ 28: scales the 28-day sample to a calendar month
• Outlier rows (999 min) excluded when toggle is on`;

const COST_METHODOLOGY = `Recoverable Cost = Σ (Recoverable Hours per employee × Hourly Rate)

• Hourly Rate = Annual CTC ÷ 2,112 working hours/year
• 2,112 = 8 hrs × 22 days × 12 months
• Each employee's actual compensation is used (not a blended rate)
• Terminated employees (E010) excluded from cost projections
• E013 imputed from HR department average hourly rate`;

export default function HeadlineCards({ headline, topDept }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const cards: KpiCard[] = [
    {
      id: 'hours',
      label: 'Recoverable Hours / Month',
      value: formatHours(headline.recoverableHoursPerMonth),
      sub: `From ${formatHours(headline.totalRepetitiveHours)} repetitive in sample`,
      icon: <Clock size={18} />,
      color: 'var(--accent)',
      delay: '0ms',
      methodology: HOURS_METHODOLOGY,
    },
    {
      id: 'cost',
      label: 'Recoverable Cost / Month',
      value: formatInr(headline.recoverableCostInr),
      sub: `${headline.automationRoiPercent.toFixed(1)}% of total labour spend`,
      icon: <TrendingUp size={18} />,
      color: 'var(--success)',
      delay: '60ms',
      methodology: COST_METHODOLOGY,
    },
    {
      id: 'dept',
      label: 'Highest-Risk Department',
      value: topDept?.department ?? '—',
      sub: topDept ? `${formatInr(topDept.recoverableCostInr)} recoverable · ${(topDept.repetitiveShare * 100).toFixed(0)}% repetitive` : '',
      icon: <Zap size={18} />,
      color: 'var(--warning)',
      delay: '120ms',
    },
    {
      id: 'employees',
      label: 'Active Employees Tracked',
      value: String(headline.activeEmployeeCount),
      sub: `Over ${headline.sampleDays}-day sample period`,
      icon: <Users size={18} />,
      color: 'var(--chart-3)',
      delay: '180ms',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {cards.map((c) => (
        <div key={c.id} className="card fade-up" style={{ padding: 20, animationDelay: c.delay }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${c.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: c.color,
            }}>
              {c.icon}
            </div>
            <span className="section-title" style={{ marginBottom: 0, color: 'var(--text-dim)', flex: 1 }}>{c.label}</span>
            {c.methodology && (
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                title="How is this calculated?"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent)', padding: 4, display: 'flex', alignItems: 'center',
                }}
              >
                <Info size={14} />
              </button>
            )}
          </div>

          <div className="metric-value">{c.value}</div>
          <div className="metric-label">{c.sub}</div>

          {c.methodology && expanded === c.id && (
            <div style={{
              marginTop: 14, padding: 12, background: 'var(--bg-secondary)',
              borderRadius: 8, border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
            }}>
              {c.methodology}
            </div>
          )}

          {c.methodology && (
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              style={{
                marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              }}
            >
              {expanded === c.id ? <><ChevronUp size={12} /> Hide methodology</> : <><ChevronDown size={12} /> How calculated?</>}
            </button>
          )}

          <div style={{
            marginTop: 16, height: 3, borderRadius: 2,
            background: `linear-gradient(90deg, ${c.color}, transparent)`,
          }} />
        </div>
      ))}
    </div>
  );
}
