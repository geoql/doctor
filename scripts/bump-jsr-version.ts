import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const packages = readdirSync('packages')
  .map((name) => `packages/${name}`)
  .filter((dir) => readdirSync(dir).includes('jsr.json'));

for (const dir of packages) {
  const jsrPath = `${dir}/jsr.json`;
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf-8'));
  const jsr = JSON.parse(readFileSync(jsrPath, 'utf-8'));
  jsr.version = pkg.version;
  writeFileSync(jsrPath, `${JSON.stringify(jsr, null, 2)}\n`);
  console.log(`Synced ${jsrPath} to version ${jsr.version}`);
}
