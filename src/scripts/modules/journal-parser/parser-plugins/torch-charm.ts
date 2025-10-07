import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import type { InventoryAware, JournalParserModule } from '../journal-parser.types';

import { getItemFromInventoryByType } from '../journal-parser';

export class TorchCharmJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('torch_charm_event');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        const data = entry.render_data.text;
        const torchprocRegex = /item\.php\?item_type=(.*?)"/.exec(data);
        if (torchprocRegex) {
            const resultItem = torchprocRegex[1];
            const torchItemResult = getItemFromInventoryByType(resultItem, this.inventory);
            if (torchItemResult) {
                const convertible = {
                    id: 2180, // Torch Charm's item ID
                    name: 'Torch Charm',
                    quantity: 1,
                };
                const items = [{
                    id: torchItemResult.item_id,
                    name: torchItemResult.name,
                    quantity: 1,
                }];
                this.logger.debug('Submitting Torch Charm: ', {torch_charm_loot: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        }
    }
}
