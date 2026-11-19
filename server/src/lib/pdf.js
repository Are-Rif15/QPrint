/**
 * PDF helpers.
 */
import { PDFDocument } from 'pdf-lib';

/**
 * Count the pages in a PDF.
 * Throws for password-protected or damaged files; callers turn that into a
 * friendly 422 response.
 */
export async function countPdfPages(pdfBytes) {
  const document = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const pageCount = document.getPageCount();

  if (pageCount < 1) {
    throw new Error('The PDF contains no pages.');
  }

  return pageCount;
}
