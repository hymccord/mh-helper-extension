import type { SubmissionService } from '@scripts/services/submission.service';
import type { HgResponse, Inventory, InventoryItem, JournalMarkup } from '@scripts/types/hg';

import { type LoggerService } from '@scripts/services/logging';
import { pageCampSchema } from '@scripts/types/hg/page';

import type { ExtensionLog } from '../extension-log/extension-log';
import type { InventoryAware, JournalParserModule } from './journal-parser.types';

import { BoilingCauldronJournalPlugin } from './parser-plugins/boiling-cauldron';
import { CookbookBasedJournalPlugin } from './parser-plugins/cookbook-base';
import { DesertHeaterJournalPlugin } from './parser-plugins/desert-heater-base';
import { GiftWrappedCharmJournalPlugin } from './parser-plugins/gift-wrapped-charm';
import { CheslaTrapJournalPlugin } from './parser-plugins/gilded-charm';
import { PirateSleighJournalPlugin } from './parser-plugins/pirate-sleigh';
import { PrizeMouseJournalPlugin } from './parser-plugins/prize-mouse';
import { QuesoCannonstormJournalPlugin } from './parser-plugins/queso-cannonstorm';
import { RainbowQuillJournalPlugin } from './parser-plugins/rainbow-quill';
import { RelicHunterJournalPlugin } from './parser-plugins/relic-hunter';
import { TorchCharmJournalPlugin } from './parser-plugins/torch-charm';
import { UnstableCharmJournalPlugin } from './parser-plugins/unstable-charm';

interface JournalParseResult {
    markup?: JournalMarkup;
    details: Record<string, unknown>;
}

export const getItemFromInventoryByType = (itemType: string, inventory: Inventory | null): InventoryItem | undefined => {
    if (inventory != null && !Array.isArray(inventory)) {
        return inventory[itemType];
    }
};

export const getItemFromInventoryByName = (itemName: string, inventory: Inventory | null): InventoryItem | undefined => {
    if (inventory != null && !Array.isArray(inventory)) {
        return Object.values(inventory).find(item => item.name === itemName);
    }
};

export class JournalParser {
    private readonly parserPlugins: JournalParserModule[] = [];

    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService,
        private readonly extensionLog: ExtensionLog,
    ) {
        this.parserPlugins.push(...[
            new RelicHunterJournalPlugin(this.logger, this.submissionService),
            new PrizeMouseJournalPlugin(this.extensionLog),
            new DesertHeaterJournalPlugin(this.logger, this.submissionService, this.extensionLog),
            new UnstableCharmJournalPlugin(this.logger, this.submissionService),
            new GiftWrappedCharmJournalPlugin(this.logger, this.submissionService),
            new TorchCharmJournalPlugin(this.logger, this.submissionService),
            new QuesoCannonstormJournalPlugin(this.logger, this.submissionService),
            new CookbookBasedJournalPlugin(),
            new BoilingCauldronJournalPlugin(this.logger, this.submissionService),
            new CheslaTrapJournalPlugin(this.logger, this.submissionService, this.extensionLog),
            new PirateSleighJournalPlugin(),
            new RainbowQuillJournalPlugin(),
        ]);
    }

    async execute(
        before: HgResponse,
        after: HgResponse
    ): Promise<JournalParseResult> {
        try {
            const page = pageCampSchema.parse(before.page);
            const journalEntryIds = page.journal.entries_string.matchAll(/data-entry-id='(\d+)'/g);
            const maxEntryId = Math.max(...Array.from(journalEntryIds, x => Number(x[1])), 0);

            return await this.parseJournalEntries(after, maxEntryId);
        } catch {
            throw new Error('Failed to parse journal page.');
        }
    }

    private async parseJournalEntries(after: HgResponse, maxEntryId: number): Promise<JournalParseResult> {
        const journalMarkup = after.journal_markup;
        const details: Record<string, unknown> = {};
        if (!journalMarkup || journalMarkup.length === 0) {
            return {details};
        }

        const newEntries = journalMarkup.filter(e => e.render_data.entry_id > maxEntryId);
        if (newEntries.length === 0) {
            return {details};
        }

        // if any entries css_class contains passive, skip processing
        if (newEntries.some(e => e.render_data.css_class.includes('passive'))) {
            this.logger.debug('Skipping journal parsing due to trap check.');
            return {details};
        }

        let activeHunt: JournalMarkup | undefined;
        for (const entry of newEntries) {
            await this.processEntryWithPlugins(after.inventory ?? [], entry, details);

            if (/(catchfailure|catchsuccess|attractionfailure|stuck_snowball_catch)/.test(entry.render_data.css_class)) {
                if (entry.render_data.css_class.includes('active')) {
                    activeHunt = entry;
                }
            }
        }

        return {
            markup: activeHunt,
            details,
        };
    }

    private async processEntryWithPlugins(
        inventory: Inventory,
        entry: JournalMarkup,
        details: Record<string, unknown>
    ): Promise<void> {
        for (const plugin of this.parserPlugins) {
            try {
                if (!plugin.match(entry.render_data.css_class)) {
                    continue;
                }

                if ('setInventory' in plugin) {
                    (plugin as unknown as InventoryAware).setInventory(inventory);
                }

                const result = await plugin.execute(entry);
                if (result) {
                    Object.assign(details, result);
                }
            } catch (error) {
                this.logger.error('Journal parser plugin failed.', error);
            }
        }
    }
}
