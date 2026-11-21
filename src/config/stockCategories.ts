import { StockCategoryType } from '../types';

export interface DefaultStockCategory {
  category: string;
  type: StockCategoryType;
  description: string;
}

export const DEFAULT_STOCK_CATEGORIES: DefaultStockCategory[] = [
  {
    category: 'Large Cap',
    type: StockCategoryType.MarketCap,
    description: 'Top 100 companies by full market capitalization; established industry leaders with stable returns and lower volatility.',
  },
  {
    category: 'Mid Cap',
    type: StockCategoryType.MarketCap,
    description: 'Companies ranked 101st to 250th by market capitalization, offering a balance of growth potential and moderate risk.',
  },
  {
    category: 'Small Cap',
    type: StockCategoryType.MarketCap,
    description: 'Companies ranked 251st and beyond by market capitalization; high growth potential paired with higher volatility.',
  },
  {
    category: 'SME / MSME',
    type: StockCategoryType.Instrument,
    description: 'Small and Medium Enterprises listed on dedicated platforms like NSE EMERGE and BSE SME, typically traded in fixed lot sizes.',
  },
  {
    category: 'ETFs',
    type: StockCategoryType.Instrument,
    description: 'Exchange-Traded Funds that track an index, commodity, or basket of assets and trade on stock exchanges like regular shares.',
  },
  {
    category: 'REITs & InvITs',
    type: StockCategoryType.Instrument,
    description: 'Real Estate and Infrastructure Investment Trusts listed on exchanges that distribute regular rental or toll income to investors.',
  },
  {
    category: 'Sectoral / Thematic',
    type: StockCategoryType.Style,
    description: 'Stocks grouped by specific industries or economic themes such as IT, Banking, Pharma, FMCG, Auto, or Renewable Energy.',
  },
  {
    category: 'PSU (Public Sector Undertakings)',
    type: StockCategoryType.Style,
    description: 'Government-owned enterprises where the Central or State Government holds a majority stake.',
  },
  {
    category: 'Dividend Yield',
    type: StockCategoryType.Style,
    description: 'Stocks of mature, cash-generative companies known for distributing regular, high dividend payouts to shareholders.',
  },
  {
    category: 'Blue Chip',
    type: StockCategoryType.Style,
    description: 'Nationally recognized, financially sound companies with a long track record of reliable earnings and market dominance.',
  },
  {
    category: 'Commodities',
    type: StockCategoryType.Sector,
    description: 'Companies engaged in chemicals, petrochemicals, cement, construction materials, metals, mining, and forest products.',
  },
  {
    category: 'Consumer Discretionary',
    type: StockCategoryType.Sector,
    description: 'Businesses selling non-essential goods and services such as automobiles, auto components, apparel, retail, media, hospitality, and realty.',
  },
  {
    category: 'Energy',
    type: StockCategoryType.Sector,
    description: 'Companies involved in oil, gas, consumable fuels, refining, exploration, and petroleum distribution.',
  },
  {
    category: 'Fast Moving Consumer Goods (FMCG)',
    type: StockCategoryType.Sector,
    description: 'Manufacturers and distributors of everyday essentials including packaged foods, beverages, personal care, and household products.',
  },
  {
    category: 'Financial Services',
    type: StockCategoryType.Sector,
    description: 'Banks, NBFCs, insurance companies, capital market intermediaries, asset managers, and fintech firms.',
  },
  {
    category: 'Healthcare',
    type: StockCategoryType.Sector,
    description: 'Pharmaceutical manufacturers, hospitals, diagnostic chains, biotechnology firms, and medical equipment providers.',
  },
  {
    category: 'Industrials',
    type: StockCategoryType.Sector,
    description: 'Companies focused on capital goods, engineering, construction, aerospace, defense, industrial machinery, and electrical equipment.',
  },
  {
    category: 'Information Technology',
    type: StockCategoryType.Sector,
    description: 'Software developers, IT consulting and outsourcing firms, tech-enabled services, and hardware providers.',
  },
  {
    category: 'Services',
    type: StockCategoryType.Sector,
    description: 'Businesses providing logistics, aviation, shipping, commercial support, e-commerce platforms, and trading services.',
  },
  {
    category: 'Telecommunication',
    type: StockCategoryType.Sector,
    description: 'Telecom network operators, broadband providers, and telecom tower or equipment infrastructure companies.',
  },
  {
    category: 'Utilities',
    type: StockCategoryType.Sector,
    description: 'Companies operating in power generation, electricity transmission and distribution, gas utilities, and water supply.',
  },
  {
    category: 'Diversified',
    type: StockCategoryType.Sector,
    description: 'Conglomerates operating across multiple unrelated industries with no single dominant revenue segment.',
  },
];
