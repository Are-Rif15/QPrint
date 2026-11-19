/**
 * Builds the Express app.
 *
 * Kept separate from index.js so tests can import the app without binding a
 * port. In production the same process also serves the built React files.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { publicRouter } from './routes/public.js';
import { authRouter } from './auth/routes.js';
import { uploadsRouter } from './routes/uploads.js';
import { ordersRouter } from './routes/orders.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // We sit behind one local proxy in production (Cloudflare Tunnel). Trusting
  // exactly one hop makes req.ip reflect the real visitor for rate limiting.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Avoid forcing HTTPS on http://localhost during local testing.
          'upgrade-insecure-requests': config.isProduction ? [] : null,
          // PDF.js renders pages in a worker and may create blob: resources
          // for fonts/images while drawing the preview.
          'worker-src': ["'self'", 'blob:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:', 'blob:'],
        },
      },
    }),
  );

  // JSON bodies only, and small: file uploads use multipart in Milestone 2.
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/orders', ordersRouter);

  // Unknown /api routes should return JSON, never the React app.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Production: serve the built frontend from the same process/port.
  if (fs.existsSync(config.clientDistDir)) {
    app.use(express.static(config.clientDistDir, { index: false }));

    // Any other GET is a client-side route, so return the React entry point.
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(config.clientDistDir, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Central error handler. Log unexpected errors but show a friendly message.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'The request body is not valid JSON.' });
    }

    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  });

  return app;
}
