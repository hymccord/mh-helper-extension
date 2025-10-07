import type { JournalMarkup } from '@scripts/types/hg';

import type { JournalParserModule } from '../journal-parser.types';

export class PirateSleighJournalPlugin implements JournalParserModule {
    match(css: string): boolean {
        return css.includes('pirate_sleigh_trigger');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        return Promise.resolve({
            pirate_sleigh_trigger: true,
        });
    }
}
