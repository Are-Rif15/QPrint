/**
 * Development helper: runs the API server and the Vite dev server together.
 *
 * We avoid extra tools like `concurrently` by spawning two child processes
 * ourselves. Output from both is printed to the same terminal.
 *
 * Usage: npm run dev
 */
import { spawn } from 'node:child_process';

const commands = [
  { label: 'server', args: ['run', 'dev:server'] },
  { label: 'client', args: ['run', 'dev:client'] },
];

// When started through `npm run dev`, npm tells us where its own CLI file is.
// Running `node <npm-cli.js> run <script>` avoids using a shell (and the
// "shell: true" deprecation warning on Windows).
const npmCli = process.env.npm_execpath;

const children = commands.map(({ label, args }) => {
  const child = npmCli
    ? spawn(process.execPath, [npmCli, ...args], { stdio: 'inherit' })
    : spawn('npm', args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

  child.on('exit', (code, signal) => {
    if (signal) return;
    console.log(`[dev] ${label} exited with code ${code}`);
    shutdown(code ?? 0);
  });

  return child;
});

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
