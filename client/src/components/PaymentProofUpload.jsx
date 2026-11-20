import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

function extensionOf(filename) {
  return filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a payment screenshot or receipt.
 *
 * The file is validated again by the server (magic bytes, size, order status);
 * these checks only give instant feedback before the request is sent.
 */
export default function PaymentProofUpload({ token, maxUploadMb, onSubmitted }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Local thumbnail for images. Object URLs must be revoked to avoid leaks.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(event) {
    const selected = event.target.files?.[0];
    setError('');

    if (!selected) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_EXTENSIONS.includes(extensionOf(selected.name))) {
      setFile(null);
      event.target.value = '';
      setError('Choose a JPG, PNG or PDF file.');
      return;
    }

    if (selected.size > maxUploadMb * 1024 * 1024) {
      setFile(null);
      event.target.value = '';
      setError(`That file is larger than ${maxUploadMb} MB.`);
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('proof', file);

    try {
      const data = await api.upload(`/orders/${token}/payments`, formData);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onSubmitted(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label
        className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          uploading
            ? 'cursor-wait border-slate-200 bg-slate-50'
            : 'cursor-pointer border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFile}
          disabled={uploading}
        />
        <span className="text-sm font-semibold text-slate-800">
          {file ? 'Choose a different file' : 'Choose a screenshot or PDF'}
        </span>
        <span className="text-xs text-slate-500">
          JPG, PNG or PDF · up to {maxUploadMb} MB
        </span>
      </label>

      {file && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected payment proof"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500">
              PDF
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary mt-3 w-full"
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading proof…' : 'Submit payment proof'}
      </button>

      <p className="mt-2 text-center text-xs text-slate-500">
        The shop checks the proof manually. This page updates when the status changes.
      </p>
    </form>
  );
}
