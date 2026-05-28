export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface AstNode {
  type: string;
  loc?: SourceLocation;
  [key: string]: unknown;
}

export interface ReportDescriptor {
  node: AstNode;
  message: string;
}

export interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  getFilename?: () => string | undefined;
  settings?: Record<string, unknown>;
}

export type RuleVisitor = (node: AstNode) => void;

export interface Rule {
  create: (context: RuleContext) => Record<string, RuleVisitor>;
}

export interface Plugin {
  meta: { name: string };
  rules: Record<string, Rule>;
}
