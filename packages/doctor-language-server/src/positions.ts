import type { Position, Range } from 'vscode-languageserver';

/**
 * doctor-core reports diagnostics with 1-indexed `line` / `column` (and an
 * optional 1-indexed `endLine` / `endColumn`), but LSP positions are
 * 0-indexed. These helpers convert between the two against the document text
 * so squiggles land exactly on the offending token.
 */

/** Converts a 1-indexed line/column pair to a 0-indexed LSP `Position`. */
export const toZeroBasedPosition = (
  line: number,
  column: number,
): Position => ({
  line: Math.max(0, (line || 1) - 1),
  character: Math.max(0, (column || 1) - 1),
});

/**
 * Builds an LSP `Range` from doctor-core's 1-indexed coordinates. When an
 * explicit `endLine` / `endColumn` is present it is used directly; otherwise
 * the range extends to the end of the start line (when document text is
 * known) so the squiggle is visible, falling back to a single-character span
 * when the text is unavailable.
 */
export const rangeFromLineColumn = (
  text: string | null,
  line: number,
  column: number,
  endLine?: number,
  endColumn?: number,
): Range => {
  const start = toZeroBasedPosition(line, column);

  if (endLine !== undefined && endColumn !== undefined) {
    return { start, end: toZeroBasedPosition(endLine, endColumn) };
  }

  if (text !== null) {
    const lines = text.split('\n');
    const lineText = lines[start.line] ?? '';
    const endCharacter = Math.max(
      start.character + 1,
      lineText.replace(/\r$/, '').length,
    );
    return { start, end: { line: start.line, character: endCharacter } };
  }

  return { start, end: { line: start.line, character: start.character + 1 } };
};

const isBefore = (first: Position, second: Position): boolean =>
  first.line < second.line ||
  (first.line === second.line && first.character < second.character);

/** Whether two ranges overlap (touching endpoints count as overlap). */
export const rangesOverlap = (first: Range, second: Range): boolean =>
  !isBefore(first.end, second.start) && !isBefore(second.end, first.start);
