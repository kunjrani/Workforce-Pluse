'use client';
import { AlertTriangle, Info } from 'lucide-react';
import { formatInr } from '@/lib/analytics';
import type { DataAuditReport } from '@/lib/types';

interface Props { audit: DataAuditReport; }

interface AnomalyItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: 'amber' | 'red' | 'indigo';
}

export default function AnomalyCallout({ audit }: Props) {
  const items: AnomalyItem[] = [
    {
      icon: <AlertTriangle size={14} />,
      title: `${audit.outlierRows} Extreme Duration Entries`,
      description: `${audit.outlierRows} task entries logged as 999 min (>16 hrs). Excluded from recovery calculations. Review for data correction.`,
      variant: 'amber',
    },
    {
      icon: <AlertTriangle size={14} />,
      title: `${audit.droppedRows} Invalid Rows Dropped`,
      description: `${audit.droppedRows} rows removed during ingestion (${audit.corruptedIdRows} corrupted IDs, remaining had invalid durations).`,
      variant: 'red',
    },
    {
      icon: <Info size={14} />,
      title: `E013 — Cost Imputed (Missing HRMS)`,
      description: `Employee E013 has ${audit.validRows > 0 ? 'activity logs' : 'no logs'} but is absent from HRMS. Hourly rate imputed from HR department average.`,
      variant: 'indigo',
    },
    {
      icon: <Info size={14} />,
      title: `E007 — Duplicate Record Resolved`,
      description: `Two HRMS records for E007. Higher-seniority record (₹24L, Senior Account Executive) selected as canonical.`,
      variant: 'indigo',
    },
  ];

  const variantMap = {
    amber: 'badge-amber',
    red: 'badge-red',
    indigo: 'badge-indigo',
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <p className="section-title">Data Anomalies & Flags</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <span className={`badge ${variantMap[item.variant]}`} style={{ marginTop: 2 }}>
              {item.icon}
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
