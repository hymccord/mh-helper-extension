import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import type { InventoryAware, JournalParserModule } from '../journal-parser.types';

import { getItemFromInventoryByType } from '../journal-parser';

export class GiftWrappedCharmJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('gift_wrapped_charm_trigger');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        const data = entry.render_data.text;
        const trinketRegex = /item\.php\?item_type=(.*?)"/.exec(data);
        if (trinketRegex) {
            const resultTrinket = trinketRegex[1];
            const trinket = getItemFromInventoryByType(resultTrinket, this.inventory);
            if (trinket) {
                const convertible = {
                    id: 2525, // Gift Wrapped Charm's item ID
                    name: 'Gift Wrapped Charm',
                    quantity: 1,
                };
                const items = [{
                    id: trinket.item_id,
                    name: trinket.name,
                    quantity: 1,
                }];
                this.logger.debug('Submitting Gift Wrapped Charm: ', {gift_wrapped_charm_loot: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        }
    }
}
