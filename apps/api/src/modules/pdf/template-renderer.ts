import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Fill {placeholder} tags in a .docx template with the given data. */
export function fillDocxTemplate(templateBytes: Buffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(templateBytes);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    // Unknown placeholders render as empty instead of throwing.
    nullGetter: () => '',
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}

/** Convert a .docx to PDF via the Gotenberg (LibreOffice) container. */
export async function convertDocxToPdf(gotenbergUrl: string, docx: Buffer): Promise<Buffer> {
  const form = new FormData();
  form.append('files', new Blob([new Uint8Array(docx)], { type: DOCX_MIME }), 'document.docx');
  const res = await fetch(`${gotenbergUrl.replace(/\/$/, '')}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Gotenberg conversion failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
