import type { Inventory, JournalMarkup } from '@scripts/types/hg';

export interface JournalParserModule {
    match(css: string): boolean;
    execute(entry: JournalMarkup): Promise<Record<string, unknown> | void>;
}

export interface InventoryAware {
    setInventory(inventory: Inventory): void;
}
