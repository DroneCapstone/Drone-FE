/** Exclude manufacturer identifiers from Admin presentation and fleet exports.
 * Internal resource IDs remain unchanged. Do not mutate API records or logs. */
export function isSerialField(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return /^(?:(?:manufacturer|physical|hardware|drone|battery|installedbattery|asset|device|old|new|previous|replacement))*serial(?:numbers?|nos?|numberlist|code|id|s)?$/.test(normalized);
}

export function adminResourceJson(value: unknown, space?: number): string {
  return JSON.stringify(value, (key, entry) => isSerialField(key) ? undefined : entry, space) ?? '';
}

/** CSV fields may contain commas, quotes, CRLF and embedded line breaks.
 * Preserve original field text and delimiters; only remove excluded columns. */
export function omitFleetSerialColumns(csv: string): string {
  const bom = csv.startsWith('\uFEFF') ? '\uFEFF' : '';
  const input = bom ? csv.slice(1) : csv;
  const rows: { fields: string[]; ending: string }[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      field += c;
      if (quoted && input[i + 1] === '"') { field += input[++i]; }
      else if (quoted || field === '"') quoted = !quoted;
      else throw new Error('Unexpected report format.');
    } else if (!quoted && c === ',') {
      fields.push(field); field = '';
    } else if (!quoted && (c === '\r' || c === '\n')) {
      fields.push(field); field = '';
      const ending = c === '\r' && input[i + 1] === '\n' ? c + input[++i] : c;
      rows.push({ fields, ending }); fields = [];
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error('Unexpected report format.');
  if (fields.length || field) rows.push({ fields: [...fields, field], ending: '' });
  if (!rows.length) throw new Error('Unexpected report format.');
  const header = rows[0].fields;
  const keep = header.map((key, index) => isSerialField(key.replace(/^"|"$/g, '').replace(/""/g, '"')) ? -1 : index).filter(index => index >= 0);
  if (keep.length === header.length) return csv;
  if (!keep.length) throw new Error('Unexpected report format.');
  return bom + rows.map(row => {
    if (row.fields.length === 1 && !row.fields[0]) return row.ending;
    if (row.fields.length !== header.length) throw new Error('Unexpected report format.');
    return keep.map(index => row.fields[index]).join(',') + row.ending;
  }).join('');
}
