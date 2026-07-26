'use client';
import { useEffect, useState } from 'react';
import { Database, MessageSquare, RefreshCw, Menu, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { loadAndProcess } from '@/lib/data-processor';
import { formatInr } from '@/lib/analytics';
import HeadlineCards from '@/components/dashboard/HeadlineCards';
import BreakdownCharts from '@/components/dashboard/BreakdownCharts';
import PriorityRanking from '@/components/dashboard/PriorityRanking';
import WeeklyTrends from '@/components/dashboard/WeeklyTrends';
import AnomalyCallout from '@/components/dashboard/AnomalyCallout';
import EmployeeDrilldown from '@/components/dashboard/EmployeeDrilldown';
import DataHealthDrawer from '@/components/data-audit/DataHealthDrawer';
import ChatAssistant from '@/components/ai/ChatAssistant';
import ExecutiveSummaryExport from '@/components/export/ExecutiveSummaryExport';
import type { EmployeeStats } from '@/lib/types';

export default function DashboardPage() {
  const { isLoaded, context, fullContext, audit, filters, departments, tasks, setData, setFilter, resetFilters } = useStore();

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStats | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) return;
    loadAndProcess()
      .then(({ employees, logs, audit }) => setData(employees, logs, audit))
      .catch(e => setError(e.message));
  }, [isLoaded, setData]);

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--danger)' }}>
      Failed to load data: {error}
    </div>
  );

  if (!isLoaded || !context) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading workforce data…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { headline, byDepartment, byTask, byEmployee, byWeek, byApp } = context;
  const topDept = byDepartment[0] ?? null;
  const activeFiltersCount = [filters.department, filters.employeeId, filters.taskCategory].filter(Boolean).length;

  const peers = selectedEmployee
    ? byEmployee.filter(e => e.role === selectedEmployee.role && e.employeeId !== selectedEmployee.employeeId)
    : [];

  return (
    <div className="dashboard-layout">
      {/* Mobile menu toggle */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14 }}>⚡</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>Workforce Pluse</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', paddingLeft: 36 }}>Ops Intelligence</p>
        </div>

        <p className="section-title">Filters</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Department</label>
            <select value={filters.department ?? ''} onChange={e => setFilter({ department: e.target.value || undefined })}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Task Category</label>
            <select value={filters.taskCategory ?? ''} onChange={e => setFilter({ taskCategory: e.target.value || undefined })}>
              <option value="">All Tasks</option>
              {tasks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={filters.excludeOutliers}
              onChange={e => setFilter({ excludeOutliers: e.target.checked })}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            Exclude outliers (999 min)
          </label>

          {activeFiltersCount > 0 && (
            <button className="btn btn-ghost" onClick={resetFilters} style={{ fontSize: 12, padding: '6px 10px' }}>
              <RefreshCw size={12} /> Reset {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setShowAudit(true); setSidebarOpen(false); }} style={{ justifyContent: 'flex-start', fontSize: 12 }}>
            <Database size={14} /> Data Health
          </button>
          <button className="btn btn-primary" onClick={() => { setShowChat(!showChat); setSidebarOpen(false); }} style={{ justifyContent: 'flex-start', fontSize: 12 }}>
            <MessageSquare size={14} /> AI Assistant
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
              Operational Intelligence
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {headline.activeEmployeeCount} employees · {audit?.validRows} activity logs · Oct 2025 sample
              {activeFiltersCount > 0 && <span className="badge badge-indigo" style={{ marginLeft: 8 }}>{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active</span>}
            </p>
          </div>
          <ExecutiveSummaryExport context={context} filters={filters} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <HeadlineCards headline={headline} topDept={topDept} />

          <BreakdownCharts
            departments={byDepartment}
            tasks={byTask}
            apps={byApp}
            onDeptClick={(dept) => setFilter({ department: dept ?? undefined })}
            onTaskClick={(task) => setFilter({ taskCategory: task ?? undefined })}
            activeDept={filters.department}
            activeTask={filters.taskCategory}
          />

          <div className="priority-trends-grid">
            <PriorityRanking
              tasks={byTask}
              onTaskClick={(task) => setFilter({ taskCategory: task ?? undefined })}
              activeTask={filters.taskCategory}
              activeFilters={{ department: filters.department, taskCategory: filters.taskCategory }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <WeeklyTrends weeks={byWeek} />
              <AnomalyCallout audit={audit!} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <p className="section-title">Employee Breakdown</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Employee', 'Dept', 'Role', 'Rep. Hours', 'Recoverable/mo', 'Top Task', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byEmployee.map(emp => (
                    <tr
                      key={emp.employeeId}
                      className="table-row-clickable"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{emp.employeeId}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{emp.department}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{emp.role}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>{(emp.repetitiveMinutes / 60).toFixed(1)}h</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{formatInr(emp.recoverableCostInr)}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{emp.topTask}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {emp.status === 'terminated' && <span className="badge badge-red">terminated</span>}
                        {emp.dataFlags.includes('imputed_cost') && <span className="badge badge-amber">imputed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedEmployee && (
        <EmployeeDrilldown employee={selectedEmployee} peers={peers} onClose={() => setSelectedEmployee(null)} />
      )}

      {showAudit && audit && (
        <DataHealthDrawer audit={audit} onClose={() => setShowAudit(false)} />
      )}

      {showChat && fullContext && (
        <ChatAssistant context={fullContext} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
