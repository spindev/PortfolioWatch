import React from 'react';
import { DemoEtfDef } from '../services/financeService';
import { CsvLot, groupCsvLotsByIsin } from '../utils/csvParser';

interface CsvImportModalProps {
  lots: CsvLot[];
  knownEtfs: DemoEtfDef[];
  onConfirm: (selectedByIsin: Record<string, import('../types').PurchaseLot[]>) => void;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  lots,
  knownEtfs,
  onConfirm,
  onClose,
}) => {
  const groups = groupCsvLotsByIsin(lots);

  // Build a lookup: ISIN → ETF definition
  const etfByIsin: Record<string, DemoEtfDef> = {};
  knownEtfs.forEach((e) => {
    if (e.isin) etfByIsin[e.isin] = e;
  });

  const handleConfirm = () => {
    const result: Record<string, import('../types').PurchaseLot[]> = {};
    groups.forEach(({ isin, lots: groupLots }) => {
      result[isin] = groupLots.map(({ date, shares, buyPrice }) => ({ date, shares, buyPrice }));
    });
    onConfirm(result);
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">CSV-Import</h2>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
              Gefundene Käufe werden importiert
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

        {/* Empty state */}
        {groups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <svg className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Keine passenden Käufe in der CSV gefunden.
              </p>
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
                Nur Zeilen mit Richtung „Kauf" und bekannter ISIN/WKN werden importiert.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="px-5 py-2.5 border-b border-gray-100 dark:border-slate-700/50">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {groups.length} ISIN{groups.length !== 1 ? 's' : ''} gefunden ·{' '}
                {lots.length} Kauf{lots.length !== 1 ? 'orders' : 'order'} gesamt
              </span>
            </div>

            {/* ETF list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/50">
              {groups.map(({ isin, wkn, lots: groupLots, totalShares }) => {
                const matched = etfByIsin[isin];

                return (
                  <div key={isin} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {matched ? matched.name : isin}
                        </span>
                        {matched && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5 flex-shrink-0">
                            {matched.ticker}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <span>ISIN: {isin}</span>
                        {wkn && <span>WKN: {wkn}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {totalShares.toLocaleString('de-DE')} Anteile
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {groupLots.length} Kauf{groupLots.length !== 1 ? 'orders' : 'order'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Importieren
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
