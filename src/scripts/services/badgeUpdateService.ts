import { LoggerService } from '@scripts/util/logger';
import { ResponseParsingService } from './responseParsingService';
import { MhctSettings, SettingsService } from './settingsService';
import { HgResponse } from '@scripts/types/hg';

export class BadgeUpdateService {
    private updateBadge = true;

    constructor(
        private logger: LoggerService,
        private settings: SettingsService,
        private responseParser: ResponseParsingService
    ) {
        this.responseParser.hgResponse$.subscribe(({url, data}) => this.handleResponse(data));
        this.settings.update$.subscribe(({ key, value }) => this.settingsUpdate(key, value));
    }


    async init() {
        this.updateBadge = await this.settings.get('icon_timer');
    }

    private handleResponse(hgResponse: HgResponse) {
        this.logger.debug("Badge update check");

        if (!this.updateBadge) {
            return;
        }

        const secondsLeft = hgResponse.user.next_activeturn_seconds;
        if (secondsLeft > 0) {
            const minutesLeft = Math.floor(secondsLeft / 60);

            chrome.action.setBadgeBackgroundColor({color: '#222'});
            chrome.action.setBadgeText({text: `${minutesLeft}m`});
        } else {
            chrome.action.setBadgeBackgroundColor({color: '#9b7617'});
            chrome.action.setBadgeText({text: '🎺'});
        }


    }

    private settingsUpdate<K extends keyof MhctSettings>(key: K, value: MhctSettings[K]): void {
        if (key === 'icon_timer') {
            this.updateBadge = value as boolean;
        }

        if (!this.updateBadge) {
            chrome.action.setBadgeText({text: ''});
        }
    }
}
