# `@geoql/doctor` docs

| Document               | Purpose                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`SPEC.md`](./SPEC.md) | **The single locked spec.** Goals, repo layout, CLI surface, output format, scoring (√-decay), config, full rule catalog, the hybrid multi-pass engine design (§10), phased rollout, and success criteria. |

> The former `ARCHITECTURE.md` was a 2026-05-28 alpha snapshot (3 packages, linear scoring, 2-level severity) that drifted from what shipped. Its one durable insight — the hybrid template/script multi-pass rationale — now lives in `SPEC.md` §10. `SPEC.md` is authoritative; the code migrates to the SPEC, never the reverse.

Issue tracker: [github.com/geoql/doctor/issues](https://github.com/geoql/doctor/issues).
