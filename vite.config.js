import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

let buildVersion = process.env.VERCEL_GIT_COMMIT_SHA;
if (!buildVersion) {
  try { buildVersion = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { buildVersion = 'unknown'; }
}
export default defineConfig({ define: { __BUILD_VERSION__: JSON.stringify(buildVersion.slice(0, 12)) } });
