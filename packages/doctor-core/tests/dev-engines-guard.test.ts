import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Invariant: the CI Node line must satisfy the root `devEngines.runtime` floor.
//
// npm enforces `devEngines` on publish. When the floor is above what the
// release runner provides, EVERY package in the release fails with
// `EBADDEVENGINES Invalid semver version ">=X" does not match "vY"` — that is
// exactly how the 1.8.2 / 1.7.2 publish died: taze had synced
// `devEngines.runtime` to the maintainer's local Node (26.8.2) while
// `.nvmrc` (which every workflow feeds to actions/setup-node) pins the 24 line.
//
// The floor still has to clear one real bar: vite-plus declares its native
// binding as an optional dependency with engines
// `^20.19.0 || ^22.18.0 || >=24.11.0`, and pnpm compares that against the
// DECLARED floor. Declare anything lower and pnpm silently skips linking the
// binding, so `vp lint/fmt/build` crash with MODULE_NOT_FOUND.
//
// SEMANTICS: `.nvmrc` is resolved by nvm and actions/setup-node to the NEWEST
// release of whatever it pins, so `24` means "latest 24.x" (24.20.0 on the
// runners), NOT 24.0.0. This test therefore only compares the components
// `.nvmrc` actually pins: a major-only pin is checked against the floor's
// major, a fully pinned version is checked exactly.
//
// After any taze run, re-check this pairing before committing.
const repoRoot = join(import.meta.dirname, '..', '..', '..');

interface PinnedVersion {
  parts: number[];
  /** How many components .nvmrc pins: 1 = major only, 3 = major.minor.patch. */
  pinned: number;
}

function parsePin(value: string): PinnedVersion | null {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value.trim());
  if (!match) return null;
  const parts = [
    Number(match[1]),
    Number(match[2] ?? 0),
    Number(match[3] ?? 0),
  ];
  let pinned = 1;
  if (match[2] !== undefined) pinned = 2;
  if (match[3] !== undefined) pinned = 3;
  return { parts, pinned };
}

function parseFloor(value: string): number[] | null {
  const match = /^>=v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/**
 * True when the version `.nvmrc` resolves to can be proven to satisfy `floor`.
 * Only the components `.nvmrc` pins take part, because the unpinned tail
 * resolves to the newest available release.
 */
function satisfies(pin: PinnedVersion, floor: number[]): boolean {
  for (let i = 0; i < pin.pinned; i += 1) {
    const pinnedValue = pin.parts[i] ?? 0;
    const floorValue = floor[i] ?? 0;
    if (pinnedValue > floorValue) return true;
    if (pinnedValue < floorValue) return false;
  }
  // Every pinned component equals the floor's, so the resolved version is at
  // least the floor (the unpinned tail only ever moves upward).
  return true;
}

const rootPkg = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
) as {
  devEngines?: { runtime?: { name?: string; version?: string } };
};

const devEngines = rootPkg.devEngines?.runtime;
const nvmrc = readFileSync(join(repoRoot, '.nvmrc'), 'utf8').trim();

describe('devEngines runtime vs .nvmrc', () => {
  it('root declares a node devEngines runtime floor', () => {
    expect(devEngines?.name).toBe('node');
    expect(typeof devEngines?.version).toBe('string');
  });

  it('the floor is a >= range', () => {
    // A caret/tilde/exact floor needs different satisfaction maths; fail loudly
    // rather than let an unhandled operator silently pass the check.
    expect((devEngines?.version ?? '').startsWith('>=')).toBe(true);
  });

  it('.nvmrc pins at least a major version', () => {
    expect(parsePin(nvmrc)).not.toBeNull();
  });

  it('the .nvmrc line satisfies devEngines.runtime', () => {
    const pin = parsePin(nvmrc);
    const floor = parseFloor(devEngines?.version ?? '');
    expect(floor).not.toBeNull();
    expect(pin).not.toBeNull();
    expect(satisfies(pin as PinnedVersion, floor as number[])).toBe(true);
  });

  it('the .nvmrc line clears the vite-plus native binding floor', () => {
    // vite-plus needs the DECLARED floor to clear this or pnpm skips linking
    // its binding entirely (the original reason engines is >=24.11.0).
    const pin = parsePin(nvmrc);
    expect(pin).not.toBeNull();
    expect(satisfies(pin as PinnedVersion, [24, 11, 0])).toBe(true);
  });
});
