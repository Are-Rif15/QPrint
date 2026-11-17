import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ShopStatusBanner from '../components/ShopStatusBanner.jsx';

const steps = [
  {
    title: 'Upload your files',
    text: 'PDF, Word documents or photos of your notes.',
  },
  {
    title: 'Choose print options',
    text: 'Copies, black & white or colour, and quality.',
  },
  {
    title: 'Pay, then collect',
    text: 'Scan the payment QR and pick up your pages on campus.',
  },
];

/**
 * Public landing page.
 *
 * In Milestone 1 the ordering flow does not exist yet, so the call-to-action
 * buttons are disabled placeholders. Milestone 2 replaces them.
 */
export default function Home() {
  const [shop, setShop] = useState(null);
  const [shopError, setShopError] = useState(null);

  useEffect(() => {
    let active = true;

    api
      .get('/public/shop')
      .then((data) => {
        if (active) setShop(data);
      })
      .catch((err) => {
        if (active) setShopError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <ShopStatusBanner shop={shop} error={shopError} />

      <section className="card">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Campus printing
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          Print from your phone.
          <br />
          Pick up on campus.
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Upload your document, choose your options and pay by QR. We print it and
          have it ready for you to collect.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-primary" disabled>
            Start an order
          </button>
          <button type="button" className="btn btn-secondary" disabled>
            My orders on this device
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Ordering and payment are being built in the next milestones.
        </p>
      </section>

      <section>
        <h2 className="section-title mb-3">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="card">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Good to know</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            All printing is on A4 paper. Black &amp; white and colour are priced per page.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Documents and payment proofs are used only for printing and are deleted
            after collection.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            No account needed. We give you a private order link to check progress.
          </li>
        </ul>
      </section>

      <section className="card flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Shop owner?</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Sign in to manage orders, payments and the print queue.
          </p>
        </div>
        <Link to="/owner/login" className="btn btn-secondary shrink-0">
          Owner login
        </Link>
      </section>
    </div>
  );
}
