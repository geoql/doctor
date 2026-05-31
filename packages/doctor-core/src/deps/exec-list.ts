import { execFile } from 'node:child_process';

interface PnpmListEntry {
  dependencies?: Record<string, { version: string }>;
  devDependencies?: Record<string, { version: string }>;
  peers?: Array<{ name: string; version: string }>;
}

function collectVersions(entry: PnpmListEntry, versions: Set<string>): void {
  if (entry.dependencies) {
    for (const [name, info] of Object.entries(entry.dependencies)) {
      if (name === 'vue' && info.version) {
        versions.add(info.version);
      }
    }
  }
  if (entry.devDependencies) {
    for (const [name, info] of Object.entries(entry.devDependencies)) {
      if (name === 'vue' && info.version) {
        versions.add(info.version);
      }
    }
  }
  if (entry.peers) {
    for (const peer of entry.peers) {
      if (peer.name === 'vue' && peer.version) {
        versions.add(peer.version);
      }
    }
  }
}

export async function runPnpmList(
  rootDir: string,
): Promise<
  { versions: string[]; error: null } | { versions: []; error: Error }
> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ versions: [], error: new Error('timeout') });
    }, 10_000);

    execFile(
      'pnpm',
      ['list', 'vue', '--depth', 'Infinity', '--json'],
      { cwd: rootDir, timeout: 10_000 },
      (error: Error | null, stdout: string, stderr: string) => {
        clearTimeout(timeout);
        if (error || stderr) {
          resolve({ versions: [], error: error ?? new Error(stderr) });
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as PnpmListEntry[];
          const versions = new Set<string>();
          for (const entry of parsed) {
            collectVersions(entry, versions);
          }
          resolve({ versions: [...versions], error: null });
        } catch {
          resolve({ versions: [], error: new Error('parse error') });
        }
      },
    );
  });
}

export async function runNpmList(
  rootDir: string,
): Promise<
  { versions: string[]; error: null } | { versions: []; error: Error }
> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ versions: [], error: new Error('timeout') });
    }, 10_000);

    execFile(
      'npm',
      ['ls', 'vue', '--all', '--json'],
      { cwd: rootDir, timeout: 10_000 },
      (error: Error | null, stdout: string, stderr: string) => {
        clearTimeout(timeout);
        if (error || stderr) {
          resolve({ versions: [], error: error ?? new Error(stderr) });
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as PnpmListEntry;
          const versions = new Set<string>();
          collectVersions(parsed, versions);
          resolve({ versions: [...versions], error: null });
        } catch {
          resolve({ versions: [], error: new Error('parse error') });
        }
      },
    );
  });
}
