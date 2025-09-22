import { MainBackground } from "../background/main.background";
import { ConsoleLogger, type LoggerService } from "./util/logger";

const logger: LoggerService = new ConsoleLogger();

logger.info("Background activated.");
const main = new MainBackground();
main.bootstrap().catch((error: never) => logger.error(error));

chrome.runtime.onStartup.addListener(() => {
    logger.info("Extension started.");
});

chrome.runtime.onConnect.addListener((port) => {
    logger.info("Port connected.", port);
});

chrome.runtime.onSuspend.addListener(() => {
    logger.info("Extension suspended.");
});

addEventListener("activate", () => {
    logger.info("Extension activated.");
});

// // Schedule an update of the badge text every second, using the latest settings.

// chrome.storage.sync.onChanged.addListener((changes) => {
//     window.console.log("settings changed", changes);
//     for (const [key, change] of Object.entries(changes)) {
//         if (change.newValue) {
//             settings[key] = change.newValue;
//         }
//     }
// });

// /**
//  * @type {{ [x: string]: any; icon_timer?: any; horn_sound?: any; horn_volume?: any; custom_sound?: any; horn_alert?: any; horn_webalert?: any; horn_popalert?: any; }}
//  */
// let settings;
// (async () => {
//   settings = await getSettings();
//   setInterval(updateBadgeInterval, 1000);
// })();

// function getSettings() {
//     return chrome.storage.sync.get({
//         // DEFAULTS
//         success_messages: true,
//         error_messages: true,
//         icon_timer: true,
//         horn_sound: false,
//         custom_sound: '',
//         horn_volume: 100,
//         horn_alert: false,
//         horn_webalert: false,
//         horn_popalert: false,
//         tracking_enabled: true,
//         dark_mode: false,
//     });
// }

// /**
//  * Update the badge text icon timer with current MH page.
//  */
// async function updateBadgeInterval() {
//     let resultTabs = await new Promise((resolve) =>
//         chrome.tabs.query({url: ['*://www.mousehuntgame.com/*', '*://apps.facebook.com/mousehunt/*']}, resolve)
//     );

//     if (resultTabs?.length === 0) {
//         updateBadge(false);
//         return Promise.resolve();
//     }

//     resultTabs = resultTabs.filter(tab => tab.status === "complete");
//     // prefer pinned tabs first then left most
//     resultTabs.sort((a, b) => {
//         if (a.pinned ^ b.pinned) {
//             return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
//         }

//         return a.index - b.index;
//     });

//     const [mhTab] = resultTabs;
//     await updateBadge(mhTab.id ?? false);
// }

// // Notifications
// const default_sound = chrome.runtime.getURL('sounds/bell.mp3');
// let notification_done = false;
// /**
//  * Scheduled function that sets the badge color & text based on current settings.
//  * Modifies the global `notification_done` as appropriate.
//  * @param {number|false} tab_id The MH tab's ID, or `false` if no MH page is open & loaded.
//  */
// async function updateBadge(tab_id) {
//     if (tab_id === false) {
//         chrome.browserAction.setBadgeText({text: ''});
//         return;
//     }

//     // Query the MH page and update the badge based on the response.
//     const request = {mhct_link: "huntTimer"};
//     let response = await new Promise((resolve) => chrome.tabs.sendMessage(tab_id, request, resolve));

//     if (chrome.runtime.lastError || !response) {
//         const logInfo = {tab_id, request, response, time: new Date(),
//             message: "Error occurred while updating badge icon timer."};
//         if (chrome.runtime.lastError) {
//             logInfo.message += `\n${chrome.runtime.lastError.message}`;
//         }
//         console.log(logInfo);
//         chrome.browserAction.setBadgeText({text: ''});
//         notification_done = true;
//     } else if (response === "Ready") {
//         if (settings.icon_timer) {
//             chrome.browserAction.setBadgeBackgroundColor({color: '#9b7617'});
//             chrome.browserAction.setBadgeText({text: '🎺'});
//         }
//         // If we haven't yet sent a notification about the horn, do so if warranted.
//         if (!notification_done) {
//             if (settings.horn_sound && settings.horn_volume > 0) {
//                 const myAudio = new Audio(settings.custom_sound || default_sound);
//                 myAudio.volume = (settings.horn_volume / 100);
//                 myAudio.play();
//             }

//             await Promise.allSettled([
//                 showDesktopNotification(),
//                 showIntrusiveAlert(tab_id),
//                 showBackgroundAlert(tab_id),
//             ]);
//         }

