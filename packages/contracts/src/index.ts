import { z } from "zod";

export const sourceRefSchema = z.object({
  id: z.string().min(1),
  location_label: z.string().min(1),
  snippet: z.string().min(1).max(240),
});

export const deadlineSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  date_time_iso: z.string().datetime({ offset: true }).nullable(),
  timezone: z.string().nullable(),
  precision: z.enum(["exact", "date_only", "partial", "unknown"]),
  is_inferred: z.boolean(),
  needs_confirmation: z.boolean(),
  source_refs: z.array(z.string()).default([]),
});

export const actionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  priority: z.enum(["urgent", "high", "normal", "optional"]),
  deadline_id: z.string().nullable(),
  requirements: z.array(z.string()),
  links: z.array(z.object({
    label: z.string().min(1),
    url: z.string().url(),
  })),
  source_refs: z.array(z.string()).default([]),
  evidence_state: z.enum(["source_backed", "inferred", "needs_confirmation"]),
  confidence: z.enum(["high", "medium", "low"]),
});

const doc2DoResultBaseSchema = z.object({
  schema_version: z.literal("1.0"),
  document: z.object({
    title: z.string().min(1),
    category: z.enum(["scholarship", "job", "education", "bill", "event", "admin", "other"]),
    language: z.enum(["vi", "en", "other"]),
    issuer: z.string().nullable(),
    source_date: z.string().date().nullable(),
    summary: z.string().min(1),
    audience: z.array(z.string()),
  }),
  applicability: z.object({
    status: z.enum(["likely_eligible", "likely_ineligible", "unclear", "not_applicable"]),
    reasons: z.array(z.string()),
    missing_facts: z.array(z.string()),
    questions_for_user: z.array(z.string()).max(3),
  }),
  deadlines: z.array(deadlineSchema),
  actions: z.array(actionSchema).max(8),
  source_refs: z.array(sourceRefSchema),
  warnings: z.array(z.object({
    type: z.enum(["missing", "conflict", "ambiguity", "quality", "safety"]),
    message: z.string().min(1),
    source_refs: z.array(z.string()),
  })),
  next_best_action_id: z.string().nullable(),
  disclaimer: z.string().min(1),
});

type Doc2DoResultBase = z.infer<typeof doc2DoResultBaseSchema>;

export const doc2DoResultSchema = doc2DoResultBaseSchema.superRefine(
  (result: Doc2DoResultBase, ctx: z.RefinementCtx) => {
  const sourceIds = new Set(
    result.source_refs.map((source: z.infer<typeof sourceRefSchema>) => source.id),
  );
  const deadlineIds = new Set(
    result.deadlines.map((deadline: z.infer<typeof deadlineSchema>) => deadline.id),
  );
  const actionIds = new Set(
    result.actions.map((action: z.infer<typeof actionSchema>) => action.id),
  );

  for (const [index, deadline] of result.deadlines.entries()) {
    for (const sourceId of deadline.source_refs) {
      if (!sourceIds.has(sourceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["deadlines", index, "source_refs"],
          message: `Unknown source reference: ${sourceId}`,
        });
      }
    }
  }

  for (const [index, action] of result.actions.entries()) {
    if (action.deadline_id && !deadlineIds.has(action.deadline_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["actions", index, "deadline_id"],
        message: `Unknown deadline reference: ${action.deadline_id}`,
      });
    }
    for (const sourceId of action.source_refs) {
      if (!sourceIds.has(sourceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["actions", index, "source_refs"],
          message: `Unknown source reference: ${sourceId}`,
        });
      }
    }
  }

  if (result.next_best_action_id && !actionIds.has(result.next_best_action_id)) {
    ctx.addIssue({
      code: "custom",
      path: ["next_best_action_id"],
      message: `Unknown next action: ${result.next_best_action_id}`,
    });
  }
  },
);

export const analysisResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal("complete"),
  mode: z.enum(["gemini", "demo"]),
  result: doc2DoResultSchema,
  created_at: z.string().datetime({ offset: true }),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Deadline = z.infer<typeof deadlineSchema>;
export type ActionItem = z.infer<typeof actionSchema>;
export type Doc2DoResult = z.infer<typeof doc2DoResultSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
