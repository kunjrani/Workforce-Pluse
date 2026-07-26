'use client';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { DataAuditReport } from '@/lib/types';

interface Props {
  audit: DataAuditReport;
  onClose: () => void;
}

export default function DataHealthDrawer({ audit, onClose }: Props) {
  const rows: { label: string; value: string | number; status: 'ok' | 'warn' | 'info' }[] = [
    { label: 'Total raw rows', value: audit.totalRawRows, status: 'info' },
    { label: 'Valid rows (after clean)', value: audit.validRows, status: 'ok' },
    { label: 'Dropped (negative/NaN/zero duration)', value: audit.droppedRows, status: 'warn' },
    { label: 'Zero-duration rows removed', value: audit.zeroDurationRows, status: 'warn' },
    { label: 'Duplicate rows deduplicated', value: audit.deduplicatedRows, status: 'info' },
    { label: 'Outlier rows flagged (999 min)', value: audit.outlierRows, status: 'warn' },
    { label: 'Corrupted employee IDs (?)', value: audit.corruptedIdRows, status: 'warn' },
    { label: 'Duplicate HRMS records resolved', value: audit.duplicateEmployees.join(', ') || '—', status: 'info' },
    { label: 'Terminated employees', value: audit.terminatedEmployees.join(', ') || '—', status: 'info' },
    { label: 'Missing HRMS records (imputed)', value: audit.missingHrmsRecords.join(', ') || '—', status: 'warn' },
    { label: 'HRMS-only (no activity logs)', value: audit.noActivityRecords.join(', ') || '—', status: 'info' },
  ];

  const icon = {
    ok: <CheckCircle size={14} color="var(--success)" />,
    warn: <AlertCircle size={14} color="var(--warning)" />,
    info: <Info size={14} color="var(--accent)" />,
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Data Health Report</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              ETL ingestion audit — activity_logs.csv + employees.json
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon[row.status]}
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, padding: 16, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Duration rules:</strong> Negative, NaN, and zero-minute rows are dropped.
            Outliers (&gt;480 min) are flagged and excluded from recovery calculations by default.
            <br /><br />
            <strong style={{ color: 'var(--text-primary)' }}>Compensation imputation:</strong> E013 uses the average
            hourly rate of active HR employees. Duplicate log rows are deduplicated on employee + timestamp + app + task + duration.
          </p>
        </div>
      </div>
    </>
  );
}
