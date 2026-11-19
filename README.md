# QPrint

A small campus online printing service. Students upload documents, choose print
options, pay by QR, and collect the printed pages. The shop owner runs
everything from one laptop connected to an HP Smart Tank 520.

**Phase 1 / MVP.** Built milestone by milestone.

- **Milestone 1 (done):** project setup, database, owner login, route guard, home page
- **Milestone 2 (done):** file uploads, print options, live pricing, PDF preview
- Milestone 3: QR payment, order tracking, "my orders on this device"
- Milestone 4: owner dashboard, payments, settings
- Milestone 5: print queue and printer integration
- Milestone 6: cleanup jobs, backups, security hardening

## Tech stack

React + Vite + React Router + Tailwind CSS · Node.js + Express · SQLite
(better-sqlite3) · JWT in an httpOnly cookie · bcryptjs · npm workspaces.

Uploads use multer in memory, `pdf-lib` counts PDF pages, and `pdfjs-dist`
draws the preview in the browser. Word documents and photos are converted to
PDF with **LibreOffice** (headless), because the printer only accepts PDF.

No student accounts in Phase 1: students order as guests and track their order
with a long random link.

## Requirements

- Node.js **20.19+** (developed on Node 24)
- npm 10+
- **LibreOffice** for DOCX/JPG/PNG uploads (optional but needed for the full
  flow; PDF-only orders work without it). Install with:

  ```powershell
  winget install TheDocumentFoundation.LibreOffice
  ```

  or from <https://www.libreoffice.org/download/>. If it lives somewhere
  unusual, set `SOFFICE_PATH` in `.env` to the full path of `soffice.exe` and
  restart the server.
- Windows (the printer driver target), macOS/Linux also fine for development

## Project structure

```
client/                  React app (Vite, Tailwind)
  src/pages/             Home, NewOrder, OwnerLogin, OwnerDashboard, NotFound
  src/auth/              AuthProvider (session restore via /api/auth/me)
  src/components/        Layout, RequireOwner, ShopStatusBanner, PageLoader,
                         OrderItemCard, PdfPreview (lazy-loaded)
  src/lib/               money formatting, client-side phone check
server/
  src/schema.sql         Full Phase 1 database schema
  src/scripts/init-db.js Creates tables + seeds owner, prices, settings
  src/auth/              JWT, cookie, owner-only middleware, login routes
  src/business/          pricing and status rules (+ tests)
  src/routes/            public shop/pricing, uploads, orders
  src/lib/               money, storage, settings, filetype, phone, pdf,
                         office (LibreOffice conversion)
  src/tests/             node:test suites
server/data/qprint.db    SQLite database (gitignored)
storage/                 Uploaded documents / proofs / QR image (gitignored)
scripts/dev.js           Runs API + frontend together for development
```

## Setup

1. Install dependencies (installs both workspaces):

   ```powershell
   npm install
   ```

2. Create your environment file:

   ```powershell
   copy .env.example .env
   ```

   Then edit `.env`:
   - `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` - the single owner account
     (password must be at least 8 characters)
   - `JWT_SECRET` - generate one with:

     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

3. Create and seed the database:

   ```powershell
   npm run init:db
   ```

   This is idempotent. If you already have a database from Milestone 1, run it
   once more: it adds the new `uploads` table without touching existing rows.

   To change the owner password later, update `OWNER_PASSWORD` in `.env`, then
   run:

   ```powershell
   npm run init:db -- --reset-owner-password
   ```

4. Start development mode:

   ```powershell
   npm run dev
   ```

   - App: <http://localhost:5173>
   - API: <http://localhost:4000> (Vite proxies `/api` here)

5. Sign in at <http://localhost:5173/owner/login> with the values from `.env`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start API and Vite together |
| `npm run dev:server` | API only, restarts on file changes |
| `npm run dev:client` | Vite only |
| `npm run init:db` | Apply schema and seed owner / prices / settings |
| `npm test` | Run pricing, status, validation and schema tests |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the server; serves the built app too when `client/dist` exists |

## Production mode (single process, one port)

```powershell
npm run build
$env:NODE_ENV="production"   # turns on Secure cookies (HTTPS via Cloudflare Tunnel)
npm start
```

Open <http://localhost:4000>. The Express server serves the API and the built
React app from the same origin, so the auth cookie just works and no CORS
configuration is needed.

To expose it to students, point a Cloudflare Tunnel at `http://localhost:4000`
(details will be added in Milestone 6, together with Turnstile and rate limits).

## Verify Milestone 1

