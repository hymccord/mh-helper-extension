import browser from "webextension-polyfill";

// JS script available only within the pop-up html pages (popup.html & popup2.html)
/**
 * Query the open tabs and locate the MH tabs. Passes the first result to the callback, along with the invoking button.
 * @param {Function} callback A function that expects the MH page's tab ID and possibly the button that invoked the call
 * @param {string} [button_id] the HTML id of the pressed button, to be forwarded to callback
 * @param {boolean} [silent] if true, errors will not be displayed to the user.
 */
async function findOpenMHTab(callback: (tabId : number, buttonId : string | null) => Promise<void>, button_id: string | null, silent?: boolean): Promise<void> {
    const tabs = await browser.tabs.query({'url': ['*://www.mousehuntgame.com/*', '*://apps.facebook.com/mousehunt/*']});
    if (tabs.length > 0 && tabs[0].id != undefined) {
        void callback(tabs[0].id, button_id);
    }
    else if (!silent) {
        displayErrorPopup("Please navigate to MouseHunt page first.");
    }
}

/**
 * Forward the pressed button to the content script on the identified tab.
 * (Horn button clicks also activate the MH page.)
 * @param {number} tab_id The tab ID of the MH page
 * @param {string} button_id The HTML element ID of the button that was clicked
 */
async function sendMessageToScript(tab_id: number, button_id: string | null): Promise<void> {
    // Switch to MH tab if needed.
    const needsMHPageActive = ['horn', 'tsitu_loader', 'mhmh', 'ryonn'];
    if (button_id !== null && needsMHPageActive.includes(button_id)) {
        await browser.tabs.update(tab_id, {'active': true});
    }

    // Send message to content script
    void browser.tabs.sendMessage(tab_id, {mhct_link: button_id});
}

document.addEventListener('DOMContentLoaded', () => {
    const version_element = document.getElementById("version");
    const loop = true;
    if (version_element) {
        version_element.innerText = ` version: ${browser.runtime.getManifest().version}`;
    }
    // Schedule updates of the horn timer countdown.
    void findOpenMHTab(async tab => {
        while (loop) {
            const huntTimerField = document.getElementById("huntTimer");
            await updateHuntTimerField(tab, huntTimerField); // Fire now
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }, null, true);

    // Send specific clicks to the content script for handling and/or additional forwarding.
    ['mhmh', 'userhistory', 'ryonn', 'horn', 'tsitu_loader'].forEach(id => {
        const button_element = document.getElementById(id);
        if (button_element) {
            button_element.addEventListener('click', () => {
                void (async () => {
                    await findOpenMHTab(sendMessageToScript, id);
                })();
            });
        }
    });

    // Set up the options page listener.
    const options_button = document.getElementById('options_button');
    if (options_button) {
        options_button.addEventListener('click', () => {
            if (browser.runtime.openOptionsPage) {
                // New way to open options pages, if supported (Chrome 42+).
                void browser.runtime.openOptionsPage();
            } else {
                // Reasonable fallback.
                window.open(browser.runtime.getURL('options.html'));
            }
        });
    }
});

/**
 * Query the MH page and display the time remaining until the next horn.
 * @param {number} tab The tab id of the MH page
 * @param {HTMLElement} [huntTimerField] The div element corresponding to the horn countdown timer.
 */
async function updateHuntTimerField(tab: number, huntTimerField: HTMLElement | null) {
    const response: unknown = await browser.tabs.sendMessage(tab, {mhct_link: "huntTimer"});
    if (browser.runtime.lastError) {
        displayErrorPopup(browser.runtime.lastError.message ?? "");
    }
    if (huntTimerField && typeof response === 'string') {
        if (response === "Ready!") {
            huntTimerField.innerHTML = '<img src="images/horn.png" class="horn">';
        } else {
            huntTimerField.textContent = response;
        }
    }
}

/**
 * Display the associated message
 * @param {string} message The message to display
 */
function displayErrorPopup(message: string): void {
    const error_popup = document.getElementById('error_popup');

    if (error_popup === null) {
        return;
    }

    error_popup.innerText = message;
    error_popup.style.display = 'block';
    setTimeout(() => error_popup.style.display = 'none', 2000);
}

export default {};