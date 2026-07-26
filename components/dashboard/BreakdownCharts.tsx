'use client';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import { formatInr } from '@/lib/analytics';
import type { DeptStats, AppStats, TaskStats } from '@/lib/types';

type ViewTab = 'department' | 'task' | 'app';

const DEPT_COLORS = [
  '#f97316', '#06b6d4', '#10b981', '#a855f7',
  '#ec4899', '#f59e0b', '#ef4444',
];
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const AXIS_TICK_COLOR = '#bef264';

function BarTooltip({ active, payload, label, valueLabel }: {
  active?: boolean;
  payload?: { value: number; fill: string }[];
  label?: string;
  valueLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const color = payload[0]?.fill ?? '#6366f1';
  return (
    <div style={{
      background: '#0d1224', border: `1.5px solid ${color}`, borderRadius: 10,
      padding: '10px 16px', fontSize: 12, color: '#f1f5f9', minWidth: 140,
      boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 16px ${color}55`,
    }}>
      <p style={{ fontWeight: 700, color, marginBottom: 6, fontSize: 13 }}>{label}</p>
      <p style={{ color: '#cbd5e1' }}>{valueLabel}: <strong style={{ color: '#f1f5f9' }}>{formatInr(payload[0]?.value ?? 0)}</strong></p>
    </div>
  );
}

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const color = item.fill ?? '#6366f1';
  const hours = Math.round((item.value ?? 0) / 60);
  return (
    <div style={{
      background: '#0d1224', border: `1.5px solid ${color}`, borderRadius: 10,
      padding: '10px 16px', fontSize: 12, minWidth: 140,
      boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 16px ${color}55`,
    }}>
      <p style={{ fontWeight: 700, color, marginBottom: 6, fontSize: 13 }}>{item.name}</p>
      <p style={{ color: '#e2e8f0', margin: 0 }}>
        Time spent: <strong style={{ color: '#ffffff', fontSize: 14 }}>{hours} hrs</strong>
      </p>
    </div>
  );
}

function ActivePieSlice(props: {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
}) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 6} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.25} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 12}
        startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#ffffff" strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 10px ${fill})` }} />
    </g>
  );
}

interface Props {
  departments: DeptStats[];
  tasks: TaskStats[];
  apps: AppStats[];
  onDeptClick?: (dept: string | undefined) => void;
  onTaskClick?: (task: string | undefined) => void;
  activeDept: string | undefined;
  activeTask: string | undefined;
}

const TABS: { id: ViewTab; label: string }[] = [
  { id: 'department', label: 'Department' },
  { id: 'task', label: 'Task Category' },
  { id: 'app', label: 'Application' },
];

export default function BreakdownCharts({
  departments, tasks, apps,
  onDeptClick, onTaskClick,
  activeDept, activeTask,
}: Props) {
  const [tab, setTab] = useState<ViewTab>('department');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activePieIdx, setActivePieIdx] = useState<number>(-1);

  const deptData = departments.map(d => ({
    name: d.department,
    recoverable: Math.round(d.recoverableCostInr),
  }));

  const taskData = tasks.slice(0, 10).map(t => ({
    name: t.taskCategory,
    recoverable: Math.round(t.laborCostInr),
  }));

  const appData = apps.slice(0, 8).map(a => ({
    name: a.appUsed,
    value: a.totalMinutes,
  }));

  const activeFilter = tab === 'department' ? activeDept : tab === 'task' ? activeTask : undefined;
  const clearFilter = tab === 'department'
    ? () => onDeptClick?.(undefined)
    : tab === 'task'
      ? () => onTaskClick?.(undefined)
      : undefined;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Time-Sink Breakdown</p>
        <div className="tab-group">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'department' && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={deptData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tickFormatter={v => formatInr(v)}
              tick={{ fontSize: 10, fill: AXIS_TICK_COLOR, fontWeight: 600 }}
              axisLine={{ stroke: '#ffffff18' }} tickLine={{ stroke: '#ffffff10' }} />
            <YAxis type="category" dataKey="name"
              tick={{ fontSize: 11, fill: AXIS_TICK_COLOR, fontWeight: 600 }}
              width={110} axisLine={false} tickLine={false} />
            <Tooltip content={<BarTooltip valueLabel="Recoverable" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="recoverable" radius={[0, 4, 4, 0]} cursor="pointer"
              onMouseEnter={(_, i) => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              onClick={(d) => onDeptClick?.(activeDept === d.name ? undefined : d.name)}>
              {deptData.map((d, i) => {
                const color = DEPT_COLORS[i % DEPT_COLORS.length];
                const active = hoveredIdx === i || activeDept === d.name;
                return (
                  <Cell key={d.name} fill={active ? color : `${color}38`}
                    stroke={active ? color : 'transparent'} strokeWidth={active ? 1.5 : 0} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {tab === 'task' && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={taskData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tickFormatter={v => formatInr(v)}
              tick={{ fontSize: 10, fill: AXIS_TICK_COLOR, fontWeight: 600 }}
              axisLine={{ stroke: '#ffffff18' }} tickLine={{ stroke: '#ffffff10' }} />
            <YAxis type="category" dataKey="name"
              tick={{ fontSize: 10, fill: AXIS_TICK_COLOR, fontWeight: 600 }}
              width={130} axisLine={false} tickLine={false} />
            <Tooltip content={<BarTooltip valueLabel="Labor cost" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="recoverable" radius={[0, 4, 4, 0]} cursor="pointer"
              onMouseEnter={(_, i) => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              onClick={(d) => onTaskClick?.(activeTask === d.name ? undefined : d.name)}>
              {taskData.map((d, i) => {
                const color = PIE_COLORS[i % PIE_COLORS.length];
                const active = hoveredIdx === i || activeTask === d.name;
                return (
                  <Cell key={d.name} fill={active ? color : `${color}38`}
                    stroke={active ? color : 'transparent'} strokeWidth={active ? 1.5 : 0} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {tab === 'app' && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={appData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={52} outerRadius={82} paddingAngle={2}
                activeIndex={activePieIdx}
                // @ts-expect-error — Recharts accepts a render function here
                activeShape={ActivePieSlice}
                onMouseEnter={(_, i) => setActivePieIdx(i)}
                onMouseLeave={() => setActivePieIdx(-1)}>
                {appData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
            {appData.map((a, i) => (
              <span key={a.name} style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                {a.name}
              </span>
            ))}
          </div>
        </>
      )}

      {activeFilter && clearFilter && (
        <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8, cursor: 'pointer' }}
          onClick={clearFilter}>
          ✕ Clear filter: {activeFilter}
        </p>
      )}
    </div>
  );
}
