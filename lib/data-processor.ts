import Papa from 'papaparse';
import type {
  Employee, EmployeeFlag, ActivityLog, LogFlag, DataAuditReport, WorkingHours,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKING_HOURS_PER_YEAR = 2112; // 8h × 22d × 12m
const SAMPLE_START = new Date('2025-10-06T00:00:00+05:30');

// ─── Normalization Dictionaries ───────────────────────────────────────────────

const APP_MAP: Record<string, string> = {
  // Gmail
  gmail: 'Gmail', gmai: 'Gmail',
  // Outlook
  outlook: 'Outlook', 'ms outlook': 'Outlook',
  // Slack
  slack: 'Slack',
  // Excel
  excel: 'Excel', 'ms excel': 'Excel', 'microsoft excel': 'Excel',
  // SAP
  sap: 'SAP',
  // Salesforce
  salesforce: 'Salesforce', 'sales force': 'Salesforce', sfdc: 'Salesforce',
  // Zoho
  zoho: 'Zoho CRM', 'zoho crm': 'Zoho CRM',
  // Tally
  tally: 'Tally', 'tally erp': 'Tally',
  // PowerPoint
  ppt: 'PowerPoint', powerpoint: 'PowerPoint', 'ms powerpoint': 'PowerPoint',
  'microsoft powerpoint': 'PowerPoint',
  // Chrome
  chrome: 'Chrome', 'google chrome': 'Chrome',
  // Zoom
  zoom: 'Zoom',
  // Word
  word: 'Word', 'ms word': 'Word', 'microsoft word': 'Word',
  // Notion
  notion: 'Notion',
  // Jira
  jira: 'Jira',
  // WhatsApp
  whatsapp: 'WhatsApp', 'whatsapp web': 'WhatsApp',
};

const TASK_MAP: Record<string, string> = {
  'email triage': 'Email Triage',
  'internal comms': 'Internal Communication',
  'internal communication': 'Internal Communication',
  'crm updates': 'CRM Updates', 'crm update': 'CRM Updates',
  reporting: 'Reporting',
  'cal mgmt': 'Calendar Management', 'calendar mgmt': 'Calendar Management',
  'calendar management': 'Calendar Management',
  'data entry': 'Data Entry', 'data-entry': 'Data Entry',
  reconciliation: 'Reconciliation', recon: 'Reconciliation',
  'lead-entry': 'Lead Entry', 'lead entry': 'Lead Entry',
  'status updates': 'Status Updates', 'status update': 'Status Updates',
  'ticket updates': 'Ticket Updates',
  'invoice proc': 'Invoice Processing', 'invoice processing': 'Invoice Processing',
  'vendor mgmt': 'Vendor Management', 'vendor management': 'Vendor Management',
  'pipeline review': 'Pipeline Review',
  'client communication': 'Client Communication',
  'client comms': 'Client Communication', 'client comm': 'Client Communication',
  'client call': 'Meetings',
  research: 'Research',
  'vendor portals': 'Vendor Portals',
  bookkeeping: 'Bookkeeping',
  'gst prep': 'GST Filing Prep', 'gst filing prep': 'GST Filing Prep',
  'deck building': 'Deck Building', 'slide building': 'Deck Building',
  drafting: 'Document Drafting', 'doc drafting': 'Document Drafting',
  'document drafting': 'Document Drafting',
  documentation: 'Document Drafting', notes: 'Document Drafting',
  docs: 'Document Drafting',
  meetings: 'Meetings', 'internal meeting': 'Meetings',
};

// ─── Normalization Helpers ────────────────────────────────────────────────────

function normalizeApp(raw: string): string {
  const key = raw.trim().toLowerCase();
  return APP_MAP[key] ?? (key === '' || key === '-' || key === 'na' ? 'Other' : raw.trim());
}

function normalizeTask(raw: string): string {
  const key = raw.trim().toLowerCase();
  return TASK_MAP[key] ?? (key === '' || key === '-' || key === 'na' ? 'Other' : raw.trim());
}

function normalizeBool(raw: string): boolean | null {
  const v = String(raw).trim().toLowerCase();
  if (['yes', 'true', '1'].includes(v)) return true;
  if (['no', 'false', '0'].includes(v)) return false;
  return null; // '-' or ambiguous → treated as false downstream
}

function parseTimestamp(raw: string): Date | null {
  if (!raw) return null;
  // slash format: DD/MM/YYYY HH:mm
  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (slashMatch) {
    const [, dd, mm, yyyy, time] = slashMatch;
    return new Date(`${yyyy}-${mm}-${dd}T${time}:00+05:30`);
  }
  // ISO with space or T
  const iso = raw.replace(' ', 'T');
  const d = new Date(iso.includes('+') ? iso : `${iso}+05:30`);
  return isNaN(d.getTime()) ? null : d;
}

function getWeek(ts: Date): 1 | 2 | 3 | 4 {
  const diffDays = Math.floor((ts.getTime() - SAMPLE_START.getTime()) / 86400000);
  const w = Math.floor(diffDays / 7) + 1;
  return (Math.min(Math.max(w, 1), 4)) as 1 | 2 | 3 | 4;
}

/** Normalize working_hours from string ("9-18"), object ({start,end}), or null */
function normalizeWorkingHours(raw: unknown): WorkingHours | null {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    const match = raw.match(/(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?/);
    if (match) {
      return { startHour: parseInt(match[1], 10), endHour: parseInt(match[2], 10), label: raw.trim() };
    }
    return null;
  }

  if (typeof raw === 'object') {
    const obj = raw as { start?: string; end?: string };
    if (obj.start && obj.end) {
      const startHour = parseInt(obj.start, 10);
      const endHour = parseInt(obj.end, 10);
      if (!isNaN(startHour) && !isNaN(endHour)) {
        return { startHour, endHour, label: `${obj.start}-${obj.end}` };
      }
    }
  }

  return null;
}

function logDedupKey(log: ActivityLog): string {
  return [
    log.employeeId,
    log.timestamp.toISOString(),
    log.appUsed,
    log.taskCategory,
    log.durationMinutes,
    log.isRepetitive,
  ].join('|');
}

// ─── Employee Parser ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEmployee(raw: any): Employee | null {
  // Resolve schema variants A, B, C
  const id = (raw.EmployeeID ?? raw.employee_id ?? '').toString().trim();
  if (!id) return null;

  const name = raw.Name ?? raw.name ?? id;
  const department = raw.Dept ?? raw.department ?? '';
  const status = (raw.Status ?? raw.status ?? 'active').toLowerCase() as 'active' | 'terminated';
  const tenureMonths = raw.tenureMonths ?? raw.tenure_months ?? raw.meta?.tenure_months ?? 0;
  const role = raw.Role ?? raw.role ?? raw.meta?.role ?? 'Unknown';
  const workingHours = normalizeWorkingHours(
    raw.workingHours ?? raw.working_hours ?? raw.meta?.working_hours,
  );

  const flags: EmployeeFlag[] = [];

  // Compensation normalization
  let annualCtcInr = 0;
  if (raw.salary_LPA) {
    annualCtcInr = raw.salary_LPA * 100000;
  } else if (raw.hourly_rate_inr) {
    annualCtcInr = raw.hourly_rate_inr * WORKING_HOURS_PER_YEAR;
    flags.push('hourly_converted');
  } else if (raw.annual_ctc_inr) {
    annualCtcInr = raw.annual_ctc_inr;
  } else if (raw.meta?.compensation?.annual) {
    annualCtcInr = raw.meta.compensation.annual;
    flags.push('nested_meta');
  }

  if (status === 'terminated') flags.push('terminated');

  return {
    employeeId: id,
    name,
    department,
    role,
    annualCtcInr,
    hourlyRateInr: annualCtcInr / WORKING_HOURS_PER_YEAR,
    tenureMonths: Number(tenureMonths) || 0,
    status,
    terminatedOn: raw.terminated_on,
    workingHours,
    dataFlags: flags,
  };
}

