import browser from 'webextension-polyfill';
import {Options} from "./common";

export const enum LogLevel {
    Trace = 'trace',
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

const DEFAULT_OPTIONS: Options = {
    success_messages: true,
    error_messages: true,
    debug_logging: false,
    icon_timer: true,
    horn_sound: false,
    custom_sound: '',
    horn_volume: 100,
    horn_alert: false,
    horn_webalert: false,
    horn_popalert: false,
    tracking_enabled: true,
    tsitu_loader_on: false,
    tsitu_loader_offset: 80,
    escape_button_close: false,
};

/**
 * Promise to get the extension's settings.
 * @returns The extension's settings
 */
export async function getSettings() : Promise<Options> {
    const options = await browser.storage.sync.get();

    if (browser.runtime.lastError) {
        logError(browser.runtime.lastError.message);
    }

    return {...DEFAULT_OPTIONS, ...options};
}

/**
 * Get the extension's version from the manifest.
 * @returns The extension's version
 */
export function getVersion() : string {
    return browser.runtime.getManifest().version;
}

export function log(logLevel: LogLevel, message?: any){
    switch (logLevel) {
        case LogLevel.Trace:
            logTrace(message);
            break;
        case LogLevel.Debug:
            logDebug(message);
            break;
        case LogLevel.Info:
            logInfo(message);
            break;
        case LogLevel.Warn:
            logWarn(message);
            break;
        case LogLevel.Error:
            logError(message);
            break;
    }
}

function logTrace(message?: any) {
    if (debug_logging) {
        window.console.trace(message);
    }
}
function logDebug(message?: any) {
    if (debug_logging) {
        window.console.debug(message);
    }
}
function logInfo(message?: any) {
    window.console.info(message);
}
function logWarn(message?: any) {
    if (debug_logging) {
        window.console.warn(message);
    }
}
function logError(message?: any) {
    window.console.error(message);
}

let debug_logging = false;

void (async () => {
    const settings = await getSettings();
    debug_logging = settings.debug_logging;

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && 'debug_logging' in changes) {
            if (changes.debug_logging.newValue){
                debug_logging = true;
            } else {
                debug_logging = false;
            }
        }
    });
})();