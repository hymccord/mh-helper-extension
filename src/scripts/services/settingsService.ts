import { Observable, Subject } from "rxjs";

export interface MhctSettings {
    success_messages: boolean;
    error_messages: boolean;
    icon_timer: boolean;
    horn_sound: boolean;
    custom_sound: string;
    horn_volume: number;
    horn_alert: boolean;
    horn_webalert: boolean;
    horn_popalert: boolean;
    tracking_enabled: boolean;
    dark_mode: boolean;
}

export class SettingsService {
    private updateSubject$ = new Subject<{ key: keyof MhctSettings, value: MhctSettings[keyof MhctSettings] }>();

    update$: Observable<{ key: keyof MhctSettings, value: MhctSettings[keyof MhctSettings] }>;

    constructor() {
        this.update$ = this.updateSubject$.asObservable();

        chrome.storage.sync.onChanged.addListener(async (changes) => {
            for (const key in changes) {
                // @ts-expect-error - TS doesn't like this, but it's fine
                this.updateSubject$.next({ key, value: changes[key].newValue });
            }
        });
    }

    public async init(): Promise<void> {
        await chrome.storage.sync.get({
            // DEFAULTS
            message_display: 'hud',
            success_messages: true,
            error_messages: true,
            icon_timer: true,
            horn_sound: false,
            custom_sound: '',
            horn_volume: 100,
            horn_alert: false,
            horn_webalert: false,
            horn_popalert: false,
            tracking_enabled: true,
            dark_mode: false,
        });
    }

    // implement get where T is a key of MhctSettings
    public async get<T extends keyof MhctSettings>(key: T): Promise<MhctSettings[T]> {
        const value = await chrome.storage.sync.get(key);

        return value[key];
    }

    public async set<T extends keyof MhctSettings>(key: T, value: MhctSettings[T]): Promise<void> {
        await chrome.storage.sync.set({ [key]: value });
    }

    public async remove(key: keyof MhctSettings): Promise<void> {
        await chrome.storage.sync.remove(key);
    }
}
