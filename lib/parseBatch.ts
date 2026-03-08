export interface ParsedRow {
  rtoCode: string;
  rtoName: string;
}

export interface ParseError {
  line: number;
  raw: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
}

/**
 * Parses multiline textarea input into RTO rows.
 * Each non-blank line must be: rto_code, rto_name
 * Splits on the first comma only, trims whitespace, dedupes by rtoCode.
 */
export function parseBatchInput(input: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  const seen = new Set<string>();

  input.split("\n").forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();

    if (!trimmed) return; // skip blank lines

    const comma = trimmed.indexOf(",");
    if (comma === -1) {
      errors.push({
        line,
        raw: trimmed,
        message: "Missing comma — expected format: rto_code, rto_name",
      });
      return;
    }

    const rtoCode = trimmed.slice(0, comma).trim();
    const rtoName = trimmed.slice(comma + 1).trim();

    if (!rtoCode) {
      errors.push({ line, raw: trimmed, message: "RTO code is empty" });
      return;
    }
    if (!rtoName) {
      errors.push({ line, raw: trimmed, message: "RTO name is empty" });
      return;
    }

    if (seen.has(rtoCode)) return; // silently dedupe repeated codes
    seen.add(rtoCode);
    rows.push({ rtoCode, rtoName });
  });

  return { rows, errors };
}
