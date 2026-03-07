import { PurchaseLot, SaleLot } from '../types';

/** One executed transaction (buy or sell) parsed from a broker CSV row */
export interface CsvLot extends PurchaseLot {
  isin: string;
  wkn: string;
  /** 'buy' for Kauf, 'sell' for Verkauf */
  type: 'buy' | 'sell';
}

/**
 * Parse a broker CSV export with the following semicolon-separated columns
 * (an optional leading "Name" / "Bezeichnung" column is supported):
 *   [Name] ; ISIN ; WKN ; Anzahl ; Anzahl storniert ; Status ; Orderart ; Limit ; Stop ;
 *   Erstellt Datum ; Erstellt Zeit ; Gültig bis ; Richtung ; Wert ; Wert storniert ;
 *   Mindermengenzuschlag ; Ausführung Datum ; Ausführung Zeit ; Ausführung Kurs ;
 *   Anzahl ausgeführt ; Anzahl offen ; Gestrichen Datum ; Gestrichen Zeit
 *
 * Both Kauf (buy) and Verkauf (sell) rows are returned.
 */
export function parseBrokerCsv(text: string): CsvLot[] {
  // Strip UTF-8 BOM and normalise line endings
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(';').map((h) => h.trim());

  const idx = (name: string): number => header.indexOf(name);
  const isinIdx = idx('ISIN');
  const wknIdx = idx('WKN');
  const richtungIdx = idx('Richtung');
  const datumIdx = idx('Ausführung Datum');
  const kursIdx = idx('Ausführung Kurs');
  const anzahlIdx = idx('Anzahl ausgeführt');

  // Bail out early if required columns are missing
  if ([isinIdx, richtungIdx, datumIdx, kursIdx, anzahlIdx].some((i) => i === -1)) {
    return [];
  }

  const result: CsvLot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';').map((c) => c.trim());

    // Accept both buy (Kauf) and sell (Verkauf) orders
    const richtung = cols[richtungIdx];
    if (richtung !== 'Kauf' && richtung !== 'Verkauf') continue;
    const type: 'buy' | 'sell' = richtung === 'Kauf' ? 'buy' : 'sell';

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

    result.push({ isin, wkn, date, shares, buyPrice: price, type });
  }

  return result;
}

/** Group CsvLots by ISIN, separating buys and sells */
export function groupCsvLotsByIsin(lots: CsvLot[]): {
  isin: string;
  wkn: string;
  lots: CsvLot[];
  saleLots: CsvLot[];
  totalBuyShares: number;
  totalSellShares: number;
}[] {
  const map = new Map<
    string,
    { isin: string; wkn: string; lots: CsvLot[]; saleLots: CsvLot[] }
  >();

  for (const lot of lots) {
    if (!map.has(lot.isin)) {
      map.set(lot.isin, { isin: lot.isin, wkn: lot.wkn, lots: [], saleLots: [] });
    }
    const entry = map.get(lot.isin)!;
    if (lot.type === 'sell') {
      entry.saleLots.push(lot);
    } else {
      entry.lots.push(lot);
    }
  }

  return Array.from(map.values()).map((g) => ({
    ...g,
    totalBuyShares: g.lots.reduce((s, l) => s + l.shares, 0),
    totalSellShares: g.saleLots.reduce((s, l) => s + l.shares, 0),
  }));
}

/** Convert buy CsvLots to PurchaseLot array (strips CSV-specific fields) */
export function csvLotsToPurchaseLots(lots: CsvLot[]): PurchaseLot[] {
  return lots.map(({ date, shares, buyPrice }) => ({ date, shares, buyPrice }));
}

/** Convert sell CsvLots to SaleLot array */
export function csvLotsToSaleLots(lots: CsvLot[]): SaleLot[] {
  return lots.map(({ date, shares }) => ({ date, shares }));
}
