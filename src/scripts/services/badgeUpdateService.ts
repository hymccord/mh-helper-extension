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
        this.responseParser.hgResponse$.subscribe((hgResponse) => this.handleResponse(hgResponse));
        this.settings.update$.subscribe(({ key, value }) => this.settingsUpdate(key, value));
    }


    async init() {
        this.updateBadge = await this.settings.get('icon_timer');
    }

    private handleResponse(hgResponse: HgResponse) {
        if (!this.updateBadge) {
            return;
        }

        const secondsLeft = hgResponse.user.next_activeturn_seconds;
        if (secondsLeft > 0) {
            const minutesLeft = Math.ceil(secondsLeft / 60);

            chrome.browserAction.setBadgeBackgroundColor({color: '#222'});
            chrome.browserAction.setBadgeText({text: `${minutesLeft}m`});
        } else {
            chrome.browserAction.setBadgeBackgroundColor({color: '#9b7617'});
            chrome.browserAction.setBadgeText({text: '🎺'});
        }
    }

    private settingsUpdate(key: keyof MhctSettings, value: MhctSettings[keyof MhctSettings]): void {
        if (key === 'icon_timer') {
            this.updateBadge = value as boolean;
        }
    }
}
