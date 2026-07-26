'use client';
import { X } from 'lucide-react';
import { formatInr, formatHours } from '@/lib/analytics';
import type { EmployeeStats } from '@/lib/types';

interface Props {
  employee: EmployeeStats | null;
  peers: EmployeeStats[];
  onClose: () => void;
}

export default function EmployeeDrilldown({ employee, peers, onClose }: Props) {
  if (!employee) return null;

  const peerAvgRecHours = peers.length
    ? peers.reduce((s, p) => s + p.recoverableHours, 0) / peers.length
    : 0;
  const peerAvgRepShare = peers.length
    ? peers.reduce((s, p) => s + (p.totalMinutes > 0 ? p.repetitiveMinutes / p.totalMinutes : 0), 0) / peers.length
    : 0;

  const repShare = employee.totalMinutes > 0
    ? employee.repetitiveMinutes / employee.totalMinutes
    : 0;

  const rows: [string, string, string?][] = [
    ['Department', employee.department],
    ['Role', employee.role],
    ['Status', employee.status, employee.status === 'terminated' ? 'badge-red' : 'badge-green'],
    ['Annual CTC', formatInr(Math.round(employee.hourlyRateInr * 2112))],
    ['Hourly Rate', formatInr(employee.hourlyRateInr) + '/hr'],
    ['Total Hours (sample)', formatHours(employee.totalMinutes / 60)],
    ['Repetitive Share', `${(repShare * 100).toFixed(1)}% vs ${(peerAvgRepShare * 100).toFixed(1)}% peer avg`],
    ['Top Task', employee.topTask],
    ['Recoverable Hours/mo', formatHours(employee.recoverableHours)],
    ['Recoverable Cost/mo', formatInr(employee.recoverableCostInr)],
  ];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{employee.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{employee.employeeId}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8 }}>
            <X size={16} />
          </button>
        </div>

        {/* Flags */}
        {employee.dataFlags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {employee.dataFlags.map(f => (
              <span key={f} className="badge badge-amber">{f.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}

        {/* Stats rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map(([label, value, badgeClass]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              {badgeClass ? (
                <span className={`badge ${badgeClass}`}>{value}</span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Peer comparison bar */}
        <div style={{ marginTop: 24 }}>
          <p className="section-title">vs. Peer Role Average</p>
          {[
            { label: 'Recoverable Hours/mo', value: employee.recoverableHours, peer: peerAvgRecHours, max: Math.max(employee.recoverableHours, peerAvgRecHours) * 1.2 },
          ].map(c => (
            <div key={c.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Peer avg: {c.peer.toFixed(1)}h</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ width: `${Math.min((c.value / c.max) * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 0.6s' }} />
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((c.peer / c.max) * 100, 100)}%`, height: '100%', background: 'var(--chart-3)', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--accent)' }}>■ This employee</span>
                <span style={{ fontSize: 10, color: 'var(--chart-3)' }}>■ Peer avg</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
