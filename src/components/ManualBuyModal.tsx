import React, { useState } from 'react';
import { DemoEtfDef } from '../services/financeService';
import { PurchaseLot } from '../types';
import { parseGermanNumber } from '../utils/calculations';

interface ManualBuyModalProps {
  knownEtfs: DemoEtfDef[];
  onConfirm: (isin: string, lot: PurchaseLot) => void;
  onClose: () => void;
}

export const ManualBuyModal: React.FC<ManualBuyModalProps> = ({ knownEtfs, onConfirm, onClose }) => {
  const etfsWithIsin = knownEtfs.filter((e) => e.isin);

  const todayIso = new Date().toISOString().slice(0, 10);

  const [isin, setIsin] = useState<string>(etfsWithIsin[0]?.isin ?? '');
  const [date, setDate] = useState<string>(todayIso);
  const [price, setPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!isin) errs.push('Bitte ein ETF auswählen.');
    if (!date) errs.push('Bitte ein Datum angeben.');
    const parsedPrice = parseGermanNumber(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) errs.push('Kurs muss eine positive Zahl sein.');
    const parsedShares = parseGermanNumber(shares);
    if (isNaN(parsedShares) || parsedShares <= 0) errs.push('Anteile müssen eine positive Zahl sein.');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const lot: PurchaseLot = {
      date,
      buyPrice: parseGermanNumber(price),
      shares: parseGermanNumber(shares),
    };
    onConfirm(isin, lot);
  };

  const selectedEtf = etfsWithIsin.find((e) => e.isin === isin);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Kauf manuell eintragen</h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
              Transaktion wird in die Historie einsortiert
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* ETF selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              ETF
            </label>
            <select
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {etfsWithIsin.map((e) => (
                <option key={e.isin} value={e.isin}>
                  {e.name} ({e.ticker})
                </option>
              ))}
            </select>
            {selectedEtf?.isin && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">ISIN: {selectedEtf.isin}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Kaufdatum
            </label>
            <input
              type="date"
              value={date}
              max={todayIso}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price per share */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Kurs pro Anteil (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              placeholder="z. B. 85,42"
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Shares */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Anzahl Anteile
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={shares}
              placeholder="z. B. 10,5"
              onChange={(e) => setShares(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <ul className="space-y-1">
              {errors.map((err) => (
                <li key={err} className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Eintragen
          </button>
        </div>
      </div>
    </div>
  );
};
