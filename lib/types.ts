// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface WorkingHours {
  startHour: number;
  endHour: number;
  label: string;                  // e.g. "9-18"
}

export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  annualCtcInr: number;
  hourlyRateInr: number;          // annualCtcInr / 2112
  tenureMonths: number;
  status: 'active' | 'terminated';
  terminatedOn?: string;
  workingHours: WorkingHours | null;
  dataFlags: EmployeeFlag[];
}

export type EmployeeFlag =
  | 'duplicate_resolved'
  | 'imputed_cost'
  | 'no_activity_logs'
  | 'terminated'
  | 'nested_meta'
  | 'hourly_converted';

export interface ActivityLog {
  rowIndex: number;
  employeeId: string;
  department: string;
  timestamp: Date;
  week: 1 | 2 | 3 | 4;
  appUsed: string;                // canonical app name
  taskCategory: string;           // canonical task category
  durationMinutes: number;
  isRepetitive: boolean;
  isOutlier: boolean;
  dataFlags: LogFlag[];
}

export type LogFlag =
  | 'outlier_duration'
  | 'corrupted_employee_id'
  | 'boolean_ambiguous'
  | 'duplicate_row';

// ─── Analytics Output Types ───────────────────────────────────────────────────

export interface HeadlineMetrics {
  totalRepetitiveHours: number;   // raw sample period
  recoverableHoursPerMonth: number;
  recoverableCostInr: number;
  totalLaborCostInr: number;      // total loaded cost across all logs
  automationRoiPercent: number;   // recoverableCost / totalCost
  activeEmployeeCount: number;
  sampleDays: number;
}

export interface DeptStats {
  department: string;
  totalMinutes: number;
  repetitiveMinutes: number;
  recoverableHours: number;
  recoverableCostInr: number;
  laborCostInr: number;
  repetitiveShare: number;        // 0–1
  employeeCount: number;
}

export interface TaskStats {
  taskCategory: string;
  totalMinutes: number;
  repetitiveMinutes: number;
  totalHours: number;
  laborCostInr: number;
  uniqueEmployeeCount: number;
  repetitiveShare: number;
  priorityScore: number;          // 0–100
}

export interface EmployeeStats {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  hourlyRateInr: number;
  totalMinutes: number;
  repetitiveMinutes: number;
  recoverableHours: number;
  recoverableCostInr: number;
  topTask: string;
  status: 'active' | 'terminated';
  dataFlags: EmployeeFlag[];
}

export interface WeeklyStats {
  week: 1 | 2 | 3 | 4;
  label: string;                  // e.g. "Week 1 (Oct 6–12)"
  totalMinutes: number;
  repetitiveMinutes: number;
  repetitiveShare: number;
}

export interface AppStats {
  appUsed: string;
  totalMinutes: number;
  repetitiveMinutes: number;
  repetitiveShare: number;
}

// ─── Audit Report ─────────────────────────────────────────────────────────────

export interface DataAuditReport {
  totalRawRows: number;
  droppedRows: number;            // negatives + NaN + zero durations
  zeroDurationRows: number;
  outlierRows: number;            // 999 min entries
  corruptedIdRows: number;        // '?' employee IDs
  deduplicatedRows: number;       // duplicate activity log rows removed
  duplicateEmployees: string[];   // e.g. ['E007']
  terminatedEmployees: string[];
  missingHrmsRecords: string[];   // in logs but not HRMS
  noActivityRecords: string[];    // in HRMS but no logs
  imputedCostEmployees: string[];
  validRows: number;
}

// ─── Grounding Context (for AI) ───────────────────────────────────────────────

export interface GroundingContext {
  headline: HeadlineMetrics;
  byDepartment: DeptStats[];
  byTask: TaskStats[];
  byEmployee: EmployeeStats[];
  byWeek: WeeklyStats[];
  byApp: AppStats[];
  audit: DataAuditReport;
}
