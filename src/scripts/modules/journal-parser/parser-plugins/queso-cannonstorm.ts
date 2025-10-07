import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import type { InventoryAware, JournalParserModule } from '../journal-parser.types';

import { getItemFromInventoryByType } from '../journal-parser';

export class QuesoCannonstormJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('queso_cannonstorm_base_trigger');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        try {
            const data = entry.render_data.text;
            const qcbprocRegex = /item\.php\?item_type=(.*?)"/g;
            const matchResults = [...data.matchAll(qcbprocRegex)];
            if (matchResults.length != 4) {
                throw new Error(`Unexpected number of matches for Queso Cannonstorm Base journal entry: ${matchResults.length}`);
            }
            // Get third match, then first capturing group
            const resultItem = matchResults[2][1];
            const baseResultItem = getItemFromInventoryByType(resultItem, this.inventory);
            if (baseResultItem == null) {
                throw new Error(`Could not find result item ${resultItem} in inventory`);
            }
            const convertible = {
                id: 3526, // Queso Cannonstorm Base's item ID
                name: 'Queso Cannonstorm Base',
                quantity: 1,
            };
            const items = [{
                id: baseResultItem.item_id,
                name: baseResultItem.name,
                quantity: 1,
            }];
            this.logger.debug('Submitting Queso Cannonstorm Base: ', {queso_cannonstorm_base_loot: items});

            await this.submissionService.submitItemConvertible(convertible, items);
        } catch (e) {
            this.logger.warn('Error processing Queso Cannonstorm Base journal entry', e);
        }
    }
}
