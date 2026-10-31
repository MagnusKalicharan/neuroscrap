import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, 'neuronMath.test.ts');

const result = spawnSync(process.execPath, ['--experimental-strip-types', testFile], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 0);
