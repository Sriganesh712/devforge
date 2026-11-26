export interface ParsedHeader {
  name: string;
  value: string;
}

export function parseHeaderLines(source: string): {
  headers: ParsedHeader[];
  errors: string[];
} {
  const headers: ParsedHeader[] = [];
  const errors: string[] = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) {
      errors.push(`Header line ${index + 1} needs the form "Name: value".`);
      continue;
    }
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      errors.push(`Header line ${index + 1} has an invalid name.`);
      continue;
    }
    headers.push({ name, value });
  }
  return { headers, errors };
}

export function redactHeaders(headers: ParsedHeader[]): ParsedHeader[] {
  return headers.map((header) =>
    /authorization|cookie|token|secret|api[-_]?key/i.test(header.name)
      ? { ...header, value: '[redacted]' }
      : header,
  );
}
