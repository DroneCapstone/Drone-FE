/**
 * Presentation-only English labels for Operator API data.
 *
 * Never use these results for API payloads, IDs, hub lookups, authorization,
 * mission planning, telemetry, or filtering on canonical backend values.
 * Vietnamese place names are romanized; administrative/address terms are
 * translated. Unknown narrative text is preserved rather than mistranslated.
 */
function romanize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').replace(/đ/g, 'd');
}

function looksLikeCode(value: string): boolean {
  return /^(?:HUB|MH|DRN|MSN|ORD|BAT)[-_][A-Z0-9_-]+$/i.test(value.trim());
}

const locationAliases: Readonly<Record<string, string>> = {
  'tp hcm': 'Ho Chi Minh City',
  'tp. hcm': 'Ho Chi Minh City',
  'tp.hcm': 'Ho Chi Minh City',
  'tphcm': 'Ho Chi Minh City',
  'tp ho chi minh': 'Ho Chi Minh City',
  'tp. ho chi minh': 'Ho Chi Minh City',
  'tp.ho chi minh': 'Ho Chi Minh City',
  'thanh pho ho chi minh': 'Ho Chi Minh City',
  'ho chi minh city': 'Ho Chi Minh City',
  'sai gon': 'Saigon',
  'saigon': 'Saigon',
  'hcmc': 'Ho Chi Minh City',
};

function formatAddressPart(raw: string): string {
  const value = romanize(raw).trim().replace(/\s+/g, ' ');
  const normalized = value.toLowerCase().replace(/\.$/, '');
  if (locationAliases[normalized]) return locationAliases[normalized];
  if (/^p\.?\s*\d+[a-z]?$/i.test(value)) return `Ward ${value.replace(/^p\.?\s*/i, '')}`;
  if (/^\d+[\w/.-]*\s+duong\s+(.+)$/i.test(value)) return value.replace(/^(\d+[\w/.-]*)\s+duong\s+(.+)$/i, '$1 $2 Street');
  if (/^q\.?\s*\d+[a-z]?$/i.test(value)) return `District ${value.replace(/^q\.?\s*/i, '')}`;
  if (/^tp\.?\s+/i.test(value)) return `${value.replace(/^tp\.?\s+/i, '')} City`;

  const rules: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^(?:duong|d\.)\s+(?:so\s+)?(.+)$/i, (m) => /^(?:so\s+)?\d/i.test(m[1]) ? `Street ${m[1].replace(/^so\s+/i, '')}` : `${m[1]} Street`],
    [/^(?:phuong|p\.?)\s+(.+)$/i, (m) => /^\d+$/.test(m[1]) ? `Ward ${m[1]}` : `${m[1]} Ward`],
    [/^(?:quan|q\.?)\s+(.+)$/i, (m) => /^\d+$/.test(m[1]) ? `District ${m[1]}` : `${m[1]} District`],
    [/^(?:huyen|h\.)\s+(.+)$/i, (m) => `${m[1]} District`],
    [/^(?:xa|x\.)\s+(.+)$/i, (m) => `${m[1]} Commune`],
    [/^thi\s+tran\s+(.+)$/i, (m) => `${m[1]} Town`],
    [/^thi\s+xa\s+(.+)$/i, (m) => `${m[1]} Town`],
    [/^thanh\s+pho\s+(.+)$/i, (m) => `${m[1]} City`],
    [/^(?:tinh)\s+(.+)$/i, (m) => `${m[1]} Province`],
    [/^khu\s+pho\s+(.+)$/i, (m) => `Quarter ${m[1]}`],
    [/^ap\s+(.+)$/i, (m) => `Hamlet ${m[1]}`],
    [/^(?:hem|ngo)\s+(.+)$/i, (m) => `Alley ${m[1]}`],
    [/^so\s+(\d+[\w/.-]*)\s+duong\s+(.+)$/i, (m) => `No. ${m[1]} ${m[2]} Street`],
    [/^so\s+(\d+.*)$/i, (m) => `No. ${m[1]}`],
    [/^toa\s+nha\s+(.+)$/i, (m) => `${m[1]} Building`],
  ];
  for (const [pattern, replace] of rules) {
    const match = value.match(pattern);
    if (match) return replace(match);
  }
  return value;
}

/** For addresses only: translate administrative units and romanize street/place names. */
export function formatAddress(value?: string | null): string {
  if (!value) return '';
  const parts = value.split(/([,;])/).map((part) => part === ',' || part === ';' ? part : formatAddressPart(part));
  // A bare house-number + road-name followed by administrative units is a street address.
  // Avoid inventing a street type for arbitrary unstructured location descriptions.
  if (parts.length >= 3 && /\b(?:phuong|quan|huyen|thanh pho|tp\.?|district|ward)\b/i.test(romanize(value))
      && /^\d+[\w/.-]*\s+[A-Za-z]/.test(parts[0])
      && !/\b(?:street|road|building|alley|lane|apartment)\b/i.test(parts[0])) {
    parts[0] += ' Street';
  }
  return parts.join('').replace(/\s+([,;])/g, '$1').replace(/([,;])(?=\S)/g, '$1 ');
}

