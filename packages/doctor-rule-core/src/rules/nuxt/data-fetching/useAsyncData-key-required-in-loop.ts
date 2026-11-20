import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `useAsyncData without an explicit key inside a loop gives every iteration the same auto-generated key, causing duplicate requests and cache collisions. Pass a unique key as the first argument. See ${DOCS_URL}`;
const CONSTANT_KEY_MESSAGE = `useAsyncData key inside a loop does not change between iterations, so every iteration shares one cache entry and the last one wins. Derive the key from the loop variable, e.g. useAsyncData(\`user-\${id}\`, ...). See ${DOCS_URL}`;

const FETCH_SHARED_KEY_MESSAGE = `useFetch inside a loop with a URL and options that do not change between iterations gets one automatic key (built from the call site, URL, method, baseURL, query and body), so every iteration shares one cache entry. Make the URL, a key-relevant option, or an explicit key option depend on the loop variable. See https://nuxt.com/docs/4.x/api/composables/use-fetch`;

const DATA_FETCHERS = new Set(['useAsyncData', 'useFetch']);
// useFetch options that feed its automatic key (nuxt fetch.ts
// generateOptionSegments). params is counted too: older 4.x releases
// treated it as an alias of query.
const FETCH_KEY_OPTIONS = new Set([
  'method',
  'baseURL',
  'query',
  'params',
  'body',
]);

// One frame per enclosing loop. `names` are the bindings that change on
// every iteration; an `open` frame (while, or a loop with no binding we
// can see) accepts any key that reads a variable.
type LoopFrame = { names: Set<string>; open: boolean };

function isMapCall(node: AstNode): boolean {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name === 'map';
  if (callee?.type === 'MemberExpression') {
    const prop = (callee as AstNode & { property?: AstNode }).property as
      | AstNode
      | undefined;
    return (
      prop?.type === 'Identifier' &&
      (prop as AstNode & { name: string }).name === 'map'
    );
  }
  return false;
}

function isFunction(node: AstNode | undefined): boolean {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
}

function collectNames(node: AstNode | null | undefined, out: Set<string>) {
  if (!node) return;
  if (node.type === 'Identifier') {
    out.add(node.name as string);
  } else if (node.type === 'VariableDeclaration') {
    for (const d of node.declarations as AstNode[]) collectNames(d.id, out);
  } else if (node.type === 'ObjectPattern') {
    for (const p of node.properties as AstNode[]) {
      collectNames(p.type === 'RestElement' ? p.argument : p.value, out);
    }
  } else if (node.type === 'ArrayPattern') {
    for (const e of node.elements as (AstNode | null)[]) collectNames(e, out);
  } else if (node.type === 'AssignmentPattern') {
    collectNames(node.left, out);
  } else if (node.type === 'RestElement') {
    collectNames(node.argument, out);
  }
}

function frameFor(names: Set<string>): LoopFrame {
  return { names, open: names.size === 0 };
}

// Whether `expr` reads a name that passes `test`. Shapes the rule does not
// model count as reading one, so the rule never flags what it cannot prove.
function reads(expr: AstNode, test: (name: string) => boolean): boolean {
  switch (expr.type) {
    case 'Identifier':
      return test(expr.name as string);
    case 'Literal':
      return false;
    case 'TemplateLiteral':
      return (expr.expressions as AstNode[]).some((e) => reads(e, test));
    case 'BinaryExpression':
      return reads(expr.left, test) || reads(expr.right, test);
    case 'CallExpression':
      return (
        reads(expr.callee, test) ||
        (expr.arguments as AstNode[]).some((a) => reads(a, test))
      );
    case 'MemberExpression':
      return (
        reads(expr.object, test) ||
        (expr.computed === true && reads(expr.property, test))
      );
    default:
      return true;
  }
}

function changesPerIteration(expr: AstNode, frame: LoopFrame): boolean {
  return frame.open
    ? reads(expr, () => true)
    : reads(expr, (name) => frame.names.has(name));
}

function optionName(prop: AstNode): string | null {
  if (prop.computed === true) return null;
  const key = prop.key as AstNode;
  return key.type === 'Identifier'
    ? (key.name as string)
    : String(key.value as string);
}

// Whether useFetch(url, options) gets a different key on each iteration.
function fetchKeyChanges(args: AstNode[], frame: LoopFrame): boolean {
  const [url, options] = args;
  if (options?.type !== 'ObjectExpression') {
    return (
      changesPerIteration(url, frame) ||
      (options !== undefined && changesPerIteration(options, frame))
    );
  }
  const props = options.properties as AstNode[];
  const explicitKey = props.find(
    (p) => p.type === 'Property' && optionName(p) === 'key',
  );
  if (explicitKey) return changesPerIteration(explicitKey.value, frame);
  if (changesPerIteration(url, frame)) return true;
  return props.some((p) => {
    if (p.type !== 'Property') return changesPerIteration(p.argument, frame);
    const name = optionName(p);
    // A computed option name could be anything, including `key`.
    if (name === null) return true;
    return FETCH_KEY_OPTIONS.has(name) && changesPerIteration(p.value, frame);
  });
}

export const useAsyncDataKeyRequiredInLoop = defineRule({
  create(context: RuleContext) {
    const frames: LoopFrame[] = [];
    const exit = () => {
      frames.pop();
    };

    return {
      ForStatement(node: AstNode) {
        const names = new Set<string>();
        collectNames(node.init, names);
        frames.push(frameFor(names));
      },
      'ForStatement:exit': exit,
      ForOfStatement(node: AstNode) {
        const names = new Set<string>();
        collectNames(node.left, names);
        frames.push(frameFor(names));
      },
      'ForOfStatement:exit': exit,
      ForInStatement(node: AstNode) {
        const names = new Set<string>();
        collectNames(node.left, names);
        frames.push(frameFor(names));
      },
      'ForInStatement:exit': exit,
      WhileStatement() {
        frames.push(frameFor(new Set()));
      },
      'WhileStatement:exit': exit,
      VariableDeclarator(node: AstNode) {
        const frame = frames.at(-1);
        if (!frame || frame.open || !node.init) return;
        // A const derived from the loop variable changes per iteration too.
        if (changesPerIteration(node.init, frame)) {
          collectNames(node.id, frame.names);
        }
      },
      CallExpression(node: AstNode) {
        if (isMapCall(node)) {
          const callback = (node.arguments as AstNode[])[0];
          const names = new Set<string>();
          if (isFunction(callback)) {
            for (const p of callback.params as AstNode[])
              collectNames(p, names);
          }
          frames.push(frameFor(names));
          return;
        }
        const frame = frames.at(-1);
        if (!frame) return;
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if (!DATA_FETCHERS.has(callee.name as string)) return;
        const args = node.arguments as AstNode[];
        if (args.length === 0) return;
        const firstArg = args[0];
        const isStringLiteral =
          firstArg.type === 'Literal' && typeof firstArg.value === 'string';
        if (callee.name === 'useFetch') {
          if (!fetchKeyChanges(args, frame)) {
            context.report({ node, message: FETCH_SHARED_KEY_MESSAGE });
          }
          return;
        }
        // useAsyncData(key, handler) or a legacy string-only key.
        const hasKey = isStringLiteral || isFunction(args[1]);
        if (!hasKey) {
          context.report({ node, message: MESSAGE });
          return;
        }
        if (!changesPerIteration(firstArg, frame)) {
          context.report({ node, message: CONSTANT_KEY_MESSAGE });
        }
      },
      'CallExpression:exit'(node: AstNode) {
        if (isMapCall(node)) exit();
      },
    };
  },
});
