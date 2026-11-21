import { refreshNseSymbolMaster } from './symbolMaster';
import { ensureDefaultStockCategories } from './stockCategories';

export async function initializeProfileDefaults(): Promise<void> {
  // Step 1: Refresh symbol listings (non-fatal)
  try {
    await refreshNseSymbolMaster();
  } catch {
    // Non-fatal: symbols can be refreshed later from Holdings
  }

  // Step 2: Ensure default categories exist
  try {
    await ensureDefaultStockCategories();
  } catch {
    // Non-fatal: defaults can be seeded on next launch
  }
}
