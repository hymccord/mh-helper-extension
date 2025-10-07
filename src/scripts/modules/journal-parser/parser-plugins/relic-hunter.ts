import type { LoggerService } from '@scripts/services/logging';
import type { SubmissionService } from '@scripts/services/submission.service';
import type { JournalMarkup } from '@scripts/types/hg';

import type { JournalParserModule } from '../journal-parser.types';

export class RelicHunterJournalPlugin implements JournalParserModule {
    constructor(
        private readonly logger: LoggerService,
        private readonly submissionService: SubmissionService
    ) { }

    match(css: string): boolean {
        return /(relicHunter_catch|relicHunter_failure)/.test(css);
    }

    async execute(entry: JournalMarkup): Promise<Record<string, unknown> | void> {
        const sighting = {
            rh_environment: entry.render_data.environment,
            entry_timestamp: entry.render_data.entry_timestamp,
        };

        // If this occurred after the daily reset, submit it. (Trap checks & friend hunts
        // may appear and have been back-calculated as occurring before reset).
        if (sighting.entry_timestamp > Math.round(new Date().setUTCHours(0, 0, 0, 0) / 1000)) {
            await this.submissionService.submitRelicHunterSighting(sighting);
            this.logger.debug(`Found the relic hunter in ${sighting.rh_environment}.`);
        }
    }
}
