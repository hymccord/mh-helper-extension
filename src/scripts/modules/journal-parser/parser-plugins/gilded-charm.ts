import type { ExtensionLog } from '@scripts/modules/extension-log/extension-log';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { JournalMarkup } from '@scripts/types/hg';

import { LogLevel, type LoggerService } from '@scripts/services/logging';

import type { JournalParserModule } from '../journal-parser.types';

export class CheslaTrapJournalPlugin implements JournalParserModule {
    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService,
        private readonly extensionLog: ExtensionLog,
    ) { }

    match(css: string): boolean {
        return css.includes('chesla_trap_trigger');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        // Handle a potential Gilded Charm proc.
        const data = entry.render_data.text;
        const gildedRegex = /my Gilded Charm/.exec(data);
        const quantityRegex = /([\d]+)/.exec(data);
        if (gildedRegex && quantityRegex) {
            const quantityMatch = quantityRegex[1].replace(/,/g, '').trim();
            const lootQty = parseInt(quantityMatch, 10);

            if (!lootQty) {
                await this.extensionLog.log(LogLevel.Warn, `Failed to parse Gilded Charm proc quantity`, {
                    gilded_charm_journal: entry,
                });
            } else {
                const convertible = {
                    id: 2174, // Gilded Charm's item ID
                    name: 'Gilded Charm',
                    quantity: 1,
                };
                const items = [{id: 114, name: 'SUPER|brie+', quantity: lootQty}];
                this.logger.debug('Guilded Charm proc', {gilded_charm: items});

                await this.submissionService.submitItemConvertible(convertible, items);
            }
        }
    }
}
