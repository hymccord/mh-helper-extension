import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import type { InventoryAware, JournalParserModule } from '../journal-parser.types';

import { getItemFromInventoryByType } from '../journal-parser';

export class BoilingCauldronJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('boiling_cauldron_potion_bonus');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        const data = entry.render_data.text;
        const potionRegex = /item\.php\?item_type=(.*?)"/.exec(data);
        if (potionRegex) {
            const resultPotion = potionRegex[1];
            const potionItemResult = getItemFromInventoryByType(resultPotion, this.inventory);
            if (potionItemResult) {
                const convertible = {
                    id: 3304,
                    name: 'Boiling Cauldron Trap',
                    quantity: 1,
                };
                const items = [{
                    id: potionItemResult.item_id,
                    name: potionItemResult.name,
                    quantity: 1,
                }];
                this.logger.debug('Boiling Cauldron Trap proc', {boiling_cauldron_trap: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        }

        return {
            boiling_cauldron_trap_bonus: true
        };
    }
}
