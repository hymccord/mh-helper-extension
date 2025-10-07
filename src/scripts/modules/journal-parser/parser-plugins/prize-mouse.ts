import type { JournalMarkup } from '@scripts/types/hg';

import { LogLevel } from '@scripts/services/logging';

import type { ExtensionLog } from '../../extension-log/extension-log';
import type { JournalParserModule } from '../journal-parser.types';

export class PrizeMouseJournalPlugin implements JournalParserModule {
    constructor(
        private readonly extensionLog: ExtensionLog
    ) { }

    match(css: string): boolean {
        return css.includes('prizemouse');
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        await this.extensionLog.log(LogLevel.Info, 'Prize mouse', entry);
    }
}