//         notification_done = true;
//     } else if (["King's Reward", "Logged out"].includes(response)) {
//         if (settings.icon_timer) {
//             chrome.browserAction.setBadgeBackgroundColor({color: '#F00'});
//             chrome.browserAction.setBadgeText({text: 'RRRRRRR'});
//         }
//         notification_done = true;
//     } else {
//         // The user is logged in, has no KR, and the horn isn't ready yet. Set
//         // the badge text to the remaining time before the next horn.
//         notification_done = false;
//         if (settings.icon_timer) {
//             chrome.browserAction.setBadgeBackgroundColor({color: '#222'});
//             response = response.replace(':', '');
//             const response_int = parseInt(response, 10);
//             if (response.includes('min')) {
//                 response = response_int + 'm';
//             } else {
//                 if (response_int > 59) {
//                     let minutes = Math.floor(response_int / 100);
//                     const seconds = response_int % 100;
//                     if (seconds > 30) {
//                         ++minutes;
//                     }
//                     response = minutes + 'm';
//                 } else {
//                     response = response_int + 's';
//                 }
//             }
//         } else { // reset in case user turns icon_timer off
//             response = "";
//         }
//         await chrome.browserAction.setBadgeText({text: response});
//     }
// }

// async function showDesktopNotification() {

//     if (!settings.horn_alert) {
//         return Promise.resolve();
//     }

//     chrome.notifications.create(
//         "MHCT Horn",
//         {
//             type: "basic",
//             iconUrl: "images/icon128.png",
//             title: "MHCT Tools",
//             message: "MouseHunt Horn is ready!!! Good luck!",
//         }
//     );

//     return Promise.resolve();
// }

// /**
//  * @param {number} tabId
//  */
// async function showIntrusiveAlert(tabId) {

//     if (!settings.horn_webalert) {
//         return Promise.resolve();
//     }

//     await new Promise(r => setTimeout(r, 1000));
//     await chrome.tabs.update(tabId, {'active': true});
//     await chrome.tabs.sendMessage(tabId, {mhct_link: "show_horn_alert"});
// }

// /**
//  * @param {number} tabId
//  */
// async function showBackgroundAlert(tabId) {

//     if (!settings.horn_popalert) {
//         return Promise.resolve();
//     }

//     await new Promise(r => setTimeout(r, 1000));
//     if (confirm("MouseHunt Horn is Ready! Sound it now?")) {
//         await chrome.tabs.sendMessage(tabId, {mhct_link: "horn"});
//     }
// }

// Handle messages sent by the extension to the runtime.
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//     // Check the message for something to log in the background's console.
//     if (msg.log) {
//         const fn = msg.log.is_error ? console.error : msg.log_is_warning ? console.warn : console.log;
//         fn({message: msg.log, sender});
//     } else if (msg.settings?.debug_logging) {
//         console.log({msg, msg_sender: sender});
//     }

//     // If responding asynchronously, return `true` to keep the port open.
//     if (msg.mhct_crown_update === 1) {
//         submitCrowns(msg.crowns).then(sendResponse);
//         return true;
//     }
//     // TODO: Handle other extension messages.
// });

/**
 * Promise to submit the given crowns for external storage (e.g. for MHCC or others)
 * @param {Object <string, any>} crowns Crown counts for the given user
 * @returns {Promise <number | boolean>} A promise that resolves with the submitted crowns, or `false` otherwise.
 */
// async function submitCrowns(crowns) {
//     if (!crowns?.user || (crowns.bronze + crowns.silver + crowns.gold + crowns.platinum + crowns.diamond) === 0) {
//         return false;
//     }

//     const hash = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].map((type) => crowns[type]).join(',');
//     if (window.sessionStorage.getItem(crowns.user) === hash) {
//         window.console.log(`Skipping submission for user "${crowns.user}" (already sent).`);
//         return null;
//     }

//     const endpoint = 'https://script.google.com/macros/s/AKfycbztymdfhwOe4hpLIdVLYCbOTB66PWNDtnNRghg-vFx5u2ogHmU/exec';
//     const options = {
//         mode: 'cors',
//         method: 'POST',
//         credentials: 'omit',
//     };

//     const payload = new FormData();
//     payload.set('main', JSON.stringify(crowns));
//     try {
//         const resp = await fetch(endpoint, {...options, body: payload});
//         if (!resp.ok) return false;
//     } catch (error) {
//         window.console.error('Fetch/Network Error', {error, crowns});
//         return false;
//     }

//     // Cache when we've successfully posted to the endpoint.
//     try {
//         window.sessionStorage.setItem(crowns.user, hash);
//     } catch (error) {
//         window.console.warn('Unable to cache crown request');
//     }
//     setTimeout(() => window.sessionStorage.removeItem(crowns.user), 300 * 1000);
//     return crowns.bronze + crowns.silver + crowns.gold + crowns.platinum + crowns.diamond;
// }

/**
 * Tracks when a service worker was last alive and extends the service worker
 * lifetime by writing the current time to extension storage every 20 seconds.
 */
// async function runHeartbeat() {
//     await chrome.storage.local.set({ "last-heartbeat": new Date().getTime() });
// }

/**
 * Starts the heartbeat interval which keeps the service worker alive.
 */
// async function startHeartbeat() {
//     // Run the heartbeat once at service worker startup, then again every 20 seconds.
//     runHeartbeat()
//         .then(() => setInterval(runHeartbeat, 20 * 1000))
//         .catch((error) => logger.error(error));
// }

export {};
