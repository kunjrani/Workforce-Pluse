import { OpenAI } from 'openai';
import type { GroundingContext } from '@/lib/types';

export const runtime = 'edge';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? '',
  baseURL: 'https://api.groq.com/openai/v1',
});

function buildSystemPrompt(ctx: GroundingContext): string {
  return `You are Workforce Pluse AI, a workforce analytics assistant for C-suite leaders.
You MUST only use numbers from the pre-computed data below. Never invent, estimate, or round differently.

=== HEADLINE METRICS ===
- Recoverable hours/month: ${ctx.headline.recoverableHoursPerMonth.toFixed(1)} hrs
- Recoverable cost/month: ₹${ctx.headline.recoverableCostInr.toLocaleString('en-IN')}
- Total labour cost (sample): ₹${ctx.headline.totalLaborCostInr.toLocaleString('en-IN')}
- Automation ROI: ${ctx.headline.automationRoiPercent.toFixed(1)}%
- Active employees: ${ctx.headline.activeEmployeeCount}
- Sample period: ${ctx.headline.sampleDays} days (Oct 6–24, 2025)

=== TOP AUTOMATION PRIORITIES (by priority score) ===
${ctx.byTask.slice(0, 10).map((t, i) =>
  `${i + 1}. ${t.taskCategory}: Score ${t.priorityScore}/100 | ${t.totalHours.toFixed(1)}h | ₹${t.laborCostInr.toLocaleString('en-IN')} cost | ${(t.repetitiveShare * 100).toFixed(0)}% repetitive | ${t.uniqueEmployeeCount} employees`
).join('\n')}

=== BY DEPARTMENT ===
${ctx.byDepartment.map(d =>
  `${d.department}: ₹${d.recoverableCostInr.toLocaleString('en-IN')} recoverable | ${(d.repetitiveShare * 100).toFixed(0)}% repetitive | ${d.employeeCount} employees | ${(d.totalMinutes / 60).toFixed(1)}h total`
).join('\n')}

=== BY EMPLOYEE ===
${ctx.byEmployee.filter(e => e.status === 'active').map(e =>
  `${e.employeeId} (${e.name}, ${e.department}, ${e.role}): ${(e.repetitiveMinutes / 60).toFixed(1)}h repetitive | ₹${e.recoverableCostInr.toLocaleString('en-IN')} recoverable/mo | top task: ${e.topTask}`
).join('\n')}

=== BY APPLICATION (top 8) ===
${ctx.byApp.slice(0, 8).map(a =>
  `${a.appUsed}: ${(a.totalMinutes / 60).toFixed(1)}h | ${(a.repetitiveShare * 100).toFixed(0)}% repetitive`
).join('\n')}

=== 4-WEEK TREND ===
${ctx.byWeek.map(w => `${w.label}: ${(w.repetitiveShare * 100).toFixed(0)}% repetitive share | ${(w.totalMinutes / 60).toFixed(1)}h total`).join('\n')}

=== DATA QUALITY ===
- Valid rows: ${ctx.audit.validRows} / ${ctx.audit.totalRawRows} raw rows
- Outliers excluded: ${ctx.audit.outlierRows} (999 min entries)
- Imputed employees: ${ctx.audit.imputedCostEmployees.join(', ') || 'none'}

STRICT RULES:
1. Every number you state MUST come from the data above — cite source in [brackets]: e.g. [Source: E004 | Finance | Invoice Processing]
2. If the answer is not in the data, say "That breakdown is not available in the current dataset" — do NOT guess
3. For "who spends most on X in department Y": find employees in that department whose top task matches, compare repetitive hours from BY EMPLOYEE section
4. Rank automation recommendations by Priority Score from TOP AUTOMATION PRIORITIES
5. Be concise and executive-friendly
6. Support follow-up questions using conversation history + this same data`;
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return new Response('GROQ_API_KEY is not configured. Add it to .env.local', { status: 503 });
  }

  try {
    const { messages, context } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      context: GroundingContext;
    };

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return new Response('AI request failed. Check your API key and try again.', { status: 502 });
  }
}
