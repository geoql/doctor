import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildJsonSchema } from '../packages/doctor-core/dist/index.js';

const targets = [
  new URL('../packages/doctor-core/schema.json', import.meta.url),
  new URL('../apps/docs/public/schema.json', import.meta.url),
];

const json = `${JSON.stringify(buildJsonSchema(), null, 2)}\n`;

for (const target of targets) {
  const path = fileURLToPath(target);
  writeFileSync(path, json);
  console.log(`Wrote ${path}`);
}
