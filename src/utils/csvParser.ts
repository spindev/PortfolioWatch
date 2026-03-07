import { PurchaseLot } from '../types';

/** One executed buy order parsed from a broker CSV row */
export interface CsvLot extends PurchaseLot {
  isin: string;
  wkn: string;
}

/**
 * Parse a broker CSV export with the following tab-separated columns:
 *   ISIN | WKN | Anzahl | Anzahl storniert | Status | Orderart | Limit | Stop |
 *   Erstellt Datum | Erstellt Zeit | Gültig bis | Richtung | Wert | Wert storniert |
 *   Mindermengenzuschlag | Ausführung Datum | Ausführung Zeit | Ausführung Kurs |
 *   Anzahl ausgeführt | Anzahl offen | Gestrichen Datum | Gestrichen Zeit
 *
 * Only rows where Status = "ausgeführt" AND Richtung = "Kauf" are returned.
 */
export function parseBrokerCsv(text: string): CsvLot[] {
  // Strip UTF-8 BOM and normalise line endings
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split('\t').map((h) => h.trim());

  const idx = (name: string): number => header.indexOf(name);
  const isinIdx = idx('ISIN');
  const wknIdx = idx('WKN');
  const statusIdx = idx('Status');
  const richtungIdx = idx('Richtung');
  const datumIdx = idx('Ausführung Datum');
  const kursIdx = idx('Ausführung Kurs');
  const anzahlIdx = idx('Anzahl ausgeführt');

  // Bail out early if required columns are missing
  if ([isinIdx, statusIdx, richtungIdx, datumIdx, kursIdx, anzahlIdx].some((i) => i === -1)) {
    return [];
  }

  const result: CsvLot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split('\t').map((c) => c.trim());

    // Only executed buy orders
    if (cols[statusIdx] !== 'ausgeführt' || cols[richtungIdx] !== 'Kauf') continue;

    const isin = cols[isinIdx] ?? '';
    const wkn = wknIdx !== -1 ? (cols[wknIdx] ?? '') : '';
    const dateRaw = cols[datumIdx] ?? '';
    const priceRaw = cols[kursIdx] ?? '';
    const sharesRaw = cols[anzahlIdx] ?? '';

    if (!isin || !dateRaw || !priceRaw || !sharesRaw) continue;

    // Parse German date DD.MM.YYYY → ISO YYYY-MM-DD, then validate
    const dateParts = dateRaw.split('.');
    if (dateParts.length !== 3) continue;
    const [day, month, year] = dateParts;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (isNaN(new Date(date).getTime())) continue;

    // Parse German-locale numbers: dots are thousands separators, commas are decimals
    const parseGermanNumber = (s: string): number =>
      parseFloat(s.replace(/\./g, '').replace(',', '.'));

    const price = parseGermanNumber(priceRaw);
    const shares = parseGermanNumber(sharesRaw);

    if (!isFinite(price) || price <= 0 || !isFinite(shares) || shares <= 0) continue;

    result.push({ isin, wkn, date, shares, buyPrice: price });
  }

  return result;
}

/** Group CsvLots by ISIN, returning unique ISIN entries with their lots */
export function groupCsvLotsByIsin(lots: CsvLot[]): {
  isin: string;
  wkn: string;
  lots: CsvLot[];
  totalShares: number;
}[] {
  const map = new Map<string, { isin: string; wkn: string; lots: CsvLot[] }>();

  for (const lot of lots) {
    if (!map.has(lot.isin)) {
      map.set(lot.isin, { isin: lot.isin, wkn: lot.wkn, lots: [] });
    }
    map.get(lot.isin)!.lots.push(lot);
  }

  return Array.from(map.values()).map((g) => ({
    ...g,
    totalShares: g.lots.reduce((s, l) => s + l.shares, 0),
  }));
}