/** Hub names use "Ben Thanh Hub"; codes like HUB-BENTHANH stay untouched. */
export function formatHubName(value?: string | null): string {
  if (!value) return '';
  const original = value.trim();
  if (looksLikeCode(original)) return original;
  const name = romanize(original).replace(/\s+/g, ' ');
  if (/^mini\s+hub\s+/i.test(name)) return `${locationAliases[name.replace(/^mini\s+hub\s+/i, '').toLowerCase()] ?? name.replace(/^mini\s+hub\s+/i, '')} Mini Hub`;
  if (/^hub\s+/i.test(name)) return `${locationAliases[name.replace(/^hub\s+/i, '').toLowerCase()] ?? name.replace(/^hub\s+/i, '')} Hub`;
  if (/^tram\s+/i.test(name)) return `${name.replace(/^tram\s+/i, '')} Station`;
  return locationAliases[name.toLowerCase()] ?? name;
}

/** Free-standing place names, including map labels, are not treated as statuses. */
export function formatLocationName(value?: string | null): string {
  if (!value) return '';
  const name = value.trim();
  if (looksLikeCode(name)) return name;
  const normalized = romanize(name).toLowerCase();
  if (normalized === 'buu dien trung tam sai gon') return 'Saigon Central Post Office';
  if (normalized === 'san bay tan son nhat') return 'Tan Son Nhat Airport';
  return formatHubName(name);
}

/** Format route captions from API, retaining stable route IDs and separators. */
export function formatRouteName(value?: string | null): string {
  if (!value) return '';
  return value.split(/(\s*(?:→|⇒|->|\s-\s)\s*)/).map((piece, index) =>
    index % 2 === 1 ? piece : formatLocationName(piece)).join('');
}

const labelMap: Readonly<Record<string, string>> = {
  'cho giao hang': 'Awaiting Drop-off',
  'cho nhan hang': 'Waiting for package',
  'cho hang': 'Waiting for package',
  'da nhan hang': 'Received',
  'da nhan tai hub': 'At Hub',
  'tai hub': 'At Hub',
  'dang giao': 'In Delivery',
  'dang giao hang': 'In Delivery',
  'da giao hang': 'Delivered',
  'da giao den hub': 'Delivered to Hub',
  'da huy': 'Cancelled',
  'huy': 'Cancelled',
  'cho xu ly': 'Pending',
  'dang xu ly': 'In Progress',
  'dang bay': 'Flying',
  'da hoan thanh': 'Completed',
  'hoan thanh': 'Completed',
  'that bai': 'Failed',
  'da len ke hoach': 'Planned',
  'cho lap ke hoach': 'Waiting for planning',
  'san sang lap ke hoach': 'Ready for Planning',
  'can lap ke hoach lai': 'Needs Replanning',
  'can lap ke hoach': 'Ready for Planning',
  'sap dien ra': 'Scheduled',
  'da len lich': 'Scheduled',
  'tre': 'Delayed',
  'dung gio': 'On Time',
  'san sang': 'Ready',
  'co san': 'Available',
  'khong kha dung': 'Unavailable',
  'dang sac': 'Charging',
  'dang su dung': 'In Use',
  'bao tri': 'Maintenance',
  'can chu y': 'Attention',
  'nguy hiem': 'Critical',
  'binh thuong': 'Normal',
  'khong xac dinh': 'Unknown',
  'tai lieu': 'Documents',
  'giay to': 'Documents',
  'thuc pham': 'Food',
  'do an': 'Food',
  'hang de vo': 'Fragile',
  'de vo': 'Fragile',
  'hang hoa': 'Goods',
  'thuoc': 'Medicine',
  'my pham': 'Cosmetics',
  'qua tang': 'Gifts',
  'do dien tu': 'Electronics',
  'do gia dung': 'Household goods',
  'van phong pham': 'Stationery',
  'linh kien': 'Spare parts',
  'pin': 'Battery',
  'chua thanh toan': 'Unpaid',
  'da thanh toan': 'Paid',
  'dang cho': 'Pending',
  'cho xac nhan': 'Awaiting confirmation',
  'dang thuc hien': 'In Progress',
  'da nhan tai diem gui': 'Received at Drop-off Point',
  'da den hub': 'At Hub',
  'khong thanh cong': 'Failed',
  'hang tieu chuan': 'Standard',
  'chuyen phat nhanh': 'Express',
  'giao hang nhanh': 'Express',
  'giao hang thuong': 'Normal',
  'khong du pin': 'Insufficient battery',
  'khong du nang luong': 'Insufficient energy',
  'khong du tai trong': 'Insufficient payload capacity',
  'pin khong tuong thich': 'Incompatible battery',
  'loi he thong': 'System error',
};

/** Known BE statuses/types; unknown descriptions remain original for accuracy. */
export function formatBackendLabel(value?: string | null): string {
  if (!value) return '';
  const compact = value.trim().replace(/\s+/g, ' ');
  return labelMap[romanize(compact).toLowerCase()] ?? compact;
}

/** Search remains accent-insensitive without changing the API/filter identity. */
export function matchesEnglishSearch(value: string, term: string): boolean {
  return romanize(value).toLowerCase().includes(romanize(term.trim()).toLowerCase());
}
