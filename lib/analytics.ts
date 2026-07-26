import type {
  Employee, ActivityLog, HeadlineMetrics, DeptStats, TaskStats,
  EmployeeStats, WeeklyStats, AppStats, GroundingContext,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOMATION_FACTOR = 0.70;
const SAMPLE_DAYS = 28;
const AVG_MONTH_DAYS = 30.44;
const MONTH_NORM = AVG_MONTH_DAYS / SAMPLE_DAYS;
const WORKING_HOURS_PER_YEAR = 2112;

const WEEK_LABELS: Record<number, string> = {
  1: 'Week 1 (Oct 6–12)',
  2: 'Week 2 (Oct 13–19)',
  3: 'Week 3 (Oct 20–24)',
  4: 'Week 4',
};

// ─── Core Formula Functions ───────────────────────────────────────────────────

export function recoverableHours(repetitiveMinutes: number): number {
  return (repetitiveMinutes / 60) * AUTOMATION_FACTOR * MONTH_NORM;
}

export function recoverableCost(repetitiveMinutes: number, hourlyRate: number): number {
  return recoverableHours(repetitiveMinutes) * hourlyRate;
}

function priorityScore(
  task: { totalMinutes: number; repetitiveMinutes: number; uniqueEmployeeCount: number; laborCostInr: number },
  maxHours: number,
  maxCost: number,
  totalEmployees: number,
): number {
  if (maxHours === 0 || maxCost === 0 || totalEmployees === 0) return 0;
  const V = (task.totalMinutes / 60) / maxHours;
  const R = task.totalMinutes > 0 ? task.repetitiveMinutes / task.totalMinutes : 0;
  const C = task.uniqueEmployeeCount / totalEmployees;
  const I = task.laborCostInr / maxCost;
  return Math.round((0.35 * V + 0.30 * R + 0.20 * C + 0.15 * I) * 100);
}

// ─── Filter Helper ────────────────────────────────────────────────────────────

export function filterLogs(
  logs: ActivityLog[],
  opts: { department?: string; employeeId?: string; taskCategory?: string; excludeOutliers?: boolean },
): ActivityLog[] {
  return logs.filter(l => {
    if (opts.excludeOutliers && l.isOutlier) return false;
    if (opts.department && l.department !== opts.department) return false;
    if (opts.employeeId && l.employeeId !== opts.employeeId) return false;
    if (opts.taskCategory && l.taskCategory !== opts.taskCategory) return false;
    return true;
  });
}

// ─── Aggregation Functions ────────────────────────────────────────────────────

export function computeHeadlines(
  logs: ActivityLog[],
  employees: Map<string, Employee>,
): HeadlineMetrics {
  const active = [...employees.values()].filter(e => e.status === 'active');
  const activeLogs = logs.filter(l => employees.get(l.employeeId)?.status === 'active');

  let repMin = 0;
  let totalCost = 0;
  let repCost = 0;

  for (const log of activeLogs) {
    const hr = employees.get(log.employeeId)?.hourlyRateInr ?? 0;
    const cost = (log.durationMinutes / 60) * hr;
    totalCost += cost;
    if (log.isRepetitive && !log.isOutlier) {
      repMin += log.durationMinutes;
      repCost += cost;
    }
  }

  const recHours = recoverableHours(repMin);
  const recCost = recHours * (totalCost / Math.max((activeLogs.reduce((s, l) => s + l.durationMinutes, 0) / 60), 1));

  // Better: per-employee recoverable cost
  let perEmpRecCost = 0;
  for (const emp of active) {
    const empRepMin = activeLogs
      .filter(l => l.employeeId === emp.employeeId && l.isRepetitive && !l.isOutlier)
      .reduce((s, l) => s + l.durationMinutes, 0);
    perEmpRecCost += recoverableCost(empRepMin, emp.hourlyRateInr);
  }

  return {
    totalRepetitiveHours: repMin / 60,
    recoverableHoursPerMonth: recoverableHours(repMin),
    recoverableCostInr: perEmpRecCost,
    totalLaborCostInr: totalCost,
    automationRoiPercent: totalCost > 0 ? (perEmpRecCost / totalCost) * 100 : 0,
    activeEmployeeCount: active.length,
    sampleDays: SAMPLE_DAYS,
  };
}

export function computeByDepartment(
  logs: ActivityLog[],
  employees: Map<string, Employee>,
): DeptStats[] {
  const map = new Map<string, DeptStats>();

  for (const log of logs) {
    const emp = employees.get(log.employeeId);
    if (!emp || emp.status === 'terminated') continue;
    const dept = log.department || emp.department;

    if (!map.has(dept)) {
      map.set(dept, {
        department: dept, totalMinutes: 0, repetitiveMinutes: 0,
        recoverableHours: 0, recoverableCostInr: 0, laborCostInr: 0,
        repetitiveShare: 0, employeeCount: 0,
      });
    }
    const s = map.get(dept)!;
    const cost = (log.durationMinutes / 60) * emp.hourlyRateInr;
    s.totalMinutes += log.durationMinutes;
    s.laborCostInr += cost;
    if (log.isRepetitive && !log.isOutlier) {
      s.repetitiveMinutes += log.durationMinutes;
    }
  }

  // Count unique employees per dept
  for (const [dept, s] of map) {
    s.employeeCount = [...employees.values()].filter(
      e => e.department === dept && e.status === 'active',
    ).length;
    s.repetitiveShare = s.totalMinutes > 0 ? s.repetitiveMinutes / s.totalMinutes : 0;
    s.recoverableHours = recoverableHours(s.repetitiveMinutes);

    // Per-employee recoverable cost for this dept
    let deptRecCost = 0;
    for (const emp of employees.values()) {
      if (emp.department !== dept || emp.status === 'terminated') continue;
      const empRepMin = logs
        .filter(l => l.employeeId === emp.employeeId && l.isRepetitive && !l.isOutlier)
        .reduce((s2, l) => s2 + l.durationMinutes, 0);
      deptRecCost += recoverableCost(empRepMin, emp.hourlyRateInr);
    }
    s.recoverableCostInr = deptRecCost;
  }

  return [...map.values()].sort((a, b) => b.recoverableCostInr - a.recoverableCostInr);
}

export function computeByTask(
  logs: ActivityLog[],
  employees: Map<string, Employee>,
  totalActiveEmployees: number,
): TaskStats[] {
  const map = new Map<string, {
    totalMinutes: number; repetitiveMinutes: number;
    laborCostInr: number; employeeIds: Set<string>;
  }>();

  for (const log of logs) {
    const emp = employees.get(log.employeeId);
    if (!emp || emp.status === 'terminated' || log.isOutlier) continue;
    const task = log.taskCategory;

    if (!map.has(task)) {
      map.set(task, { totalMinutes: 0, repetitiveMinutes: 0, laborCostInr: 0, employeeIds: new Set() });
    }
    const s = map.get(task)!;
    s.totalMinutes += log.durationMinutes;
    s.laborCostInr += (log.durationMinutes / 60) * emp.hourlyRateInr;
    s.employeeIds.add(log.employeeId);
    if (log.isRepetitive) s.repetitiveMinutes += log.durationMinutes;
  }

  const maxHours = Math.max(...[...map.values()].map(v => v.totalMinutes / 60));
  const maxCost = Math.max(...[...map.values()].map(v => v.laborCostInr));

  return [...map.entries()]
    .map(([task, s]) => ({
      taskCategory: task,
      totalMinutes: s.totalMinutes,
      repetitiveMinutes: s.repetitiveMinutes,
      totalHours: s.totalMinutes / 60,
      laborCostInr: s.laborCostInr,
      uniqueEmployeeCount: s.employeeIds.size,
      repetitiveShare: s.totalMinutes > 0 ? s.repetitiveMinutes / s.totalMinutes : 0,
      priorityScore: priorityScore(
        { totalMinutes: s.totalMinutes, repetitiveMinutes: s.repetitiveMinutes, uniqueEmployeeCount: s.employeeIds.size, laborCostInr: s.laborCostInr },
        maxHours, maxCost, totalActiveEmployees,
      ),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function computeByEmployee(
  logs: ActivityLog[],
  employees: Map<string, Employee>,
): EmployeeStats[] {
  return [...employees.values()].map(emp => {
    const empLogs = logs.filter(l => l.employeeId === emp.employeeId);
    const totalMin = empLogs.reduce((s, l) => s + (l.isOutlier ? 0 : l.durationMinutes), 0);
    const repMin = empLogs.filter(l => l.isRepetitive && !l.isOutlier).reduce((s, l) => s + l.durationMinutes, 0);

    // Top task by minutes
    const taskTotals = new Map<string, number>();
    for (const l of empLogs) taskTotals.set(l.taskCategory, (taskTotals.get(l.taskCategory) ?? 0) + l.durationMinutes);
    const topTask = [...taskTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    return {
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      role: emp.role,
      hourlyRateInr: emp.hourlyRateInr,
      totalMinutes: totalMin,
      repetitiveMinutes: repMin,
      recoverableHours: recoverableHours(repMin),
      recoverableCostInr: recoverableCost(repMin, emp.hourlyRateInr),
      topTask,
      status: emp.status,
      dataFlags: emp.dataFlags,
    };
  }).sort((a, b) => b.recoverableCostInr - a.recoverableCostInr);
}

export function computeByWeek(logs: ActivityLog[]): WeeklyStats[] {
  const map = new Map<number, { total: number; rep: number }>();
  for (const l of logs) {
    if (l.isOutlier) continue;
    const w = l.week;
    if (!map.has(w)) map.set(w, { total: 0, rep: 0 });
    const s = map.get(w)!;
    s.total += l.durationMinutes;
    if (l.isRepetitive) s.rep += l.durationMinutes;
  }

  return ([1, 2, 3, 4] as const).map(w => {
    const s = map.get(w) ?? { total: 0, rep: 0 };
    return {
      week: w,
      label: WEEK_LABELS[w],
      totalMinutes: s.total,
      repetitiveMinutes: s.rep,
      repetitiveShare: s.total > 0 ? s.rep / s.total : 0,
    };
  });
}

export function computeByApp(logs: ActivityLog[], employees: Map<string, Employee>): AppStats[] {
  const map = new Map<string, { total: number; rep: number }>();
  for (const l of logs) {
    const emp = employees.get(l.employeeId);
    if (!emp || emp.status === 'terminated' || l.isOutlier) continue;
    if (!map.has(l.appUsed)) map.set(l.appUsed, { total: 0, rep: 0 });
    const s = map.get(l.appUsed)!;
    s.total += l.durationMinutes;
    if (l.isRepetitive) s.rep += l.durationMinutes;
  }
  return [...map.entries()]
    .map(([app, s]) => ({ appUsed: app, totalMinutes: s.total, repetitiveMinutes: s.rep, repetitiveShare: s.total > 0 ? s.rep / s.total : 0 }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 10);
}

// ─── Build Full Grounding Context ─────────────────────────────────────────────

export function buildGroundingContext(
  logs: ActivityLog[],
  employees: Map<string, Employee>,
  audit: import('./types').DataAuditReport,
): GroundingContext {
  const activeCount = [...employees.values()].filter(e => e.status === 'active').length;
  return {
    headline: computeHeadlines(logs, employees),
    byDepartment: computeByDepartment(logs, employees),
    byTask: computeByTask(logs, employees, activeCount),
    byEmployee: computeByEmployee(logs, employees),
    byWeek: computeByWeek(logs),
    byApp: computeByApp(logs, employees),
    audit,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatInr(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)} hrs`;
}
