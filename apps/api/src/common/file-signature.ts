/**
 * Content-based file type checks.
 *
 * `file.mimetype` from multer is whatever the client declared in the multipart
 * header — an attacker picks it freely, so an allowlist built on it alone only
 * stops honest mistakes. These checks read the leading bytes instead, which the
 * file actually has to contain.
 *
 * This is a type check, not malware scanning. It stops a renamed executable
 * from reaching a barangay official's machine labelled as a PDF; it cannot tell
 * a benign .docx from one carrying a hostile macro. That is why the legacy .doc
 * format is refused outright below.
 */

export type SafeUploadKind = 'pdf' | 'docx' | 'jpeg' | 'png' | 'webp';

const ZIP_MAGIC = [0x50, 0x4b]; // "PK" — docx is a zip container
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF" … "WEBP" at offset 8

const startsWith = (buf: Buffer, magic: number[]) =>
  buf.length >= magic.length && magic.every((b, i) => buf[i] === b);

/** The kind a buffer actually is, or null when it is none of them. */
export function detectKind(buf: Buffer): SafeUploadKind | null {
  if (startsWith(buf, PDF_MAGIC)) return 'pdf';
  if (startsWith(buf, PNG_MAGIC)) return 'png';
  if (startsWith(buf, JPEG_MAGIC)) return 'jpeg';
  if (startsWith(buf, RIFF_MAGIC) && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  // A .docx is a zip whose archive names the word/ directory. Checking for that
  // string keeps an arbitrary renamed .zip from passing as a document.
  if (startsWith(buf, ZIP_MAGIC) && buf.subarray(0, 4096).includes('word/')) return 'docx';
  return null;
}

export interface SignatureCheck {
  ok: boolean;
  kind: SafeUploadKind | null;
  /** Resident-facing explanation when ok is false. */
  reason?: string;
}

/**
 * Verify a buffer is one of `allowed`, by content rather than by declaration.
 * `declaredMime` is only used to spot a mismatch worth reporting.
 */
export function checkSignature(
  buf: Buffer,
  allowed: readonly SafeUploadKind[],
  declaredMime?: string,
): SignatureCheck {
  // The legacy Word format (OLE compound file, "D0 CF 11 E0") is where
  // auto-executing macros live, and it is indistinguishable from a macro-laden
  // .doc without parsing it. Name it explicitly so the resident knows to re-save.
  if (buf.length >= 8 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return {
      ok: false,
      kind: null,
      reason: 'Old Word (.doc) files are not accepted. Save it as .docx or PDF and upload again.',
    };
  }

  const kind = detectKind(buf);
  if (!kind) {
    return {
      ok: false,
      kind: null,
      reason: 'That file is not a PDF, Word document, or image. Please upload one of those.',
    };
  }
  if (!allowed.includes(kind)) {
    return {
      ok: false,
      kind,
      reason: `${kind.toUpperCase()} files are not accepted here.`,
    };
  }
  // Content wins, but a mismatch means the name or header lied — worth logging.
  if (declaredMime && !declaredMime.includes(kind === 'docx' ? 'word' : kind)) {
    return { ok: true, kind };
  }
  return { ok: true, kind };
}
