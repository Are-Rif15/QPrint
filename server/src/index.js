/**
 * Server entry point.
 *
 * In development this only serves /api on port 4000; Vite serves the React app
 * on 5173 and proxies /api here. In production (after `npm run build`) the same
 * process serves both the API and the built frontend on one port.
 */
import { config, assertServerConfig } from './config.js';
import { db, assertDatabaseReady } from './db.js';
import { ensureStorageDirs } from './lib/storage.js';
import { createApp } from './app.js';
import fs from 'node:fs';

function start() {
  // Fail with actionable messages instead of a stack trace.
  assertServerConfig();
  assertDatabaseReady();
  ensureStorageDirs();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`\nQPrint API listening on http://localhost:${config.port}`);
    console.log(`Mode: ${config.env}`);
    console.log(
      fs.existsSync(config.clientDistDir)
        ? `Serving built frontend from ${config.clientDistDir}`
        : 'API only. Start the frontend with: npm run dev:client',
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${config.port} is already in use. Stop the other process or set PORT in .env.\n`,
      );
      process.exit(1);
    }
    throw err;
  });

  // Close cleanly so SQLite can checkpoint the WAL file.
  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  start();
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}
