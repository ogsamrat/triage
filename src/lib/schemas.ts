import { z } from "zod";

/**
 * Generation schemas — deliberately lenient so a slightly-off model response
 * never throws mid-demo. The route handlers normalize/clamp the result into the
 * strict domain types (see lib/normalize.ts).
 */

export const TaskGenSchema = z.object({
  id: z.string().optional().describe("short stable id, e.g. 't1'"),
  title: z.string().describe("concise, specific task title"),
  type: z
    .string()
    .optional()
    .describe(
      "one of: assignment, exam, meeting, bill, errand, interview, other",
    ),
  deadline: z
    .string()
    .optional()
    .default("")
    .describe(
      "local datetime as 'YYYY-MM-DDTHH:MM:SS' with NO timezone designator (no Z, no offset), resolved against `now`. If only a day is given, choose a sensible time (assignments default to 23:59). Omit only for genuinely deadline-less tasks.",
    ),
  estimatedMinutes: z
    .number()
    .optional()
    .describe("realistic minutes of focused work to complete it"),
  importance: z.number().optional().describe("1 (trivial) to 5 (critical) — consequences if undone"),
  urgency: z.number().optional().describe("1 (no rush) to 5 (imminent) — how soon the deadline bites"),
  priorityRank: z.number().optional().describe("global order to tackle them; 1 = do first"),
  rationale: z
    .string()
    .optional()
    .describe(
      "ONE sharp editorial sentence (about 12-18 words) explaining the ranking. Dry, literary, confident. No corporate filler, no emoji.",
    ),
});

export const IngestGenSchema = z.object({
  tasks: z.array(TaskGenSchema),
  rightNow: z
    .object({
      taskId: z.string().optional().describe("id of the single task to start right now"),
      headline: z
        .string()
        .optional()
        .describe("a punchy 3-6 word imperative for the one thing to start now"),
      why: z.string().optional().describe("one sharp sentence: why this task, why now"),
      firstStep: z
        .string()
        .optional()
        .describe("the very first concrete action, doable in under 5 minutes"),
    })
    .optional(),
});
export type IngestGen = z.infer<typeof IngestGenSchema>;

export const StepGenSchema = z.object({
  label: z.string().describe("a concrete, startable action"),
  minutes: z.number().optional().describe("rough minutes for this step (10-30)"),
});

export const BreakdownGenSchema = z.object({
  steps: z
    .array(StepGenSchema)
    .describe("3 to 8 concrete, startable steps that build momentum"),
});
export type BreakdownGen = z.infer<typeof BreakdownGenSchema>;

export const BlockGenSchema = z.object({
  taskId: z.string().optional().describe("id of the task this block advances; '' for breaks"),
  title: z.string().optional().describe("what happens in this block"),
  start: z
    .string()
    .describe("local datetime 'YYYY-MM-DDTHH:MM:SS', no timezone designator"),
  end: z
    .string()
    .describe("local datetime 'YYYY-MM-DDTHH:MM:SS', no timezone designator"),
  kind: z.string().optional().describe("one of: focus, admin, break, buffer"),
});

export const ScheduleGenSchema = z.object({
  blocks: z.array(BlockGenSchema),
});
export type ScheduleGen = z.infer<typeof ScheduleGenSchema>;

export const CommandActionGenSchema = z.object({
  kind: z
    .string()
    .describe("one of: complete, reopen, remove, reschedule, add, replan"),
  taskId: z
    .string()
    .optional()
    .describe("target task id — required for complete/reopen/remove/reschedule"),
  title: z.string().optional().describe("title for a newly added task"),
  type: z
    .string()
    .optional()
    .describe("assignment, exam, meeting, bill, errand, interview, or other"),
  deadline: z
    .string()
    .optional()
    .describe("floating-local 'YYYY-MM-DDTHH:MM:SS' for add / reschedule"),
  estimatedMinutes: z.number().optional(),
  importance: z.number().optional(),
  urgency: z.number().optional(),
});

export const CommandGenSchema = z.object({
  reply: z
    .string()
    .describe(
      "one or two sharp sentences confirming what you changed, or answering the question. Editorial voice.",
    ),
  actions: z.array(CommandActionGenSchema),
});
export type CommandGen = z.infer<typeof CommandGenSchema>;
