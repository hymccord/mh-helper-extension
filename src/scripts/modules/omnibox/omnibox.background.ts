import type { EnvironmentService } from '@scripts/services/environment.service';
import type { LoggerService } from '@scripts/services/logging';

import { BrowserApi } from '@scripts/services/browser/browser-api';
import { fromChromeEvent } from '@scripts/services/browser/from-chrome-event';
import fuzzysort from 'fuzzysort';
import { debounceTime } from 'rxjs/operators';
import z from 'zod';

export class OmniboxBackground {
    constructor(private readonly logger: LoggerService,
        private readonly environmentService: EnvironmentService
    ) {
    }

    async init() {
        await this.initializeExtensionListeners();
    }

    private async initializeExtensionListeners() {
        await chrome.omnibox.setDefaultSuggestion({
            description: `Search the Firefox codebase
                (e.g. "hello world" | "path:omnibox.js onInputChanged")`,
        });

        BrowserApi.addListener(chrome.omnibox.onInputStarted, this.onInputStarted);
        fromChromeEvent(chrome.omnibox.onInputChanged)
            .pipe(
                debounceTime(250),
            )
            .subscribe(([text, suggest]) => {
                void this.onInputChanged(text, suggest);
            });
        BrowserApi.addListener(chrome.omnibox.onInputEntered, this.onInputEntered);
        BrowserApi.addListener(chrome.omnibox.onInputCancelled, this.onInputCancelled);
        BrowserApi.addListener(chrome.omnibox.onDeleteSuggestion, this.onDeleteSuggestion);
    }

    private onInputStarted = () => {
        this.logger.info('💭 onInputStarted');

        void chrome.omnibox.setDefaultSuggestion({
            description: 'ar: attractions, l: looter, m: mapper, c: converter'
        });
    };

    private onInputChanged = async (text: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) => {
        this.logger.info(`✏️ onInputChanged: ${text}`);

        // split into words and provide suggestions
        const words = text.split(' ', 2);
        if (words.length < 2) {
            return;
        }

        const itemType = this.getItemTypeFromQuery(text);
        if (!itemType) {
            return;
        }
        // delegate suggestions to relevant handlers
        switch (itemType) {
            case 'mouse':
                await this.provideAttractionSuggestions(words[1], suggest);
                break;
            case 'loot':
                await this.provideLootSuggestions(words[1], suggest);
                break;
            case 'map':
                await this.provideMapSuggestions(words[1], suggest);
                break;
            case 'mousemaps':
                await this.provideReverseMapSuggestions(words[1], suggest);
                break;
            case 'convertible':
                await this.provideConvertibleSuggestions(words[1], suggest);
                break;
            case 'itemconvertibles':
                await this.provideReverseConvertibleSuggestions(words[1], suggest);
                break;
            default:
                break;
        }
    };

    private onInputEntered = (text: string, disposition: chrome.omnibox.OnInputEnteredDisposition) => {
        this.logger.info(`✔️ onInputEntered: text -> ${text} | disposition -> ${disposition}`);
        const itemType = this.getItemTypeFromQuery(text);
        if (!itemType) {
            return;
        }

        const itemId = text.split(' ')[1];

        let path = '';
        switch (itemType) {
            case 'mouse':
                path = `/attractions.php?mouse=${itemId}&timefilter=all_time`;
                break;
            case 'loot':
                path = `/loot.php?item=${itemId}&timefilter=all_time`;
                break;
            case 'map':
                path = `/mapper.php?item=${itemId}`;
                break;
            case 'mousemaps':
                path = `/reverse-mapper.php?item=${itemId}`;
                break;
            case 'convertible':
                path = `/converter.php?item=${itemId}`;
                break;
            case 'itemconvertibles':
                path = `/reverse-converter.php?item=${itemId}`;
                break;
            default:
                break;
        }

        const url = `${this.environmentService.getBaseUrl()}${path}`;
        switch (disposition) {
            // void chrome.tabs.update({url: `https://www.mhct.win/search?q=${encodeURIComponent(text)}`});
            // break;
            // case chrome.omnibox.OnInputEnteredDisposition.CURRENT_TAB:
            // case chrome.omnibox.OnInputEnteredDisposition.NEW_FOREGROUND_TAB:
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            case 'currentTab':
                void chrome.tabs.update({url: url});
                break;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            case 'newForegroundTab':
                void chrome.tabs.create({url: url});
                break;
            // case chrome.omnibox.OnInputEnteredDisposition.NEW_BACKGROUND_TAB:
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            case 'newBackgroundTab':
                void chrome.tabs.create({url: url, active: false});
                break;
        }
    };

