import browser from 'webextension-polyfill';
import {ExtensionMessage, Options} from './common';
import {getSettings} from './utils';

// Pass version # from manifest to injected script
const extension_version = document.createElement("input");
extension_version.setAttribute("id", "mhhh_version");
extension_version.setAttribute("type", "hidden");
extension_version.setAttribute("value", browser.runtime.getManifest().version);
document.body.appendChild(extension_version);

// Add flash message div
const mhhh_flash_message_div = document.createElement("div");
mhhh_flash_message_div.setAttribute("id", "mhhh_flash_message_div");
mhhh_flash_message_div.setAttribute(
    "style",
    "display:none;" +
    "z-index:100;" +
    "position:fixed;" +
    "top:20%;" +
    "background-color: white;" +
    "padding: 10px;" +
    "border-radius: 5px;" +
    "box-shadow: 0 0 10px 1px black;");
document.body.appendChild(mhhh_flash_message_div);

// Inject script to intercept ajax events
const s = document.createElement('script');
s.src = browser.runtime.getURL('scripts/intercept.js');
(document.head || document.documentElement).appendChild(s);
s.onload = async function() {
    s.remove();
};

// s.onload = async () => {
//     // Display Tsitu's Loader
//     const items: Record<string, any> = await browser.storage.sync.get({
//         tsitu_loader_on: false,
//         tsitu_loader_offset: 80,
//     });
        
//     if (items.tsitu_loader_on) {
//         // There must be a better way of doing this
//         window.postMessage({
//             "mhct_message": 'tsitu_loader',
//             "tsitu_loader_offset": items.tsitu_loader_offset,
//             "file_link": browser.runtime.getURL('third_party/tsitu/bm-menu.min.js'),
//         }, "*");
//     }
//     s.remove();
// };

// Handles messages from popup or background.
browser.runtime.onMessage.addListener((request: any, sender: browser.Runtime.MessageSender) => {
    if ([
        "userhistory",
        "mhmh",
        "ryonn",
        "horn",
        "tsitu_loader",
    ].includes(request.mhct_link)) {
        let file_link = '';
        if (request.mhct_link == "tsitu_loader") {
            file_link = browser.runtime.getURL('third_party/tsitu/bm-menu.min.js');
        }
        // Forwards messages from popup to main script
        window.postMessage({"mhct_message": request.mhct_link, "file_link": file_link}, "*");
    } else if (request.mhct_link === "huntTimer") {
        // Check for a King's Reward, otherwise report the displayed time until next horn.
        let message: string | null = "Logged out";
        const krHudElement = document.getElementsByClassName('mousehuntHud-huntersHorn-response')[0];
        const krPageElement = document.getElementsByClassName('mousehuntPage-puzzle-form-state hasPuzzle')[0];
        const hunt_timer = document.getElementById('huntTimer');
        // KR can prompt a puzzle without the HUD changing. If either are displaying, a pending KR needs to be claimed
        if (krHudElement && window.getComputedStyle(krHudElement).display === 'block' ||
            krPageElement && window.getComputedStyle(krPageElement).display === 'block') {
            message = "King's Reward";
        } else if (hunt_timer) {
            message = hunt_timer.textContent;
        }
        return Promise.resolve(message);
    } else if (request.mhct_link === "show_horn_alert") {
        window.postMessage({"mhct_message": request.mhct_link}, "*");
    }
});

// Handle messages from embedded script (main.js)
window.addEventListener("message",
    async event => {
        // Lots of MessageEvents are sent, so only respond to ones we know about.
        const data = event.data;
        if (data.mhct_settings_request === 1) {
            const settings = await getSettings();
            if (event.source instanceof Window) {
                event.source.postMessage({
                    "mhct_settings_response": 1,
                    "settings": settings,
                }, event.origin);
            }
        } else if (data.mhct_crown_update === 1) {
            data.origin = event.origin;
            const wasSubmitted: number | boolean = await browser.runtime.sendMessage(data);
            if (event.source instanceof Window) {
                event.source.postMessage({
                    mhct_message: 'crownSubmissionStatus',
                    submitted: wasSubmitted,
                    settings: data.settings,
                }, event.origin);
            }
        } else if (data.mhct_log_request === 1) {
            browser.runtime.sendMessage({"log": data});
        } else if (data.mhct_golem_submit === 1) {
            data.origin = event.origin;
            const wasSubmitted: number | boolean = await browser.runtime.sendMessage(data);
            if (event.source instanceof Window) {
                event.source.postMessage({
                    mhct_message: 'golemSubmissionStatus',
                    submitted: wasSubmitted,
                    settings: data.settings,
                }, event.origin);
            }
            
        }
    },
    false
);

window.addEventListener('message', function(event: MessageEvent<ExtensionMessage | undefined>) {
    // Only accept message from same frame
    if (event.source !== window) {
        return;
    }

    const message = event.data;
    // Only accept our messages
    if (message?.source !== 'mhct-helper-extension') {
        return;
    }

    browser.runtime.sendMessage(message);
});
