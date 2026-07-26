import { create } from 'zustand';
import type { Employee, ActivityLog, GroundingContext, DataAuditReport } from './types';
import { buildGroundingContext, filterLogs } from './analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  department: string | undefined;
  employeeId: string | undefined;
  taskCategory: string | undefined;
  excludeOutliers: boolean;
}

interface DataStore {
  employees: Map<string, Employee>;
  logs: ActivityLog[];
  audit: DataAuditReport | null;
  isLoaded: boolean;

  // Stable lookup lists for dropdowns — computed once at load
  departments: string[];
  tasks: string[];

  filters: Filters;

  // Filtered context — used for dashboard charts/cards
  context: GroundingContext | null;

  // Full unfiltered context — ALWAYS passed to AI so it answers about whole dataset
  fullContext: GroundingContext | null;

  // Actions
  setData: (employees: Map<string, Employee>, logs: ActivityLog[], audit: DataAuditReport) => void;
  setFilter: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: Filters = {
  department: undefined,
  employeeId: undefined,
  taskCategory: undefined,
  excludeOutliers: true,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<DataStore>((set, get) => ({
  employees: new Map(),
  logs: [],
  audit: null,
  isLoaded: false,
  departments: [],
  tasks: [],
  filters: DEFAULT_FILTERS,
  context: null,
  fullContext: null,

  setData: (employees, logs, audit) => {
    const departments = [...new Set([...employees.values()].map(e => e.department))].sort();
    const tasks = [...new Set(logs.map(l => l.taskCategory))].sort();

    const defaultLogs = filterLogs(logs, DEFAULT_FILTERS);
    const context = buildGroundingContext(defaultLogs, employees, audit);

    // fullContext uses same default filters but is NEVER overwritten by user filters
    const fullContext = buildGroundingContext(defaultLogs, employees, audit);

    set({ employees, logs, audit, isLoaded: true, departments, tasks, context, fullContext });
  },

  setFilter: (patch) => {
    const { logs, employees, audit, filters } = get();
    const next: Filters = { ...filters, ...patch };
    const filteredLogs = filterLogs(logs, next);
    const context = buildGroundingContext(filteredLogs, employees, audit!);
    // fullContext intentionally NOT updated — AI always sees complete dataset
    set({ filters: next, context });
  },

  resetFilters: () => {
    const { logs, employees, audit } = get();
    const filteredLogs = filterLogs(logs, DEFAULT_FILTERS);
    const context = buildGroundingContext(filteredLogs, employees, audit!);
    set({ filters: DEFAULT_FILTERS, context });
  },
}));
