import { z } from 'zod';
import { RULE_REGISTRY, RULE_TAGS } from '../rule-registry.js';

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

const RuleTagSchema = z.enum(RULE_TAGS);

/** A per-glob rule suppression inside `ignore.overrides`. */
export const IgnoreOverrideSchema = z.object({
  files: z.array(z.string()).min(1),
  rules: z.array(z.string()).optional(),
});

/**
 * Post-lint ignore controls (react.doctor parity). `rules` drops a rule's
 * findings (the rule still runs), `files` excludes globs from the scan,
 * `tags` turns off every rule carrying the tag (an explicit `rules` level
 * wins), and `overrides` drops findings for matching files — every rule, or
 * just the listed ones.
 */
export const IgnoreSchema = z.object({
  rules: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  tags: z.array(RuleTagSchema).optional(),
  overrides: z.array(IgnoreOverrideSchema).optional(),
});

/**
 * Visibility controls for one output surface. Includes win over excludes;
 * they never change a rule's severity or whether it runs.
 */
export const SurfaceControlsSchema = z.object({
  includeRules: z.array(z.string()).optional(),
  excludeRules: z.array(z.string()).optional(),
  includeTags: z.array(RuleTagSchema).optional(),
  excludeTags: z.array(RuleTagSchema).optional(),
  includeCategories: z.array(z.string()).optional(),
  excludeCategories: z.array(z.string()).optional(),
});

/**
 * Per-surface visibility: `cli` (printed/JSON report), `score` (counted in
 * the score), `prComment` (the `--pr-comment` body), `ciGate` (counted by
 * the `--fail-on` exit-code gate).
 */
export const SurfacesSchema = z.object({
  cli: SurfaceControlsSchema.optional(),
  score: SurfaceControlsSchema.optional(),
  prComment: SurfaceControlsSchema.optional(),
  ciGate: SurfaceControlsSchema.optional(),
});

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
    scope: z
      .enum(['full', 'files', 'changed', 'lines', 'contextual'], {
        error:
          "must be one of 'full', 'files', 'changed', 'lines', 'contextual'",
      })
      .optional(),
    base: z.string().min(1).optional(),
    rules: RulesSchema.optional(),
    ignore: IgnoreSchema.optional(),
    surfaces: SurfacesSchema.optional(),
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
    const known = new Set(ruleIds);
    const check = (
      ids: readonly string[] | undefined,
      path: (string | number)[],
    ): void => {
      ids?.forEach((id, index) => {
        if (!known.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, index],
            message: `unknown rule id ${JSON.stringify(id)}`,
          });
        }
      });
    };
    for (const key of Object.keys(value.rules ?? {})) {
      if (!known.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rules', key],
          message: `unknown rule id ${JSON.stringify(key)}`,
        });
      }
    }
    check(value.ignore?.rules, ['ignore', 'rules']);
    value.ignore?.overrides?.forEach((override, index) => {
      check(override.rules, ['ignore', 'overrides', index, 'rules']);
    });
    for (const [surface, controls] of Object.entries(value.surfaces ?? {})) {
      check(controls?.includeRules, ['surfaces', surface, 'includeRules']);
      check(controls?.excludeRules, ['surfaces', surface, 'excludeRules']);
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
