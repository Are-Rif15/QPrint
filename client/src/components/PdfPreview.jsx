/**
 * Renders one page of a PDF on a canvas using PDF.js.
 *
 * The PDF is our server-converted copy, fetched from the private preview URL.
 * When the student chooses black & white we add the CSS `grayscale` filter so
 * the preview matches what will be printed.
 */
import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ url, grayscale = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState('');

  // Load the document whenever the URL changes.
  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setPageNumber(1);
    setError('');

    // pdfjs-dist v6 only accepts an options object here; passing the URL
    // string directly fails with "expected either `data`, `range`, or `url`".
    const loadingTask = getDocument({ url });

    loadingTask.promise
      .then((document) => {
        if (!cancelled) setPdf(document);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[preview] Could not load PDF:', err);
          setError('Preview is not available for this file.');
        }
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  // Draw the selected page.
  useEffect(() => {
    if (!pdf) return undefined;

    let cancelled = false;
    let renderTask = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Fit the page to the container width (never upscale past 2x).
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || 320;
        const scale = Math.min((containerWidth - 16) / baseViewport.width, 2);
        const viewport = page.getViewport({ scale });

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvas,
          viewport,
          transform:
            outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });

        await renderTask.promise;
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          setError('Could not render this page.');
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber]);

  return (
    <div ref={containerRef} className="mt-3">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {error}
        </div>
      ) : (
        <>
          <div className="flex justify-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {pdf ? (
              <canvas
                ref={canvasRef}
                aria-label={`Preview of page ${pageNumber}`}
                className={grayscale ? 'grayscale' : ''}
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center text-xs text-slate-400">
                Loading preview…
              </div>
            )}
          </div>

          {pdf && pdf.numPages > 1 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                className="btn btn-secondary px-2.5 py-1.5 text-xs"
                onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                disabled={pageNumber <= 1}
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {pageNumber} of {pdf.numPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary px-2.5 py-1.5 text-xs"
                onClick={() => setPageNumber((page) => Math.min(pdf.numPages, page + 1))}
                disabled={pageNumber >= pdf.numPages}
              >
                Next
              </button>
            </div>
          )}

          <p className="mt-2 text-center text-[11px] text-slate-400">
            Converted PDF · shown {grayscale ? 'in greyscale' : 'in colour'}
          </p>
        </>
      )}
    </div>
  );
}
