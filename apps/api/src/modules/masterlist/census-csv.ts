import { CensusCategory } from '@brgy/shared';

/**
 * Census CSV parsing + validation.
 *
 * Split out of masterlist.service so the whole file can be checked BEFORE any
 * row is written. A bad value used to reach MySQL and surface as a generic 500
 * ("Incorrect date value", "Data too long for column"), and in refresh mode it
 * aborted mid-import with earlier rows already committed. Now the file is
 * either wholly importable or wholly rejected with per-row reasons.
 */

/** One thing wrong with the uploaded file, addressed the way the user sees it. */
export interface CsvIssue {
  /** Spreadsheet line number — the header is line 1, so this matches Excel's gutter. */
  row: number;
  column: string;
  value: string;
  message: string;
}

/** A row that passed validation and is safe to write. */
export interface ValidRow {
  line: number;
  fullName: string;
  birthdate?: string;
  address: string;
  purok?: string;
  category: CensusCategory;
  lguEligibility?: string;
  householdCode?: string;
}

export interface CsvValidation {
  rows: ValidRow[];
  issues: CsvIssue[];
  /** Issues can be truncated for display; this is the true total. */
  totalIssues: number;
}

export class CsvFormatError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

export const CENSUS_COLUMNS = [
  'fullName',
  'birthdate',
  'address',
  'purok',
  'category',
  'lguEligibility',
  'householdCode',
] as const;

/**
 * Columns the app's own "Download CSV" emits that import accepts but ignores.
 * `registered` is derived (does a portal account exist?), so it can't be set
 * from a file — but rejecting it would break the export → edit → import
 * round-trip, which is the most common way staff build an import file.
 */
const IGNORED_COLUMNS = ['registered'] as const;

/** Column widths from census-record.entity / household.entity — checked here so
 *  an over-long cell is a row error instead of a driver-level 500. */
const MAX_LEN: Record<string, number> = {
  fullName: 120,
  address: 255,
  purok: 40,
  lguEligibility: 60,
  householdCode: 20,
};

/** Don't flood the response — the first N are enough to fix the file. */
const MAX_REPORTED_ISSUES = 50;

const CATEGORIES = Object.values(CensusCategory) as string[];

/** Small CSV parser with quoted-field support. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

type DateOrder = 'iso' | 'dmy' | 'mdy';

const SLASHED = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/;

/**
 * Work out what a slash-formatted birthdate column means by looking at the
 * WHOLE column rather than one cell.
 *
 * Opening our own CSV export in Excel or Sheets re-renders ISO dates as
 * `8/8/2004`, and saving puts that back on disk — so this is the normal path,
 * not an edge case. A single `11/23/1958` proves the column is month-first;
 * a single `23/11/1958` proves day-first. Only when no cell disambiguates do
 * we refuse, because guessing would silently shift birthdays and corrupt
 * senior-citizen eligibility.
 */
function detectDateOrder(values: string[]): { order?: DateOrder; problem?: { message: string; hint: string } } {
  let dayFirst = false;
  let monthFirst = false;
  let sawSlashed = false;
  let sawTwoDigitYear = false;

  for (const raw of values) {
    const m = SLASHED.exec(raw.trim());
    if (!m) continue;
    sawSlashed = true;
    if (m[3].length !== 4) sawTwoDigitYear = true;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) dayFirst = true;
    if (b > 12) monthFirst = true;
  }

  if (!sawSlashed) return { order: 'iso' };

  if (sawTwoDigitYear) {
    return {
      problem: {
        message: 'Some birthdates use a 2-digit year, so the century is unclear.',
        hint: 'Format the birthdate column as YYYY-MM-DD (e.g. 1960-04-03) and save again.',
      },
    };
  }
  if (dayFirst && monthFirst) {
    return {
      problem: {
        message: 'The birthdate column mixes day/month and month/day ordering, so it cannot be read safely.',
        hint: 'Format the whole column as YYYY-MM-DD (e.g. 1960-04-03) and save again.',
      },
    };
  }
  if (dayFirst) return { order: 'dmy' };
  if (monthFirst) return { order: 'mdy' };

  return {
    problem: {
      message: 'Birthdates like "3/4/1960" could mean March 4 or April 3 — every value in the column is ambiguous.',
      hint: 'Format the birthdate column as YYYY-MM-DD (e.g. 1960-04-03) and save again. In Excel/Sheets: select the column → Format → Number → Custom → yyyy-mm-dd.',
    },
  };
}

