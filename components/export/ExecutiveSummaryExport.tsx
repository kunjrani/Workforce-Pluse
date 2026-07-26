'use client';
import { useRef, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { formatInr, formatHours } from '@/lib/analytics';
import type { GroundingContext } from '@/lib/types';

const DATE_RANGE = 'Oct 6 – Oct 24, 2025';

interface Props {
  context: GroundingContext;
  filters: { department?: string; taskCategory?: string; excludeOutliers?: boolean };
}

function filterLabel(filters: Props['filters']): string {
  const parts = [
    filters.department ? `Dept: ${filters.department}` : null,
    filters.taskCategory ? `Task: ${filters.taskCategory}` : null,
    filters.excludeOutliers ? 'Outliers excluded' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'All data (no filters)';
}

export default function ExecutiveSummaryExport({ context, filters }: Props) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);

  const { headline, byTask } = context;
  const top5 = byTask.slice(0, 5);

  async function capture(format: 'pdf' | 'png') {
    if (!summaryRef.current) return;
    setExporting(format);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1e',
        logging: false,
      });

      const date = new Date().toISOString().slice(0, 10);

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `workforce-pluse-summary_${date}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const { jsPDF } = await import('jspdf');
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, pageW, Math.min(imgH, pageH));
        pdf.save(`workforce-pluse-summary_${date}.pdf`);
      }
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={() => capture('pdf')}
          disabled={!!exporting}
          style={{ fontSize: 12 }}
        >
          {exporting === 'pdf' ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={14} />}
          Export PDF
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => capture('png')}
          disabled={!!exporting}
          style={{ fontSize: 12 }}
        >
          {exporting === 'png' ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={14} />}
          Export PNG
        </button>
      </div>

      {/* Off-screen render target — reflects live filter state */}
      <div
        ref={summaryRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 794,
          padding: 40,
          background: '#0a0f1e',
          color: '#f1f5f9',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Executive Summary
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Workforce Pluse</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
          {DATE_RANGE} · {filterLabel(filters)}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Recoverable Hours / Month
            </p>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#6366f1' }}>
              {formatHours(headline.recoverableHoursPerMonth)}
            </p>
          </div>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
            <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Recoverable Cost / Month
            </p>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>
              {formatInr(headline.recoverableCostInr)}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Top 5 Automation Opportunities
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['#', 'Task', 'Hours', 'Cost', 'Score'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontSize: 10, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top5.map((t, i) => (
              <tr key={t.taskCategory} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.taskCategory}</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{t.totalHours.toFixed(1)}h</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{formatInr(t.laborCostInr)}</td>
                <td style={{ padding: '10px 12px', color: '#6366f1', fontWeight: 700 }}>{t.priorityScore}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 11, color: '#475569', marginTop: 24 }}>
          Generated {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · Reflects active dashboard filters
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
