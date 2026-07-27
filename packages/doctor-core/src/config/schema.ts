import { z } from 'zod';
import { RULE_REGISTRY } from '../rule-registry.js';

/**
 * A rule severity level as accepted in user config. `off` disables a rule
 * (removing it from the resolved preset base); the other three mirror the
 * internal {@link import('../types.js').Severity} vocabulary.
 */
export const LevelSchema = z.enum(['error', 'warn', 'info', 'off']);

/**
 * The accepted shape of a single `rules` entry. Doctor config only ever takes
 * a bare severity string (no `[level, options]` tuple, no `{ level }` object) —
 * this matches the historical hand-rolled validator exactly.
 */
export const RuleEntrySchema = LevelSchema;

const ruleIds: readonly string[] = RULE_REGISTRY.map((rule) => rule.id);

/**
 * Dynamic `rules` object: every registered rule id is a known optional key, and
 * a `catchall` keeps unknown keys parseable so {@link DoctorUserConfigSchema}'s
 * `superRefine` can report them with a precise path. Building the object from
 * RULE_REGISTRY is what lets `z.toJSONSchema()` enumerate the known ids.
 */
const RulesSchema = z
  .object(
    Object.fromEntries(ruleIds.map((id) => [id, RuleEntrySchema.optional()])),
  )
  .catchall(RuleEntrySchema.optional());

/**
 * Scalar fields of the user config. `.loose()` preserves unknown top-level keys
 * (forward-compatibility, matching the old validator which ignored them) and is
 * required so a `$schema` editor hint round-trips untouched.
 */
const BaseUserConfigSchema = z
  .object({
    $schema: z.string().optional(),
    rootDir: z.string().optional(),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    failOn: z.enum(['error', 'warn', 'none']).optional(),
    threshold: z.int().min(0).max(100).optional(),
    preset: z
      .enum(['minimal', 'recommended', 'strict', 'all'], {
        error: "must be one of 'minimal', 'recommended', 'strict', 'all'",
      })
      .optional(),
    extends: z.array(z.string()).optional(),
    fixExcludes: z.array(z.string()).optional(),
    includeTestFiles: z.boolean().optional(),
    rules: RulesSchema.optional(),
  })
  .loose();

/**
 * The single source of truth for doctor config validation. Wraps the base
 * object in a `superRefine` that rejects any unknown rule id with a
 * `rules.<id>` path, so a typo'd rule surfaces as an `InvalidConfigError`
 * rather than silently doing nothing.
 */
export const DoctorUserConfigSchema = BaseUserConfigSchema.superRefine(
  (value, ctx) => {
    const rules = value.rules;
    if (!rules) return;
    const known = new Set(ruleIds);
    for (const key of Object.keys(rules)) {
      if (!known.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rules', key],
          message: `unknown rule id ${JSON.stringify(key)}`,
        });
      }
    }
  },
);

/** The inferred user-config type — the single source of truth for the shape. */
export type DoctorUserConfigInput = z.infer<typeof DoctorUserConfigSchema>;

/**
 * Generate the JSON Schema for the user config. Built from the base object
 * (not the refined wrapper) so `z.toJSONSchema` emits the full property set,
 * including every enumerated rule id. The result is what gets written to
 * `schema.json` and served from the docs site.
 */
export function buildJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(BaseUserConfigSchema) as Record<string, unknown>;
}
