export type Severity = 'error' | 'warn' | 'info';

export type RuleCategory =
  | 'ai-slop'
  | 'reactivity'
  | 'composition'
  | 'performance'
  | 'template'
  | 'template-perf'
  | 'build-quality'
  | 'deps'
  | 'dead-code'
  | 'sfc'
  | 'vue-builtin'
  | 'structure'
  | 'modules-deps'
  | 'nitro'
  | 'seo'
  | 'cloudflare'
  | 'server-routes'
  | 'hydration'
  | 'data-fetching';

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface AstNode {
  type: string;
  loc?: SourceLocation;
  [key: string]: unknown;
}

export interface Fix {
  range: [number, number];
  text: string;
  node?: AstNode;
}

export interface Fixer {
  replaceText: (node: AstNode, text: string) => Fix;
}

export type FixFn = (fixer: Fixer) => Fix;

export interface ReportDescriptor {
  node: AstNode;
  message: string;
  fix?: FixFn;
}

export interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  getFilename?: () => string | undefined;
  settings?: Record<string, unknown>;
  /** Capability tokens detected for the project (e.g. 'auto-imports:vue'). */
  capabilities?: Set<string>;
}

export type RuleVisitor = (node: AstNode) => void;

export interface RuleMeta {
  name?: string;
  fixable?: 'code' | 'whitespace';
}

export interface Rule {
  meta?: RuleMeta;
  create: (context: RuleContext) => Record<string, RuleVisitor>;
  fix?: (node: AstNode) => string | null;
}

export interface Plugin {
  meta: { name: string };
  rules: Record<string, Rule>;
}

export interface CoreRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly severity: Severity;
  readonly recommended: boolean;
  readonly meta?: RuleMeta;
  readonly create: (context: RuleContext) => Record<string, RuleVisitor>;
  readonly fix?: (node: AstNode) => string | null;
}
