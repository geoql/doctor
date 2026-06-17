import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildJsonSchema } from '../../src/config/schema.js';

const coreSchemaPath = fileURLToPath(
  new URL('../../schema.json', import.meta.url),
);
const docsSchemaPath = fileURLToPath(
  new URL('../../../../apps/docs/public/schema.json', import.meta.url),
);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('schema.json sync', () => {
  it('packages/doctor-core/schema.json matches the generated schema', () => {
    expect(readJson(coreSchemaPath)).toEqual(buildJsonSchema());
  });

  it('apps/docs/public/schema.json matches the generated schema', () => {
    expect(readJson(docsSchemaPath)).toEqual(buildJsonSchema());
  });
});
