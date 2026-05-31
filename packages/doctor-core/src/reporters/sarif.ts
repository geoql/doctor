import { RULE_REGISTRY } from '../rule-registry.js';
import type { Diagnostic, Severity } from '../types.js';
import type { ReporterInput } from './types.js';

const SARIF_SCHEMA =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json' as const;
const INFORMATION_URI = 'https://github.com/geoql/doctor';

type SarifLevel = 'error' | 'warning' | 'note';

interface SarifReportingDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: SarifLevel };
  properties: { category: string };
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: {
      startLine: number;
      startColumn: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}

interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifLog {
  $schema: typeof SARIF_SCHEMA;
  version: '2.1.0';
  runs: [
    {
      tool: {
        driver: {
          name: string;
          version: string;
          informationUri: string;
          rules: SarifReportingDescriptor[];
        };
      };
      results: SarifResult[];
    },
  ];
}

function toSarifLevel(severity: Severity): SarifLevel {
  if (severity === 'error') return 'error';
  if (severity === 'warn') return 'warning';
  return 'note';
}

function toRelativeUri(filePath: string, rootDirectory: string): string {
  const normalizedRoot = rootDirectory.endsWith('/')
    ? rootDirectory
    : `${rootDirectory}/`;
  if (filePath.startsWith(normalizedRoot)) {
    return filePath.slice(normalizedRoot.length);
  }
  return filePath;
}

function toSarifResult(diag: Diagnostic, rootDirectory: string): SarifResult {
  const region: SarifLocation['physicalLocation']['region'] = {
    startLine: diag.line,
    startColumn: diag.column,
  };
  if (diag.endLine !== undefined) region.endLine = diag.endLine;
  if (diag.endColumn !== undefined) region.endColumn = diag.endColumn;
  return {
    ruleId: diag.ruleId,
    level: toSarifLevel(diag.severity),
    message: { text: diag.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: toRelativeUri(diag.file, rootDirectory),
          },
          region,
        },
      },
    ],
  };
}

function collectRuleIds(diagnostics: Diagnostic[]): Set<string> {
  const ids = new Set<string>();
  for (const d of diagnostics) ids.add(d.ruleId);
  return ids;
}

function toRuleDescriptor(ruleId: string): SarifReportingDescriptor {
  const registered = RULE_REGISTRY.find((r) => r.id === ruleId);
  const severity: Severity = registered?.severity ?? 'warn';
  const category = registered?.category ?? 'doctor-owned';
  const name = ruleId.includes('/')
    ? ruleId.split('/').slice(1).join('/')
    : ruleId;
  return {
    id: ruleId,
    name,
    shortDescription: { text: ruleId },
    defaultConfiguration: { level: toSarifLevel(severity) },
    properties: { category },
  };
}

export function sarifReport(input: ReporterInput): string {
  const ids = collectRuleIds(input.diagnostics);
  const rules = [...ids].sort().map(toRuleDescriptor);
  const results = input.diagnostics.map((d) =>
    toSarifResult(d, input.rootDirectory),
  );
  const log: SarifLog = {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: input.toolName,
            version: input.toolVersion,
            informationUri: INFORMATION_URI,
            rules,
          },
        },
        results,
      },
    ],
  };
  return `${JSON.stringify(log, null, 2)}\n`;
}
