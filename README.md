# Workforce Pluse

Operational intelligence dashboard for identifying time leakage, labor cost recovery, and automation priorities from HRMS + activity log data.

---

## Quick Start

```bash
cd workforce-pulse
npm install
cp .env.example .env.local   # add your GROQ_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Assumptions

| Assumption | Rationale |
|---|---|
| Sample period is 28 days (Oct 6–24, 2025) | Matches the activity log date range |
| 2,112 working hours/year (8h × 22d × 12m) | Standard loaded-cost basis for hourly rate derivation |
| 70% automation feasibility on repetitive tasks | Conservative industry estimate for low-complexity work |
| IST (UTC+5:30) for all timestamps | Dataset originates from an Indian org |
| E013 hourly rate imputed from HR dept average | Employee appears in logs but not in HRMS |
| E007 duplicate resolved to higher-seniority record | Two HRMS records; Senior AE at ₹24L selected |
| Terminated employees (E010) excluded from cost projections | Historical logs retained, not counted as active capacity |

---

## Data Join Strategy

**Sources:** `public/data/activity_logs.csv` (539 rows) + `public/data/employees.json` (16 records, 4 schema variants)

**Employee normalization:** Flat PascalCase, flat camelCase, hourly-rate, and nested `meta.compensation` schemas unified to a single `Employee` type with `annualCtcInr` and `hourlyRateInr`.

**Activity log cleaning:**
- App names: 49 variants → 18 canonical names
- Task categories: 40+ variants → 20 canonical categories
- Timestamps: DD/MM/YYYY and ISO formats → IST
- Durations: drop negative, NaN, and zero; flag outliers (>480 min)
- Booleans: 11 raw values → strict true/false
- Rows deduplicated on employee + timestamp + app + task + duration
- Corrupted IDs (`?`) dropped

**Join:** Left join logs → employee master on `employee_id`. Missing E013 imputed; E099 (HRMS-only) tracked separately.

**Conflict resolution:**

| Case | Resolution |
|---|---|
| E007 duplicate | Keep Senior AE record (₹24L) |
| E013 missing HRMS | Impute hourly rate from HR average |
| E010 terminated | Exclude from active cost forecasts |
| E099 no logs | Retain in roster, exclude from time metrics |

---

## Formulas

### Recoverable Hours / Month
```
(repetitiveMinutes / 60) × 0.70 × (30.44 / 28)
```

### Recoverable Cost / Month
```
Σ recoverableHours(employee) × hourlyRate(employee)
hourlyRate = annualCtcInr / 2112
```

### Automation Priority Score (0–100)
```
0.35(V) + 0.30(R) + 0.20(C) + 0.15(I)
```
| Factor | Definition |
|---|---|
| V — Volume | Task hours ÷ max task hours |
| R — Repetitiveness | Repetitive minutes ÷ total task minutes |
| C — Employee spread | Unique employees on task ÷ active headcount |
| I — Cost impact | Task labor cost ÷ max task cost |

---

## Anomaly Detection

| Type | Rule | Action |
|---|---|---|
| Invalid duration | Negative, NaN, or zero | Drop row; count in audit |
| Extreme outlier | Duration > 480 min (999 min entries) | Flag; exclude from recovery by default |
| Corrupted ID | `employee_id = ?` | Drop row |
| Duplicate log row | Same employee + timestamp + app + task + duration | Keep first; count deduped |
| Missing HRMS | Employee in logs, not in HRMS | Impute cost; flag in UI |
| HRMS-only | Employee in HRMS, zero logs | Track in audit (E099) |
| Operational outlier | 999-min entries from E012/E013 in HR | Surfaced in Anomaly Callout |

---

## Scope Cuts

| Cut | Reason |
|---|---|
| Server-side ETL | 533 rows process instantly client-side; server ETL adds complexity without benefit at this scale |
| Filter-aware AI context | AI uses full dataset to avoid answering about filtered subsets as if they were the whole org |
| Per-employee task matrix in AI | Would require larger grounding payload; top-task per employee covers most queries |
| Real-time data refresh | Static CSV/JSON files sufficient for assignment scope |

---

## Tech Stack

Next.js 14+ · TypeScript · Zustand · Recharts · PapaParse · Groq API · html2canvas + jsPDF

---

## Project Structure

```
workforce-pulse/
├── app/                  # Pages + API routes
├── components/
│   ├── dashboard/        # Charts, KPIs, rankings
│   ├── ai/               # Chat assistant
│   ├── data-audit/       # Data health drawer
│   └── export/           # PDF/PNG executive summary
├── lib/
│   ├── data-processor.ts # ETL engine
│   ├── analytics.ts      # Metric formulas
│   └── store.ts          # Filter state
└── public/data/          # Raw CSV + JSON
```
