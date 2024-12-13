// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import type {HgResponse, JournalMarkup} from "./types/hg";
import {LogLevel, type LoggerService} from "./util/logger";

// This file contains logic from main js that needs to be refactored into smaller modules
/**
 * Find the active journal entry, and handle supported "bonus journals" such as the Relic Hunter attraction.
 * @param {HgResponse} preResponse The JSON response returned from a horn sound.
 * @param {HgResponse} postResponse The JSON response returned from a horn sound.
 */
export function parseJournalEntries(preResponse: HgResponse, postResponse: HgResponse,
    logger: LoggerService,
    userSettings: Record<string, boolean>,
    submitMainIntakeMessage: (message: unknown) => void,
    submitItemConvertible: (convertible: unknown, items: unknown) => void)
    : (Record<string, unknown> & {more_details?: Record<string, unknown>}) | null {

    // Find maximum entry id from pre_response
    let max_old_entry_id = preResponse.page.journal.entries_string.match(/data-entry-id='(\d+)'/g);
    if (!max_old_entry_id.length) {
        max_old_entry_id = 0;
    } else {
        max_old_entry_id = max_old_entry_id.map(x => x.replace(/^data-entry-id='/, ''));
        max_old_entry_id = max_old_entry_id.map(x => Number(x.replace(/'/g, "")));
        max_old_entry_id = Math.max(...max_old_entry_id);
    }

    logger.debug(`Pre (old) maximum entry id: ${max_old_entry_id}`);
    /** @type {import("./types/hg").JournalMarkup & Object<string, unknown>} */
    let journal: JournalMarkup = {};
    const more_details: Record<string, unknown> = {};
    more_details.hunt_count = 0;
    let journal_entries = postResponse.journal_markup;
    if (!journal_entries) { return null; }

    // Filter out stale entries
    logger.debug(`Before filtering there's ${journal_entries.length} journal entries.`, {journal_entries, max_old_entry_id});
    journal_entries = journal_entries.filter(x => Number(x.render_data.entry_id) > Number(max_old_entry_id));
    logger.debug(`After filtering there's ${journal_entries.length} journal entries left.`, {journal_entries, max_old_entry_id});

    // Cancel everything if there's trap check somewhere
    if (journal_entries.findIndex(x => x.render_data.css_class.search(/passive/) !== -1) !== -1) {
        logger.info("Found trap check too close to hunt. Aborting.");
        return null;
    }

    journal_entries.forEach(markup => {
        const css_class = markup.render_data.css_class;
        // Handle a Relic Hunter attraction.
        if (css_class.search(/(relicHunter_catch|relicHunter_failure)/) !== -1) {
            const rh_message = {
                rh_environment: markup.render_data.environment,
                entry_timestamp: markup.render_data.entry_timestamp,
            };
            // If this occurred after the daily reset, submit it. (Trap checks & friend hunts
            // may appear and have been back-calculated as occurring before reset).
            if (rh_message.entry_timestamp > Math.round(new Date().setUTCHours(0, 0, 0, 0) / 1000)) {
                if (userSettings['tracking-events']) {
                    submitMainIntakeMessage(rh_message);
                    logger.debug(`Found the Relic Hunter in ${rh_message.rh_environment}`);
                }
            }
        }
        else if (css_class.search(/prizemouse/) !== -1) {
            // Handle a prize mouse attraction.
            if (logger.getLevel() === LogLevel.Debug) {
                window.postMessage({
                    "mhct_log_request": 1,
                    "prize mouse journal": markup,
                }, window.origin);
            }
            // TODO: Implement data submission
        }
        else if (css_class.search(/desert_heater_base_trigger/) !== -1 && css_class.search(/fail/) === -1) {
            // Handle a Desert Heater Base loot proc.
            const data = markup.render_data.text;
            const quantityRegex = /mouse dropped ([\d,]+) <a class/;
            const nameRegex = />(.+?)<\/a>/g; // "g" flag used for stickiness
            if (quantityRegex.test(data) && nameRegex.test(data)) {
                const quantityMatch = quantityRegex.exec(data);
                const strQuantity = quantityMatch[1].replace(/,/g, '').trim();
                const lootQty = parseInt(strQuantity, 10);

                // Update the loot name search to start where the loot quantity was found.
                nameRegex.lastIndex = quantityMatch.index;
                const lootName = nameRegex.exec(data)[1];

                const loot = Object.values(postResponse.inventory)
                    .find(item => item.name === lootName);

                if (!lootQty || !loot) {
                    window.postMessage({
                        "mhct_log_request": 1,
                        "is_error": true,
                        "desert heater journal": markup,
                        "inventory": postResponse.inventory,
                        "reason": `Didn't find named loot "${lootName}" in inventory`,
                    }, window.origin);
                } else {
                    const convertible = {
                        id: 2952, // Desert Heater Base's item ID
                        name: "Desert Heater Base",
                        quantity: 1,
                    };
                    const items = [{id: loot.item_id, name: lootName, quantity: lootQty}];
                    logger.debug("Desert Heater Base proc", {desert_heater_loot: items});

                    submitItemConvertible(convertible, items);
                }
            } else {
                window.postMessage({
                    "mhct_log_request": 1,
                    "is_error": true,
                    "desert heater journal": markup,
                    "inventory": postResponse.inventory,
                    "reason": "Didn't match quantity and loot name regex patterns",
                }, window.origin);
            }
        }
        else if (css_class.search(/unstable_charm_trigger/) !== -1) {
            const data = markup.render_data.text;
            const trinketRegex = /item\.php\?item_type=(.*?)"/;
            if (trinketRegex.test(data)) {
                const resultTrinket = data.match(trinketRegex)[1];
                if("inventory" in postResponse && resultTrinket in postResponse.inventory) {
                    const {name: trinketName, item_id: trinketId} = postResponse.inventory[resultTrinket];
                    const convertible = {
                        id: 1478, // Unstable Charm's item ID
                        name: "Unstable Charm",
                        quantity: 1,
                    };
                    const items = [{
                        id: trinketId,
                        name: trinketName,
                        quantity: 1,
                    }];
                    logger.debug("Submitting Unstable Charm: ", {unstable_charm_loot: items});

                    submitItemConvertible(convertible, items);
                }
            }
        }
        else if (css_class.search(/gift_wrapped_charm_trigger/) !== -1) {
            const data = markup.render_data.text;
            const trinketRegex = /item\.php\?item_type=(.*?)"/;
            if (trinketRegex.test(data)) {
                const resultTrinket = data.match(trinketRegex)[1];
                if("inventory" in postResponse && resultTrinket in postResponse.inventory) {
                    const {name: trinketName, item_id: trinketId} = postResponse.inventory[resultTrinket];
                    const convertible = {
                        id: 2525, // Gift Wrapped Charm's item ID
                        name: "Gift Wrapped Charm",
                        quantity: 1,
                    };
                    const items = [{
                        id: trinketId,
                        name: trinketName,
                        quantity: 1,
                    }];
                    logger.debug("Submitting Gift Wrapped Charm: ", {gift_wrapped_charm_loot: items});

                    submitItemConvertible(convertible, items);
                }
            }
        }
        else if (css_class.search(/torch_charm_event/) !== -1) {
            const data = markup.render_data.text;
            const torchprocRegex = /item\.php\?item_type=(.*?)"/;
            if (torchprocRegex.test(data)) {
                const resultItem = data.match(torchprocRegex)[1];
                if("inventory" in postResponse && resultItem in postResponse.inventory) {
                    const {name: rItemName, item_id: rItemID} = postResponse.inventory[resultItem];
                    const convertible = {
                        id: 2180, // Torch Charm's item ID
                        name: "Torch Charm",
                        quantity: 1,
                    };
                    const items = [{
                        id: rItemID,
                        name: rItemName,
                        quantity: 1,
                    }];
                    logger.debug("Submitting Torch Charm: ", {torch_charm_loot: items});

                    submitItemConvertible(convertible, items);
                }
            }
        }
        else if (css_class.search(/queso_cannonstorm_base_trigger/) !== -1) {
            const data = markup.render_data.text;
            const qcbprocRegex = /item\.php\?item_type=(.*?)"/g;
            const matchResults = [...data.matchAll(qcbprocRegex)];
            if (matchResults.length == 4){
                // Get third match, then first capturing group
                const resultItem = matchResults[2][1];
                if("inventory" in postResponse && resultItem in postResponse.inventory) {
                    const {name: rItemName, item_id: rItemID} = postResponse.inventory[resultItem];
                    const convertible = {
                        id: 3526, // Queso Cannonstorm Base's item ID
                        name: "Queso Cannonstorm Base",
                        quantity: 1,
                    };
                    const items = [{
                        id: rItemID,
                        name: rItemName,
                        quantity: 1,
                    }];
                    logger.debug("Submitting Queso Cannonstorm Base: ", {queso_cannonstorm_base_loot: items});

                    submitItemConvertible(convertible, items);
                }
            }
        }
        else if (css_class.search(/alchemists_cookbook_base_bonus/) !== -1) {

            more_details.alchemists_cookbook_base_bonus = true;
            logger.debug("Adding Cookbook Base Bonus to details", {procs: more_details});
        }
        else if (css_class.search(/boiling_cauldron_potion_bonus/) !== -1) {
            const data = markup.render_data.text;
            const potionRegex = /item\.php\?item_type=(.*?)"/;
            if (potionRegex.test(data)) {
                const resultPotion = data.match(potionRegex)[1];
                if ("inventory" in postResponse && resultPotion in postResponse.inventory) {
                    const {name: potionName, item_id: potionId} = postResponse.inventory[resultPotion];
                    if (potionName && potionId) {
                        const convertible = {
                            id: 3304,
                            name: "Boiling Cauldron Trap",
                            quantity: 1,
                        };
                        const items = [{
                            id: potionId,
                            name: potionName,
                            quantity: 1,
                        }];
                        logger.debug("Boiling Cauldron Trap proc", {boiling_cauldron_trap: items});

                        submitItemConvertible(convertible, items);
                    }
                }
            }
            more_details.boiling_cauldron_trap_bonus = true;
            logger.debug("Boiling Cauldron Trap details", {procs: more_details});
        }
        else if (css_class.search(/chesla_trap_trigger/) !== -1) {
            // Handle a potential Gilded Charm proc.
            const data = markup.render_data.text;
            const gildedRegex = /my Gilded Charm/;
            const quantityRegex = /([\d]+)/;
            if (gildedRegex.test(data) && quantityRegex.test(data)) {
                const quantityMatch = quantityRegex.exec(data);
                const strQuantity = quantityMatch[1].replace(/,/g, '').trim();
                const lootQty = parseInt(strQuantity, 10);

                if (!lootQty) {
                    window.postMessage({
                        "mhct_log_request": 1,
                        "is_error": true,
                        "gilded charm journal": markup,
                        "inventory": postResponse.inventory,
                        "reason": "Unable to parse Gilded Charm proc quantity",
                    }, window.origin);
                } else {
                    const convertible = {
                        id: 2174, // Gilded Charm's item ID
                        name: "Gilded Charm",
                        quantity: 1,
                    };
                    const items = [{id: 114, name: "SUPER|brie+", quantity: lootQty}];
                    logger.debug("Guilded Charm proc", {gilded_charm: items});

                    submitItemConvertible(convertible, items);
                }
            }
        }
        else if (css_class.search(/pirate_sleigh_trigger/) !== -1) {
            // SS Scoundrel Sleigh got 'im!
            more_details.pirate_sleigh_trigger = true;
            logger.debug("Pirate Sleigh proc", {procs: more_details});
        }
        else if (css_class.search(/(catchfailure|catchsuccess|attractionfailure|stuck_snowball_catch)/) !== -1) {
            more_details.hunt_count++;
            logger.debug("Got a hunt record ", {procs: more_details});
            if (css_class.includes('active')) {
                journal = markup;
                logger.debug("Found the active hunt", {journal});
            }
        }
        else if (css_class.search(/linked|passive|misc/) !== -1) {
            // Ignore any friend hunts, trap checks, or custom loot journal entries.
        }
    });
    if (journal && Object.keys(journal).length) {
        // Only assign if there's an active hunt
        journal.more_details = more_details;
    }
    return journal;
}
