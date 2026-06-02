# Nuxt Doctor Action

A composite GitHub Action that audits a Nuxt project with [`@geoql/nuxt-doctor`](https://www.npmjs.com/package/@geoql/nuxt-doctor). It reports a quality score, a findings count, and writes a SARIF report you can upload to GitHub Code Scanning.

The action installs `nuxt-doctor` globally with pnpm and runs the audit once to produce JSON (which drives the outputs and the pass/fail gate), then emits a SARIF report from the same arguments.

## Usage

```yaml
name: Nuxt Doctor

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write # required only for the optional SARIF upload

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Run Nuxt Doctor
        id: doctor
        uses: geoql/doctor/.github/actions/nuxt-doctor@main
        with:
          preset: recommended
          threshold: '80'
          fail-on: error
          diff: 'false'
          working-directory: '.'

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: doctor.sarif

      - name: Show results
        if: always()
        run: |
          echo "Score: ${{ steps.doctor.outputs.score }}"
          echo "Findings: ${{ steps.doctor.outputs.findings-count }}"
```

> The SARIF report is written to `doctor.sarif` and the JSON report to `doctor-report.json`, both relative to `working-directory`.

## Inputs

| Name                | Description                                                                    | Default       | Required |
| ------------------- | ------------------------------------------------------------------------------ | ------------- | -------- |
| `preset`            | Base rule preset: `minimal` \| `recommended` \| `strict` \| `all`.             | `recommended` | No       |
| `threshold`         | Minimum passing score (`0`-`100`). The job fails when the score is below this. | `0`           | No       |
| `fail-on`           | Exit non-zero on this severity or worse: `error` \| `warn` \| `none`.          | `error`       | No       |
| `diff`              | Only report findings in files changed vs `HEAD`. Set to `'true'` to enable.    | `'false'`     | No       |
| `working-directory` | Directory to run the audit in (the Nuxt project root).                         | `.`           | No       |

## Outputs

| Name             | Description                               |
| ---------------- | ----------------------------------------- |
| `score`          | The integer quality score (`0`-`100`).    |
| `findings-count` | The total number of diagnostics reported. |

## Notes

- The job fails when `nuxt-doctor` exits non-zero, which is governed by `fail-on` (severity gate) and `threshold` (score gate).
- The action does **not** run `actions/checkout`; the caller is responsible for providing the workspace.
- No secrets are required.
- When `diff: 'true'`, only files changed versus `HEAD` are reported. Make sure the checkout has enough history (e.g. `fetch-depth: 0`) for diff-based runs.