// ─── Public Loader ────────────────────────────────────────────────────────────

export interface ProcessedData {
  employees: Map<string, Employee>;
  logs: ActivityLog[];
  audit: DataAuditReport;
}

export async function loadAndProcess(): Promise<ProcessedData> {
  // Fetch both files in parallel
  const [empRes, csvRes] = await Promise.all([
    fetch('/data/employees.json'),
    fetch('/data/activity_logs.csv'),
  ]);
  const empJson = await empRes.json();
  const csvText = await csvRes.text();

  // ── Parse employees ──────────────────────────────────────────────────────────
  const employeeMap = new Map<string, Employee>();
  const duplicates: string[] = [];
  const terminatedList: string[] = [];

  for (const raw of empJson.employees) {
    const emp = parseEmployee(raw);
    if (!emp) continue;

    if (employeeMap.has(emp.employeeId)) {
      // Deduplication: keep higher-salary record (Record 2 for E007)
      const existing = employeeMap.get(emp.employeeId)!;
      if (emp.annualCtcInr > existing.annualCtcInr) {
        emp.dataFlags.push('duplicate_resolved');
        employeeMap.set(emp.employeeId, emp);
      }
      if (!duplicates.includes(emp.employeeId)) duplicates.push(emp.employeeId);
    } else {
      employeeMap.set(emp.employeeId, emp);
    }
    if (emp.status === 'terminated' && !terminatedList.includes(emp.employeeId)) {
      terminatedList.push(emp.employeeId);
    }
  }

  // ── Impute E013 (missing from HRMS) ─────────────────────────────────────────
  const hrEmployees = [...employeeMap.values()].filter(
    e => e.department === 'HR' && e.status === 'active',
  );
  const hrAvgHourly =
    hrEmployees.length > 0
      ? hrEmployees.reduce((s, e) => s + e.hourlyRateInr, 0) / hrEmployees.length
      : 500;

  // E013 will be created when found in logs (see below)
  const missingHrms: string[] = [];
  const noActivity: string[] = [];

  // ── Parse CSV logs ────────────────────────────────────────────────────────────
  const { data: rows } = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true,
  });

  const logs: ActivityLog[] = [];
  let droppedRows = 0;
  let zeroDurationRows = 0;
  let outlierRows = 0;
  let corruptedIdRows = 0;
  const seenEmployeesInLogs = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawId = (row.employee_id ?? '').trim();

    if (rawId === '?' || !rawId) {
      corruptedIdRows++;
      continue;
    }

    const dur = parseFloat(row.duration_minutes);
    if (isNaN(dur) || dur < 0) { droppedRows++; continue; }
    if (dur === 0) { zeroDurationRows++; droppedRows++; continue; }

    const ts = parseTimestamp(row.timestamp);
    if (!ts) { droppedRows++; continue; }

    const flags: LogFlag[] = [];
    const isOutlier = dur > 480;
    if (isOutlier) { outlierRows++; flags.push('outlier_duration'); }

    const rawBool = normalizeBool(row.is_repetitive);
    if (rawBool === null) flags.push('boolean_ambiguous');

    seenEmployeesInLogs.add(rawId);

    // Impute E013 employee record if not in HRMS
    if (!employeeMap.has(rawId) && rawId === 'E013') {
      missingHrms.push(rawId);
      employeeMap.set('E013', {
        employeeId: 'E013',
        name: 'Employee 013',
        department: row.department ?? 'HR',
        role: 'HR Specialist',
        annualCtcInr: hrAvgHourly * WORKING_HOURS_PER_YEAR,
        hourlyRateInr: hrAvgHourly,
        tenureMonths: 0,
        status: 'active',
        workingHours: null,
        dataFlags: ['imputed_cost'],
      });
    }

    logs.push({
      rowIndex: i + 2, // 1-indexed with header
      employeeId: rawId,
      department: row.department?.trim() ?? '',
      timestamp: ts,
      week: getWeek(ts),
      appUsed: normalizeApp(row.app_used ?? ''),
      taskCategory: normalizeTask(row.task_category ?? ''),
      durationMinutes: dur,
      isRepetitive: rawBool ?? false,
      isOutlier,
      dataFlags: flags,
    });
  }

  // Deduplicate activity log rows (same employee, timestamp, app, task, duration)
  const seenKeys = new Set<string>();
  let deduplicatedRows = 0;
  const dedupedLogs: ActivityLog[] = [];

  for (const log of logs) {
    const key = logDedupKey(log);
    if (seenKeys.has(key)) {
      deduplicatedRows++;
      continue;
    }
    seenKeys.add(key);
    dedupedLogs.push(log);
  }

  // Find HRMS-only employees (no logs)
  for (const empId of employeeMap.keys()) {
    if (!seenEmployeesInLogs.has(empId)) noActivity.push(empId);
  }

  const audit: DataAuditReport = {
    totalRawRows: rows.length,
    droppedRows,
    zeroDurationRows,
    outlierRows,
    corruptedIdRows,
    deduplicatedRows,
    duplicateEmployees: duplicates,
    terminatedEmployees: terminatedList,
    missingHrmsRecords: [...new Set(missingHrms)],
    noActivityRecords: noActivity,
    imputedCostEmployees: missingHrms.length > 0 ? ['E013'] : [],
    validRows: dedupedLogs.length,
  };

  return { employees: employeeMap, logs: dedupedLogs, audit };
}
