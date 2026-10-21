import { api } from './client';

/**
 * Open a file in a new tab and fire the browser's print dialog for it.
 *
 * Two details make this work where the obvious approach does not:
 *
 *  1. The tab is opened **synchronously** inside the click handler. Opening it
 *     after `await` makes it a non-user-gesture popup, which browsers block.
 *     So the window is claimed first and filled once the bytes arrive.
 *
 *  2. The PDF is embedded as a same-origin blob in an iframe, then printed via
 *     `iframe.contentWindow.print()`. A cross-origin URL — such as a presigned
 *     object-store link — cannot be printed this way at all, which is why both
 *     print paths stream through the API.
 *
 * If the dialog is dismissed the document stays on screen, so staff can still
 * print manually. Nothing here assumes the dialog succeeded.
 */
async function openBlobAndPrint(win: Window, fetchBlob: () => Promise<Blob>, titleText: string) {
  const blob = await fetchBlob();
  const url = URL.createObjectURL(blob);

  win.document.open();
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${titleText}</title>
<style>
  html,body{margin:0;height:100%;background:#525659;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  iframe{border:0;width:100%;height:100%;display:block}
</style></head>
<body><iframe id="doc" src="${url}"></iframe>
<script>
  var f = document.getElementById('doc');
  f.onload = function () {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {
      /* Dialog refused (rare viewer quirk) — the document is still on screen
         and the user can print with Ctrl/Cmd+P. */
    }
  };
<\/script>
</body></html>`);
  win.document.close();

  // Revoke late: too early and the viewer loses the document mid-render.
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Claim the tab during the click, before any awaiting. */
export function openPrintWindow(): Window | null {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(
      '<!doctype html><title>Preparing…</title><body style="font:14px sans-serif;padding:24px;color:#444">Preparing document for printing…</body>',
    );
  }
  return win;
}

/** A student's uploaded file (Word is converted to PDF server-side). */
export async function printStudentFile(win: Window, requestId: string): Promise<void> {
  await openBlobAndPrint(
    win,
    async () => (await api.get<Blob>(`/requests/${requestId}/print-file`, { responseType: 'blob' })).data,
    'Print',
  );
}

/** A generated barangay certificate. */
export async function printDocument(win: Window, requestId: string): Promise<void> {
  await openBlobAndPrint(
    win,
    async () => (await api.get<Blob>(`/requests/${requestId}/document-file`, { responseType: 'blob' })).data,
    'Print',
  );
}
