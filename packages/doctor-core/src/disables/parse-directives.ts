export interface DirectiveRange {
  start: number;
  end: number;
  rules: string[];
}

export interface DirectiveLine {
  line: number;
  rules: string[];
}

export interface DirectiveSet {
  blocks: DirectiveRange[];
  nextLine: DirectiveLine[];
  sameLine: DirectiveLine[];
}

const DIRECTIVE =
  /doctor-(disable-next-line|disable-line|disable|enable)\b(.*)/;

function parseRuleList(raw: string): string[] {
  return raw
    .replace(/-->\s*$/, '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function parseDirectives(text: string): DirectiveSet {
  const blocks: DirectiveRange[] = [];
  const nextLine: DirectiveLine[] = [];
  const sameLine: DirectiveLine[] = [];

  const lines = text.split('\n');
  let open: { start: number; rules: string[] } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const match = DIRECTIVE.exec(lines[index]);
    if (!match) continue;

    const keyword = match[1];
    const rules = parseRuleList(match[2]);
    const lineNumber = index + 1;

    if (keyword === 'disable-next-line') {
      nextLine.push({ line: lineNumber + 1, rules });
    } else if (keyword === 'disable-line') {
      sameLine.push({ line: lineNumber, rules });
    } else if (keyword === 'disable') {
      if (!open) open = { start: lineNumber, rules };
    } else if (open) {
      blocks.push({ start: open.start, end: lineNumber, rules: open.rules });
      open = null;
    }
  }

  if (open) {
    blocks.push({ start: open.start, end: lines.length, rules: open.rules });
  }

  return { blocks, nextLine, sameLine };
}
