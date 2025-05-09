import $ from 'jquery';
import {User} from "@scripts/types/hg";
import {UserBuilder} from './builders';

declare global {
    interface Window {
        $: JQueryStatic
        jQuery: JQueryStatic
        user: User
        lastReadJournalEntryId: number
    }
}

export async function e2eSetup() {
    const mainLoaded = setupMain();
    // https://github.com/nock/nock/issues/2200
    jest
        .useFakeTimers({
            doNotFake: [
                'nextTick',
                'setImmediate',
                'clearImmediate',
                'setInterval',
                'clearInterval',
                'setTimeout',
                'clearTimeout',
            ],
        })
        .setSystemTime(1212121000);

    import('@scripts/main');
    await mainLoaded;
}

export function e2eTeardown() {
    jest.useRealTimers();
}

function setupMain() {
    mockConsole();
    stubContentScript();
    setupDOM();
    setupWindowGlobals();

    // Need to wait for 'import('main.js')' to finish before testing. import is async.
    // Main fires a message when finally done loading.
    // We can wait for that and resolve a promise when received.
    return new Promise<void>((resolve) => {
        const listener = (event: MessageEvent<Record<string, unknown>>) => {
            if (typeof event.data.mhct_finish_load === 'number' && event.data.mhct_finish_load === 1) {
                window.removeEventListener('message', listener);
                resolve();
            }
        };
        window.addEventListener("message", listener);
    });
}

/**
 * Sets up mocks for common console logging functions
 */
function mockConsole(): void {
    const consoleFuncsToMock: (keyof Console)[] = ['debug', 'info', 'log', 'warn'];
    consoleFuncsToMock.map(v => {
        global.console[v] = jest.fn();
    });
}

/**
 * Simplest stub of the content script required for main to start
 */
function stubContentScript() {
    window.addEventListener("message", event => {
        const data = event.data;

        if (data.mhct_settings_request === 1) {
            window.postMessage({
                mhct_settings_response: 1,
                settings: {
                    'tracking-hunts': true,
                    'tracking-crowns': true,
                    'tracking-convertibles': true,
                    'tracking-events': true,
                    'notification-sound': false,
                    'notification-volume': 100,
                    'notification-custom': false,
                    'notification-custom-url': '',
                    'notification-desktop': false,
                    'notification-alert-type': 'none',
                    'notification-message-display': 'hud',
                    'notification-success-messages': true,
                    'notification-error-messages': true,
                    'enhancement-icon-timer': true,
                    'enhancement-tsitu-loader': false,
                    'enhancement-tsitu-loader-offset': 80,
                    'enhancement-escape-dismiss': false,
                    'enhancement-dark-mode': false,
                    'general-log-level': 'info',
                },
            }, '*');
        }
    }, false);
}

function setupDOM() {
    // main.js looks for extension version in DOM
    document.body.innerHTML = `
    <input id="mhhh_version" type="hidden" value="0.0.0" />
    `;
}

function setupWindowGlobals() {
    // main.js requires a few things on the window that aren't a part of jsdom implementation
    window.$ = window.jQuery = $;

    // Used for creating hunter_id_hash
    Object.defineProperty(window, 'crypto', {
        get(){
            return {
                subtle: {
                    digest: (algorithm: AlgorithmIdentifier, data: ArrayBuffer): Promise<ArrayBuffer> => {
                        return Promise.resolve(new Uint8Array([1, 2, 3, 4]));
                    },
                },
            };
        },
    });

    // MH globals
    Object.assign(window, {
        user: new UserBuilder().build(),
        lastReadJournalEntryId: 1337,
    });
}
