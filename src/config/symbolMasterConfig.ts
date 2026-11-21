export const SYMBOL_MASTER_SOURCES = {
  EQUITY: 'EQUITY',
  SME_EQUITY: 'SME_EQUITY',
} as const;

export type SymbolMasterSource = (typeof SYMBOL_MASTER_SOURCES)[keyof typeof SYMBOL_MASTER_SOURCES];

export const SYMBOL_MASTER_CONFIG = {
  nse: {
    sources: [
      { key: SYMBOL_MASTER_SOURCES.EQUITY, url: 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv', fileName: 'EQUITY_L.csv' },
      { key: SYMBOL_MASTER_SOURCES.SME_EQUITY, url: 'https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv', fileName: 'SME_EQUITY_L.csv' },
    ],
  },
  tableName: 'symbolMaster',
} as const;