/**
 * Accept ISO `YYYY-MM-DD` (optionally with a trailing time, as Excel sometimes
 * writes), plus slash dates once `detectDateOrder` has established what the
 * column means.
 */
function normalizeBirthdate(raw: string, today: string, order: DateOrder): { value?: string; message?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  let y: string;
  let m: string;
  let d: string;

  const slashed = SLASHED.exec(trimmed);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed.replace(/[/.]/g, '-').split(/[ T]/)[0]);

  if (iso) {
    [, y, m, d] = iso;
  } else if (slashed && order !== 'iso') {
    y = slashed[3];
    [m, d] = order === 'mdy' ? [slashed[1], slashed[2]] : [slashed[2], slashed[1]];
  } else {
    return { message: 'Date must be YYYY-MM-DD (e.g. 1960-04-03), or left blank.' };
  }

  const value = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

  // Round-trip through Date to reject impossible days like 2021-02-30, which
  // MySQL would otherwise refuse with a bare "Incorrect date value".
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { message: `"${trimmed}" is not a real calendar date.` };
  }
  if (value > today) return { message: `Birthdate ${value} is in the future.` };
  if (Number(y) < 1900) return { message: `Birthdate ${value} is before 1900 — check for a typo.` };

  return { value };
}

/** Local (Asia/Manila) today as YYYY-MM-DD; UTC would reject "today" until 8am. */
function todayInManila(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Levenshtein distance, capped small — only used to suggest a header fix. */
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Reject a header with columns we don't recognise.
 *
 * A misspelled OPTIONAL column used to be silently ignored: `birthdat` meant
 * every birthdate was dropped and the import "succeeded" with the whole column
 * blank, quietly breaking senior-citizen eligibility. Refusing the file is the
 * only safe response — we cannot tell a typo from a column the operator
 * genuinely meant to omit.
 */
function checkHeader(header: string[]): void {
  const known = new Map<string, string>(
    [...CENSUS_COLUMNS, ...IGNORED_COLUMNS].map((c) => [c.toLowerCase(), c]),
  );
  const seen = new Map<string, number>();
  const unknown: string[] = [];

  header.forEach((raw, i) => {
    const name = raw.trim();
    if (!name) return; // trailing empty cells from a spreadsheet export
    const key = name.toLowerCase();
    if (!known.has(key)) {
      unknown.push(name);
      return;
    }
    const first = seen.get(key);
    if (first !== undefined) {
      throw new CsvFormatError(
        `The column "${known.get(key)}" appears twice (positions ${first + 1} and ${i + 1}).`,
        'Remove the duplicate column and upload again.',
      );
    }
    seen.set(key, i);
  });

  if (!unknown.length) return;

  const suggestions = unknown.map((name) => {
    const best = CENSUS_COLUMNS.map((c) => ({ c, d: editDistance(name.toLowerCase(), c.toLowerCase()) }))
      .filter(({ c, d }) => d <= 3 && !seen.has(c.toLowerCase()))
      .sort((a, b) => a.d - b.d)[0];
    return best ? `"${name}" — did you mean "${best.c}"?` : `"${name}" is not a census column.`;
  });

  throw new CsvFormatError(
    unknown.length === 1
      ? `Unrecognised column in the header: ${suggestions[0]}`
      : `Unrecognised columns in the header: ${suggestions.join(' ')}`,
    `Expected header: ${CENSUS_COLUMNS.join(', ')}`,
  );
}

/**
 * Parse and check the whole upload.
 *
 * Throws CsvFormatError for problems with the FILE (wrong type, missing
 * header) — there is nothing per-row to report in that case. Per-row problems
 * come back in `issues` so the caller can reject with all of them at once.
 */
export function validateCensusCsv(text: string): CsvValidation {
  // A .xlsx is a zip ("PK\x03\x04"); legacy .xls is an OLE container. Users
  // reach for the spreadsheet file far more often than the exported CSV.
  if (/^PK[\x03\x04]/.test(text) || text.startsWith('���')) {
    throw new CsvFormatError(
      'That looks like an Excel workbook, not a CSV file.',
      'In Excel choose File → Save As → CSV UTF-8 (Comma delimited), then upload the .csv.',
    );
  }
  if (!text.trim()) throw new CsvFormatError('The file is empty.');

  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  if (!firstLine.includes(',') && /[;\t]/.test(firstLine)) {
    const delimiter = firstLine.includes(';') ? 'semicolons' : 'tabs';
    throw new CsvFormatError(
      `The columns are separated by ${delimiter}, not commas.`,
      'Re-save as "CSV UTF-8 (Comma delimited)". Excel uses semicolons in some regional settings.',
    );
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new CsvFormatError(
      'The file needs a header row and at least one record.',
      `Header: ${CENSUS_COLUMNS.join(', ')}`,
    );
  }

  const header = rows[0].map((h) => h.trim().replace(/^﻿/, ''));
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iName = idx('fullName');
  if (iName === -1) {
    throw new CsvFormatError(
      'The file has no "fullName" column.',
      `Found: ${header.filter(Boolean).join(', ') || '(nothing)'}. Expected header: ${CENSUS_COLUMNS.join(', ')}`,
    );
  }

  checkHeader(header);

  const columnFor: Record<string, number> = {};
  CENSUS_COLUMNS.forEach((c) => {
    columnFor[c] = idx(c);
  });

  // Decide what the birthdate column means before checking any single row.
  const iBirth = columnFor['birthdate'];
  const detected = detectDateOrder(
    iBirth >= 0 ? rows.slice(1).map((r) => (r[iBirth] ?? '').trim()) : [],
  );
  if (detected.problem) throw new CsvFormatError(detected.problem.message, detected.problem.hint);
  const dateOrder = detected.order ?? 'iso';

  const today = todayInManila();
  const validRows: ValidRow[] = [];
  const issues: CsvIssue[] = [];
  let totalIssues = 0;
  // Same person twice in one file — the second copy would silently "skip",
  // which reads as data loss to whoever uploaded it.
  const seenInFile = new Map<string, number>();

  const addIssue = (issue: CsvIssue) => {
    totalIssues++;
    if (issues.length < MAX_REPORTED_ISSUES) issues.push(issue);
  };

  const cell = (row: string[], column: string): string => {
    const at = columnFor[column];
    return at >= 0 ? (row[at] ?? '').trim() : '';
  };

  rows.slice(1).forEach((row, i) => {
    const line = i + 2; // header is line 1
    const fullName = cell(row, 'fullName');
    if (!fullName) {
      // A trailing blank line is normal; a row with other data but no name is not.
      if (row.some((f) => f.trim())) {
        addIssue({ row: line, column: 'fullName', value: '', message: 'Name is required.' });
      }
      return;
    }

    let rowOk = true;
    for (const column of Object.keys(MAX_LEN)) {
      const value = cell(row, column);
      if (value.length > MAX_LEN[column]) {
        addIssue({
          row: line,
          column,
          value,
          message: `Too long — ${value.length} characters, limit is ${MAX_LEN[column]}.`,
        });
        rowOk = false;
      }
    }

    const birth = normalizeBirthdate(cell(row, 'birthdate'), today, dateOrder);
    if (birth.message) {
      addIssue({ row: line, column: 'birthdate', value: cell(row, 'birthdate'), message: birth.message });
      rowOk = false;
    }

    const categoryRaw = cell(row, 'category');
    let category = CensusCategory.REGULAR;
    if (categoryRaw) {
      const normalized = categoryRaw.toUpperCase().replace(/[\s-]+/g, '_');
      if (!CATEGORIES.includes(normalized)) {
        // Previously this fell back to REGULAR, so "SENOIR" imported a senior
        // as a regular resident with no warning at all.
        addIssue({
          row: line,
          column: 'category',
          value: categoryRaw,
          message: `Not a valid category. Use one of: ${CATEGORIES.join(', ')} (or leave blank for REGULAR).`,
        });
        rowOk = false;
      } else {
        category = normalized as CensusCategory;
      }
    }

    const key = `${fullName.toLowerCase()}|${birth.value ?? ''}`;
    const firstSeen = seenInFile.get(key);
    if (firstSeen) {
      addIssue({
        row: line,
        column: 'fullName',
        value: fullName,
        message: `Duplicate of line ${firstSeen} — same name and birthdate appear twice in this file.`,
      });
      rowOk = false;
    } else {
      seenInFile.set(key, line);
    }

    if (!rowOk) return;

    validRows.push({
      line,
      fullName,
      birthdate: birth.value,
      address: cell(row, 'address') || 'Barangay 591',
      purok: cell(row, 'purok') || undefined,
      category,
      lguEligibility: cell(row, 'lguEligibility') || undefined,
      householdCode: cell(row, 'householdCode') || undefined,
    });
  });

  if (!validRows.length && !issues.length) {
    throw new CsvFormatError(
      'The file has a header but no records.',
      `Add at least one row under: ${CENSUS_COLUMNS.join(', ')}`,
    );
  }

  return { rows: validRows, issues, totalIssues };
}
