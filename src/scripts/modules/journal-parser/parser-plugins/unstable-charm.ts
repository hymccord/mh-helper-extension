import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import type { InventoryAware, JournalParserModule } from '../journal-parser.types';

export class UnstableCharmJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('unstable_charm_trigger');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        const data = entry.render_data.text;
        const trinketRegex = /item\.php\?item_type=(.*?)"/.exec(data);
        if (trinketRegex) {
            const resultTrinket = trinketRegex[1];
            if (this.inventory != null && !Array.isArray(this.inventory) && resultTrinket in this.inventory) {
                const {name: trinketName, item_id: trinketId} = this.inventory[resultTrinket];
                const convertible = {
                    id: 1478, // Unstable Charm's item ID
                    name: 'Unstable Charm',
                    quantity: 1,
                };
                const items = [{
                    id: trinketId,
                    name: trinketName,
                    quantity: 1,
                }];
                this.logger.debug('Submitting Unstable Charm: ', {unstable_charm_loot: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        }
    }
}
