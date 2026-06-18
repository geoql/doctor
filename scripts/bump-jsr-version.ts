import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const packages = [
  'packages/doctor-core',
  'packages/oxlint-plugin-vue-doctor',
  'packages/oxlint-plugin-nuxt-doctor',
  'packages/eslint-plugin-vue-doctor',
  'packages/eslint-plugin-nuxt-doctor',
  'packages/nuxt-doctor',
  'packages/vue-doctor',
];

for (const dir of packages) {
  const jsrPath = `${dir}/jsr.json`;
  if (!existsSync(jsrPath)) continue;
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf-8'));
  const jsr = JSON.parse(readFileSync(jsrPath, 'utf-8'));
  jsr.version = pkg.version;
  writeFileSync(jsrPath, `${JSON.stringify(jsr, null, 2)}\n`);
  console.log(`Synced ${jsrPath} to version ${jsr.version}`);
}
