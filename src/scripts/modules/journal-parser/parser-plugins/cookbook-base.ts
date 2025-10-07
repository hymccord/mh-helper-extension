import type { JournalMarkup } from '@scripts/types/hg';

import type { JournalParserModule } from '../journal-parser.types';

export class CookbookBasedJournalPlugin implements JournalParserModule {
    match(css: string): boolean {
        return css.includes('alchemists_cookbook_base_bonus');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        return Promise.resolve({
            alchemists_cookbook_base_bonus: true
        });
    }
}
