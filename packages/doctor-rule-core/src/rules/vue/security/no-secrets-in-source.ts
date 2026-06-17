import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html';
const MESSAGE = `Hardcoded secret in source. Committed secrets leak in the client bundle and git history. Move it to an environment variable or a server-only runtime config. See ${DOCS_URL}`;

// High-signal secret token shapes. Conservative on purpose: each pattern is a
// well-known credential prefix/format, not a generic "looks long" heuristic.
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9-]{10,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{20,}\b/,
];

// Identifier names that strongly imply a secret. Paired with a long string
// literal value to avoid flagging env reads or short non-secret strings.
const SECRET_NAME =
  /^(api[-_]?secret|api[-_]?key|secret[-_]?key|private[-_]?key|access[-_]?token|auth[-_]?token|client[-_]?secret|password|passwd|jwt[-_]?secret)$/i;
const MIN_NAMED_SECRET_LENGTH = 8;

function stringValue(node: AstNode | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

function isHighSignalSecret(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

export const noSecretsInSource = defineRule({
  create(context: RuleContext) {
    const reported = new Set<AstNode>();

    function report(node: AstNode): void {
      if (reported.has(node)) return;
      reported.add(node);
      context.report({ node, message: MESSAGE });
    }

    function checkNamedAssignment(
      name: string | undefined,
      valueNode: AstNode | undefined,
    ): void {
      if (name === undefined || !SECRET_NAME.test(name)) return;
      if (!valueNode) return;
      const value = stringValue(valueNode);
      if (value === undefined || value.length < MIN_NAMED_SECRET_LENGTH) return;
      report(valueNode);
    }

    return {
      Literal(node: AstNode) {
        if (typeof node.value !== 'string') return;
        if (isHighSignalSecret(node.value)) report(node);
      },
      VariableDeclarator(node: AstNode) {
        const id = node.id as AstNode;
        if (id.type !== 'Identifier') return;
        checkNamedAssignment(
          id.name as string,
          node.init as AstNode | undefined,
        );
      },
      Property(node: AstNode) {
        const key = node.key as AstNode;
        const name =
          key.type === 'Identifier' ? (key.name as string) : stringValue(key);
        checkNamedAssignment(name, node.value as AstNode | undefined);
      },
    };
  },
});
