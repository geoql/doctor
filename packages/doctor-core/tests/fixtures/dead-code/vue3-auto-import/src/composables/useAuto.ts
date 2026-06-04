export function useAuto() {
  return 42;
}

// Type export that's auto-imported at build time (e.g. via
// unplugin-auto-import's `imports` field that exposes types alongside
// values). Knip must not flag it as `unused-type-export` even though no
// source file imports `AutoOptions` explicitly — build-time resolution
// makes it reachable. Regression guard for the #85 export-level edges
// (this case is separate from the function-export case because knip
// reports function exports and type exports under different rule ids).
export type AutoOptions = {
  enabled: boolean;
  label: string;
};
