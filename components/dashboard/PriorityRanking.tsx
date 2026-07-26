'use client';
import { Fragment, useState } from 'react';
import { Download, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { TaskStats } from '@/lib/types';
import { formatInr } from '@/lib/analytics';

interface Props {
  tasks: TaskStats[];
  onTaskClick?: (task: string | undefined) => void;
  activeTask: string | undefined;
  activeFilters?: { department?: string; taskCategory?: string };
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 45 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function exportCSV(tasks: TaskStats[], filters: { department?: string; taskCategory?: string }) {
  const filterNote = [
    filters.department ? `dept=${filters.department}` : '',
    filters.taskCategory ? `task=${filters.taskCategory}` : '',
  ].filter(Boolean).join('_') || 'all';

  const headers = ['Rank', 'Task', 'Total Hours', 'Labor Cost (INR)', 'Repetitive %', 'Priority Score'];
  const rows = tasks.map((t, i) => [
    i + 1, t.taskCategory, t.totalHours.toFixed(1), Math.round(t.laborCostInr),
    `${(t.repetitiveShare * 100).toFixed(0)}%`, t.priorityScore,
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workforce-pluse_priority_${filterNote}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PriorityRanking({ tasks, onTaskClick, activeTask, activeFilters = {} }: Props) {
  const [showFormula, setShowFormula] = useState(false);
  const top12 = tasks.slice(0, 12);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Automation Priority Ranking</p>
        <button
          onClick={() => exportCSV(top12, activeFilters)}
          title="Export current view as CSV"
          className="btn-export-csv"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <button
        onClick={() => setShowFormula(!showFormula)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 12, color: 'var(--accent)', marginBottom: showFormula ? 12 : 16, padding: 0,
        }}
      >
        <Info size={13} />
        How is the priority score calculated?
        {showFormula ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showFormula && (
        <div style={{
          marginBottom: 16, padding: 14, background: 'var(--bg-secondary)',
          borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8,
        }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Priority Score = 0.35(V) + 0.30(R) + 0.20(C) + 0.15(I)
          </p>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              {[
                ['V — Volume (35%)', 'Total hours on task ÷ max hours across all tasks'],
                ['R — Repetitiveness (30%)', 'Repetitive minutes ÷ total minutes for this task'],
                ['C — Employee spread (20%)', 'Unique employees on task ÷ total active employees'],
                ['I — Cost impact (15%)', 'Loaded labor cost on task ÷ max cost across all tasks'],
              ].map(([factor, desc]) => (
                <tr key={factor}>
                  <td style={{ padding: '4px 12px 4px 0', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{factor}</td>
                  <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
            Rationale: High repetitiveness signals automation-ready work. Volume and cost ensure ROI scale.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '6px 16px', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em' }}>TASK</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>HOURS</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>COST</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, minWidth: 140 }}>PRIORITY SCORE</span>

        {top12.map((t, i) => (
          <Fragment key={t.taskCategory}>
            <button
              onClick={() => onTaskClick?.(activeTask === t.taskCategory ? undefined : t.taskCategory)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: '6px 0',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                background: i < 3 ? 'rgba(239,68,68,0.15)' : i < 6 ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.1)',
                color: i < 3 ? '#ef4444' : i < 6 ? '#f59e0b' : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{
                fontSize: 13, fontWeight: activeTask === t.taskCategory ? 600 : 400,
                color: activeTask === t.taskCategory ? 'var(--accent)' : 'var(--text-primary)',
              }}>
                {t.taskCategory}
              </span>
              {t.repetitiveShare > 0.7 && (
                <span className="badge badge-red" style={{ fontSize: 9 }}>HIGH REP</span>
              )}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{t.totalHours.toFixed(1)}h</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{formatInr(t.laborCostInr)}</span>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <ScoreBar score={t.priorityScore} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