1. `npm run init:db` prints the database path and owner email.
2. `npm run dev`, open <http://localhost:5173>:
   - the open/closed banner comes from the `settings` table;
   - "Start an order" opens the order form from Milestone 2;
   - "Owner login" opens the login form.
3. Open <http://localhost:5173/owner> in a private window - you are redirected
   to the login page.
4. Sign in. Refresh: you stay signed in. Log out: the cookie is cleared.
5. Unauthenticated API check:

   ```powershell
   curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4000/api/auth/me
   # 401
   ```

6. `npm test` - all tests pass (Milestone 2 adds pricing, phone, file-type and
   PDF tests; 32 in total).

## Verify Milestone 2

1. `npm run init:db` (needed once for the new `uploads` table), then
   `npm run dev` and open <http://localhost:5173/order/new>.
2. Enter a name and a valid Malaysian phone number. The upload box unlocks
   only after both are valid.
3. Upload a PDF (or a DOCX/JPG/PNG if LibreOffice is installed):
   - the file appears with its **server-counted** page count and price;
   - wrong file contents (a PDF renamed to `.png`) are rejected with a clear
     message;
   - a file over `max_upload_mb` is rejected with 413.
4. Change copies, B&W/colour and quality: the estimate updates instantly.
5. Click **Preview**: the converted PDF renders in the page. B&W files are
   shown greyscale, colour files normally; multi-page files get Previous/Next.
6. Place the order. The success screen shows the server's final total. Prices
   sent by the browser are ignored: the server re-prices from its own page
   counts and the `price_config` table.
7. Close the shop first (owner settings in Milestone 4; for now update
   `settings.shop_open` to `false`) and confirm uploads and orders return 403.
8. `npm test` - 32 tests pass.

Useful API checks:

```powershell
# Upload a PDF
curl.exe -s -F "file=@C:\path\to\file.pdf;type=application/pdf" http://localhost:4000/api/uploads

# Preview it while it is still unclaimed (200, application/pdf)
curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4000/api/uploads/<token>/preview
```

After the order is created, the same preview URL returns **404**: claimed
uploads are never downloadable from order pages.

## Security notes (current state)

- Owner only: no registration endpoint; the account is seeded from `.env`.
- Passwords hashed with bcrypt (cost 12); login compares against a dummy hash
  for unknown emails to avoid timing leaks.
- JWT in an **httpOnly**, `SameSite=Lax` cookie; `Secure` in production.
- Login rate limit: 10 attempts per IP per 15 minutes.
- Helmet security headers; JSON-only API; parameterised SQL everywhere.
- Uploads are validated by **magic bytes**, not the filename or browser MIME
  type, and the extension must match. Files are stored under random UUID names
  with one file per request and a size limit from `settings.max_upload_mb`.
- `/storage` is outside the web root and is never served statically. Preview is
  the only file route and needs a random one-time token; it stops working as
  soon as the upload belongs to an order. Order/tracking pages never download
  files.
- Prices are recalculated on the server at order creation; client prices and
  page counts are ignored.
- `.env`, `storage/`, `backups/`, `server/data/` and build output are gitignored.

## Troubleshooting

- **"LibreOffice is not installed..." when uploading DOCX/JPG/PNG** - install
  LibreOffice (see Requirements) and restart the server. PDF uploads keep
  working meanwhile. If it is installed, set `SOFFICE_PATH` in `.env` to
  `soffice.exe` and restart.
- **Preview says "Preview is not available for this file."** - the upload token
  has expired, the file was already used in an order, or the file was deleted
  from `storage/`. Upload it again. A blocked `pdf.worker` request usually means
  a CSP/proxy problem: the app allows `worker-src blob:` already.
- **"The database ... is not initialised"** - run `npm run init:db`.
- **"JWT_SECRET is missing or too short"** - copy `.env.example` to `.env` and
  generate a long random secret (see Setup).
- **"Missing OWNER_... in .env"** - the init script needs all three owner values.
- **Port already in use** - stop the other process or change `PORT` in `.env`
  (also update the Vite proxy target in `client/vite.config.js`).
- **Forgot the owner password** - set a new `OWNER_PASSWORD` in `.env` and run
  `npm run init:db -- --reset-owner-password`.
- **Start over completely** - stop the server, delete `server/data/qprint.db*`,
  run `npm run init:db` again. This deletes all orders, so only do it during
  development.

## Privacy

Uploaded documents and payment proofs are used only for printing. They are
deleted automatically after collection (Milestone 6). Order history without
files is kept for the shop owner.