    private onInputCancelled = () => {
        this.logger.info('❌ onInputCancelled');
    };

    private onDeleteSuggestion = (text: string) => {
        this.logger.info(`🗑️ onDeleteSuggestion: ${text}`);
    };

    private async provideAttractionSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('mouse');
        this.provideSuggestions(query, 'ar', items, suggest);
    }

    private async provideLootSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('loot');
        this.provideSuggestions(query, 'l', items, suggest);
    }

    private async provideMapSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('map');
        this.provideSuggestions(query, 'm', items, suggest);
    }

    private async provideReverseMapSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('mousemaps');
        this.provideSuggestions(query, 'rm', items, suggest);
    }

    private async provideConvertibleSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('convertible');
        this.provideSuggestions(query, 'c', items, suggest);
    }

    private async provideReverseConvertibleSuggestions(query: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        const items = await this.searchAllItems('itemconvertibles');
        this.provideSuggestions(query, 'rc', items, suggest);
    }

    private provideSuggestions(query: string, prefix: string, items: z.infer<typeof mhctGetItemSchema>[], suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) {
        let topResults = [];
        if (query.length === 0) {
            topResults = items.slice(0, 5);
        } else {
            const result = fuzzysort.go(query, items, {key: 'value'});
            topResults = result.slice(0, 5).map(r => r.obj);
        }
        const suggestions = topResults.map(item => ({
            content: `${prefix} ${item.id}`,
            description: `${item.value}`,
        }));

        suggest(suggestions);
    }

    private async searchAllItems(itemType: ItemType) {
        // fetch using URLSearchParams to encode query params
        const params = new URLSearchParams({
            item_type: itemType,
            item_id: 'all',
            XDEBUG_SESSION: 'PHPSTORM',
        });
        const url = `${this.environmentService.getBaseUrl()}/searchByItem.php?${params.toString()}`;
        const response = await fetch(url);

        // const response = await fetch(url, {
        //     method: 'GET',
        //     credentials: 'include',
        //     mode: 'cors',
        // });

        if (!response.ok) {
            this.logger.error(`Failed to search for ${itemType}: ${response.status} ${response.statusText}`);
            return [];
        }

        const parseResult = await mhctGetItemSchema.array().safeParseAsync(await response.json());
        if (!parseResult.success) {
            this.logger.error(`Failed to parse ${itemType} search results: ${parseResult.error}`);
            return [];
        }

        return parseResult.data;
    }

    private getItemTypeFromQuery(query: string): ItemType | null {
        const prefix = query.split(' ', 1)[0].toLowerCase();
        switch (prefix) {
            case 'ar':
            case 'attraction':
            case 'attractions':
                return 'mouse';
            case 'l':
            case 'loot':
                return 'loot';
            case 'm':
            case 'map':
                return 'map';
            case 'rm':
            case 'rmap':
                return 'mousemaps';
            case 'c':
            case 'conv':
            case 'converter':
                return 'convertible';
            case 'rc':
            case 'rconv':
            case 'rconverter':
                return 'itemconvertibles';
            default:
                return null;
        }
    }
}

type ItemType = 'mouse' | 'loot' | 'map' | 'mousemaps' | 'convertible' | 'itemconvertibles';
const mhctGetItemSchema = z.object({
    id: z.number(),
    value: z.string()
});
