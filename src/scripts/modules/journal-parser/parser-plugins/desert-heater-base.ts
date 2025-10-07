import type { SubmissionService } from '@scripts/services/submission.service';
import type { Inventory, JournalMarkup } from '@scripts/types/hg';

import { LogLevel, type LoggerService } from '@scripts/services/logging';

import type { ExtensionLog } from '../../extension-log/extension-log';
import type { JournalParserModule, InventoryAware } from '../journal-parser.types';

import { getItemFromInventoryByName } from '../journal-parser';

export class DesertHeaterJournalPlugin implements JournalParserModule, InventoryAware {
    private inventory: Inventory | null = null;

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService,
        private readonly extensionLog: ExtensionLog
    ) { }

    setInventory(inventory: Inventory): void {
        this.inventory = inventory;
    }

    match(css: string): boolean {
        return css.includes('desert_heater_base_trigger') && !css.includes('fail');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        // Handle a Desert Heater Base loot proc.
        const data = entry.render_data.text;
        const quantityRegex = /mouse dropped ([\d,]+) <a class/;
        const nameRegex = />(.+?)<\/a>/g; // "g" flag used for stickiness
        const quantityMatch = quantityRegex.exec(data);
        nameRegex.lastIndex = quantityMatch?.index ?? data.length; // Start searching for name where quantity was found.
        const nameMatch = nameRegex.exec(data);
        if (quantityMatch && nameMatch) {
            const strQuantity = quantityMatch[1].replace(/,/g, '').trim();
            const lootQty = parseInt(strQuantity, 10);
            const lootName = nameMatch[1];
            const loot = getItemFromInventoryByName(lootName, this.inventory);

            if (!lootQty || !loot) {
                await this.extensionLog.log(LogLevel.Warn, `Failed to find inventory loot for Desert Heater Base`, {
                    desert_heater_journal: entry,
                    inventory: this.inventory,
                    loot: lootName,
                });
            } else {
                const convertible = {
                    id: 2952, // Desert Heater Base's item ID
                    name: 'Desert Heater Base',
                    quantity: 1,
                };
                const items = [{id: loot.item_id, name: lootName, quantity: lootQty}];
                this.logger.debug('Desert Heater Base proc', {desert_heater_loot: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        } else {
            await this.extensionLog.log(LogLevel.Warn, `Regex quantity and loot name failed for Desert Heater Base`, {
                desert_heater_journal: entry,
                inventory: this.inventory,
            });
        }
    }
}
