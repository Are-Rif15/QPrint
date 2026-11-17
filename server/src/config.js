/**
 * Central configuration. Reads the single .env file at the repository root
 * once, so every module sees the same values.
 *
 * Only the server needs these. The frontend gets runtime values from the API.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverSrcDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(serverSrcDir, '..');

/** Absolute path to the repository root (the folder containing /client, /server). */
export const rootDir = path.resolve(serverDir, '..');

// Load .env from the repo root regardless of the current working directory.
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

/** Resolve a possibly-relative path from .env against the repo root. */
function pathFromRoot(value, fallback) {
  const candidate = value?.trim() || fallback;
  return path.isAbsolute(candidate) ? candidate : path.resolve(rootDir, candidate);
}

function numberFromEnv(name, fallback) {
  const parsed = Number.parseFloat(process.env[name] ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  port: Number.parseInt(process.env.PORT || '4000', 10),

  // Auth
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'qprint_token',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // keep in sync with JWT_EXPIRES_IN=7d

  // Storage
  databasePath: pathFromRoot(process.env.DATABASE_PATH, 'server/data/qprint.db'),
  storageDir: pathFromRoot(process.env.STORAGE_DIR, 'storage'),
  backupsDir: pathFromRoot(process.env.BACKUPS_DIR, 'backups'),
  clientDistDir: path.join(rootDir, 'client', 'dist'),

  // Owner account, used only by the init script.
  owner: {
    name: process.env.OWNER_NAME?.trim() || '',
    email: process.env.OWNER_EMAIL?.trim().toLowerCase() || '',
    password: process.env.OWNER_PASSWORD || '',
  },

  // Seed values. Once seeded, prices and settings live in the database.
  defaultPricesRm: {
    bw: numberFromEnv('DEFAULT_PRICE_BW_RM', 0.1),
    colour: numberFromEnv('DEFAULT_PRICE_COLOUR_RM', 0.5),
  },
  defaults: {
    shopOpen: true,
    operatingHoursText: 'Mon-Fri, 9:00-18:00',
    pickupLocation: 'Library lobby',
    maxUploadMb: 10,
  },
};

/**
 * Fail fast with a helpful message instead of a confusing crash later.
 * Called when the server starts (the init script does not need JWT_SECRET).
 */
export function assertServerConfig() {
  const problems = [];

  if (
    !config.jwtSecret ||
    config.jwtSecret.length < 32 ||
    config.jwtSecret === 'replace-with-a-long-random-string'
  ) {
    problems.push(
      'JWT_SECRET is missing or too short (needs at least 32 random characters).',
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Configuration problem:\n - ${problems.join('\n - ')}\n\n` +
        'Copy .env.example to .env and fill in the values.',
    );
  }
}
