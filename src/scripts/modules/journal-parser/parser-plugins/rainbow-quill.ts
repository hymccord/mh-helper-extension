import type { JournalMarkup } from '@scripts/types/hg';

import type { JournalParserModule } from '../journal-parser.types';

export class RainbowQuillJournalPlugin implements JournalParserModule {
    match(css: string): boolean {
        if (!css.includes('rainbowQuillSpecialEffect')) {
            return false;
        }

        return user.environment_name == 'Afterword Acres' || user.environment_name == 'Epilogue Falls';
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        return Promise.resolve({
            rainbow_quill_trigger: true
        });
    }
}
