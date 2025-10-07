/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { z } from 'zod';

import type { IEnvironmentDetailer } from './modules/details/details.types';
import type { IStager } from './modules/stages/stages.types';
import type { ResponseEventParams } from './services/interceptor.service';
import type { UserSettings } from './services/settings/settings.service';
import type { HgResponse, Inventory, InventoryItem, JournalMarkup, User } from './types/hg';
import type { IntakeMessage, IntakeMessageBase, Loot } from './types/mhct';

import { IntakeRejectionEngine } from './hunt-filter/engine';
import * as successHandlers from './modules/ajax-handlers';
import { BadgeTimer } from './modules/badge-timer/badge-timer';
import { CrownTracker } from './modules/crown-tracker/crown-tracker';
import * as detailers from './modules/details';
import { ExtensionLog } from './modules/extension-log/extension-log';
import { JournalParser } from './modules/journal-parser/journal-parser';
import * as stagers from './modules/stages';
import { ApiService } from './services/api.service';
import { EnvironmentService } from './services/environment.service';
import { InterceptorService } from './services/interceptor.service';
import { ConsoleLogger, LogLevel } from './services/logging';
import { MouseRipApiService } from './services/mouserip-api.service';
import { SubmissionService } from './services/submission.service';
import { hgResponseSchema } from './types/hg';
import { intakeMessageBaseSchema, intakeMessageSchema } from './types/mhct';
import { diffObject } from './util/diffObject';
import { parseHgInt } from './util/number';

declare global {
    interface Window {
        jQuery: JQueryStatic;
        $: JQueryStatic;
        lastReadJournalEntryId: number;
        tsitu_loader_offset?: number;
    }

    // Direct globals (not on window)
    var user: User;
    var lastReadJournalEntryId: number;
}

(function () {
    let mhhh_version = 0;
    let hunter_id_hash = '0';
    let userSettings: UserSettings;
    let settingsPromise: Promise<UserSettings> | null = null;

    const isDev = process.env.ENV === 'development';
    const logger = new ConsoleLogger(isDev, shouldFilter);
    const extensionLog = new ExtensionLog();
    const apiService = new ApiService();
    const interceptorService = new InterceptorService(logger);
    const environmentService = new EnvironmentService();
    const rejectionEngine = new IntakeRejectionEngine(logger);
    const submissionService = new SubmissionService(logger, environmentService, apiService, getSettingsAsync,
        () => ({
            hunter_id_hash,
            mhhh_version,
        }),
        showFlashMessage
    );
    const journalParser = new JournalParser(logger, submissionService, extensionLog);
    const mouseRipApiService = new MouseRipApiService(apiService);
    const ajaxSuccessHandlers = [
        new successHandlers.BountifulBeanstalkRoomTrackerAjaxHandler(logger, showFlashMessage),
        new successHandlers.GWHGolemAjaxHandler(logger, showFlashMessage),
        new successHandlers.KingsGiveawayAjaxHandler(logger, submissionService, mouseRipApiService),
        new successHandlers.CheesyPipePartyAjaxHandler(logger, submissionService),
        new successHandlers.SBFactoryAjaxHandler(logger, submissionService),
        new successHandlers.SEHAjaxHandler(logger, submissionService),
        new successHandlers.SpookyShuffleAjaxHandler(logger, submissionService),
        new successHandlers.TreasureMapHandler(logger, submissionService),
        new successHandlers.UseConvertibleAjaxHandler(logger, submissionService),
    ];
    const crownTracker = new CrownTracker(logger, extensionLog, interceptorService, apiService, showFlashMessage);
    const badgeTimer = new BadgeTimer();

    async function main() {
        try {
            if (!window.jQuery) {
                throw new Error('Can\'t find jQuery.');
            }

            userSettings = await getSettingsAsync();
            await initialLoad();
            addWindowMessageListeners();
            addAjaxHandlers();
            finalLoad();

            if (userSettings['tracking-crowns']) {
                crownTracker.init();
            }
            badgeTimer.init();
        } catch (error) {
            logger.error('Failed to initialize.', error);
        }
    }

    async function getSettingsAsync(): Promise<UserSettings> {
    // If there's already a promise in progress, return it
        if (settingsPromise) {
            return settingsPromise;
        }

        settingsPromise = new Promise<UserSettings>((resolve, reject) => {
            const getSettingsTimeout = setTimeout(() => {
                window.removeEventListener('message', listenSettings);
                reject(new Error('Timeout waiting for settings.'));
            }, 60000);

            // Set up message listener
            function listenSettings(event: MessageEvent) {
                if (event.data.mhct_settings_response !== 1) {
                    return;
                }

                // Clean up
                clearTimeout(getSettingsTimeout);
                window.removeEventListener('message', listenSettings);

                resolve(event.data.settings as UserSettings);
            }

            window.addEventListener('message', listenSettings);
            window.postMessage({mhct_settings_request: 1}, '*');
        });

        try {
            const result = await settingsPromise;
            return result;
        } catch (error) {
        // Clear the promise on error so subsequent calls can retry
            settingsPromise = null;
            throw error;
        }
    }

    function getExtensionVersion() {
        const version = $('#mhhh_version').val() as string;

        // split version and convert to padded number number format
        // 0.0.0 -> 000000
        // 1.0.1 -> 100001

        const [major, minor, patch] = version.split('.');

        return Number(
            (major?.padStart(2, '0') ?? '00') +
            (minor?.padStart(2, '0') ?? '00') +
            (patch?.padStart(2, '0') ?? '00')
        );
    }

    // Create hunter id hash using Crypto Web API
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
    async function createHunterIdHash() {
        if (typeof user.user_id === 'undefined') {
            // No problem if user is not logged in yet.
            // This function will be called on logins (ajaxSuccess on session.php)
            logger.debug('User is not logged in yet.');
            return;
        }

        const user_id = user.user_id.toString().trim();
        const msgUint8 = new TextEncoder().encode(user_id);
        const hashBuffer = await crypto.subtle.digest('SHA-512', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hunter_id_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        logger.debug('createHunterIdHash:', {
            hunter_id: user_id,
            hunter_id_hash,
        });
    }

    async function initialLoad() {
        if (isDev) {
            logger.debug('Debug mode activated');
            logger.info('Test version detected, turning on debug mode and pointing to server on localhost');
        }

        logger.debug('initialLoad ran with settings', {userSettings});

        mhhh_version = getExtensionVersion();
        await createHunterIdHash();
    }

    function shouldFilter(level: LogLevel) {
        let filterLevel = LogLevel.Info;
        switch (userSettings['general-log-level'] ?? '') {
            case 'debug':
                filterLevel = LogLevel.Debug;
                break;
            case 'info':
                filterLevel = LogLevel.Info;
                break;
            case 'warn':
                filterLevel = LogLevel.Warn;
                break;
            case 'error':
                filterLevel = LogLevel.Error;
                break;
        }
        return !isDev && level <= filterLevel;
    };

    // Listening for calls
    function addWindowMessageListeners() {
        window.addEventListener('message', (ev) => {
            if (ev.data.mhct_message == null) {
                return;
            }

            if (ev.data.mhct_message === 'userhistory') {
                window.open(`${environmentService.getBaseUrl()}/searchByUser.php?hunter_id=${hunter_id_hash}`);
                return;
            }

            if (ev.data.mhct_message === 'mhmh'
                || ev.data.mhct_message === 'ryonn') {
                openMapMiceSolver(ev.data.mhct_message);
                return;
            }

            if ('tsitu_loader' === ev.data.mhct_message) {
                window.tsitu_loader_offset = ev.data.tsitu_loader_offset;
                openBookmarklet(ev.data.file_link);
                return;
            }
        }, false);
    }

    function openBookmarklet(menuURL: string) {
        void fetch(menuURL).then(response => response.text()).then((data) => {
            const url = new URL(menuURL);
            // FireFox will still have EXTENSION_URL in the code, so replace with origin of URL (moz-extension://<internal_uuid>/)
            data = data.replace('EXTENSION_URL', url.origin);
            document.location.href = 'javascript:void function(){' + data + '%0A}();';
        });
    }

    // Get map mice
    function openMapMiceSolver(solver: string) {
        let url = '';
        let glue = '';
        let method = '';
        let input_name = '';
        if (solver === 'mhmh') {
            url = environmentService.getMapHelperUrl();
            glue = '\n';
            method = 'POST';
            input_name = 'mice';
        } else if (solver === 'ryonn') {
            url = 'http://dbgames.info/mousehunt/tavern';
            glue = ';';
            method = 'GET';
            input_name = 'q';
        } else {
            return;
        }

        const mapId = user.quests.QuestRelicHunter?.default_map_id;

        if (!mapId) {
            alert('You are not currently a member of a treasure map.');
            return;
        }

        const payload = {
            'map_id': mapId,
            'action': 'map_info',
            'uh': user.unique_hash,
            'last_read_journal_entry_id': lastReadJournalEntryId,
            'X-Requested-By': `MHCT/${mhhh_version}`,
        };
        $.post('https://www.mousehuntgame.com/managers/ajax/users/treasuremap_v2.php', payload, null, 'json')
            .done((data) => {
                if (data) {
                    if (!data.treasure_map || data.treasure_map.view_state === 'noMap') {
                        return;
                    }
                    if (!['treasure', 'event'].includes(data.treasure_map.map_class)) {
                        alert('This seems to be a new kind of map and not yet supported.');
                        return;
                    }
                    const mice = getMapMice(data, true);
                    $('<form method="' + method + '" action="' + url + '" target="_blank">' +
                        '<input type="hidden" name="' + input_name + '" value="' + mice.join(glue) +
                        '"></form>').appendTo('body').submit().remove();
                }
            });
    }

    // Extract map mice from a map
    function getMapMice(data: any, uncaught_only: boolean) {
        const mice: Record<string, string> = {};
        $.each(data.treasure_map.goals.mouse, (key, mouse) => {
            mice[mouse.unique_id] = mouse.name;
        });

        if (uncaught_only) {
            $.each(data.treasure_map.hunters, (key, hunter) => {
                $.each(hunter.completed_goal_ids.mouse, (key, mouse_id) => {
                    delete mice[mouse_id];
                });
            });
        }

        return Object.values(mice);
    }

    /**
     * Wrapper for flash message pop-up, when settings need to be acquired.
     * @param {"error"|"warning"|"success"} type The type of message being displayed, which controls the color and duration.
     * @param {string} message The message content to display.
     */
    function showFlashMessage(type: string, message: string) {
        window.postMessage({
            mhct_display_message: 1,
            type,
            message,
        });
    }

    /**
     * Before allowing a hunt submission, first request an updated user object that reflects the effect
     * of any outside actions, such as setup changes from the mobile app, a different tab, or trap checks.
     */
    function setupPreHuntFetch() {
        interceptorService.on('request', async (requestEvent) => {
            if (requestEvent.url.pathname !== '/managers/ajax/turns/activeturn.php') {
                return;
            }

            logger.debug('Fetching user object before hunting', performance.now());
            const pageResponse = await apiService.send('POST',
                '/managers/ajax/pages/page.php',
                {
                    sn: 'Hitgrab',
                    hg_is_ajax: 1,
                    page_class: 'Camp',
                    last_read_journal_entry_id: lastReadJournalEntryId,
                    uh: user.unique_hash
                },
                true
            );

            const handleResponse = (responseEvent: ResponseEventParams) => {
                if (responseEvent.requestId !== requestEvent.requestId) {
                    return;
                }

                interceptorService.off('response', handleResponse);
                void recordHuntWithPrehuntUser(pageResponse, responseEvent.response);
            };

            interceptorService.on('response', handleResponse);
        });
    }

    // Listening routers
    function addAjaxHandlers() {
        if (userSettings['tracking-hunts']) {
            setupPreHuntFetch();
        }

        interceptorService.on('request', async (details) => {
            if (details.url.pathname === '/managers/ajax/users/session.php') {
                await createHunterIdHash();
            }
        });

        if (userSettings['tracking-events']) {
            interceptorService.on('response', async (details) => {
                for (const handler of ajaxSuccessHandlers) {
                    if (handler.match(details.url.toString())) {
                        try {
                            await handler.execute(details.response);
                        } catch (e) {
                            logger.error(`AJAX handler failed for ${handler.constructor.name}`, {
                                error: e,
                                ...details
                            });
                        }
                    }
                }
            });
        }
    }

    /**
     * @param {string} rawPreResponse String representation of the response from calling page.php
     * @param {string} rawPostResponse String representation of the response from calling activeturn.php
     */
    async function recordHuntWithPrehuntUser(rawPreResponse: unknown, post_response: HgResponse) {
        const safeParseResultPre = hgResponseSchema.safeParse(rawPreResponse);

        if (!safeParseResultPre.success) {
            logger.warn('Unexpected pre hunt response type received', z.prettifyError(safeParseResultPre.error));

            return;
        }

        const pre_response = safeParseResultPre.data;

        // General data flow
        // - Validate API response object
        // - Validate User object
        // - Parse journal
        // - Create pre + post messages from validated responses
        // - Validate pre + post message differences (rules then allowed exemptions)

        // This will throw out any hunts where the page.php or activeturn.php calls fail to return
        // the expected objects (success, active turn, needing a page object on pre)
        let validated = rejectionEngine.validateResponse(pre_response, post_response);
        if (!validated) {
            return;
        }

        const user_pre = pre_response.user;
        const user_post = post_response.user;
        validated = rejectionEngine.validateUser(user_pre, user_post);
        if (!validated) {
            return;
        }

        logger.debug('User object diff',
            diffObject({}, user_pre, user_post)
        );

        /**
         *
         * @param before The pre-hunt object
         * @param after The post-hunt object
         * @param hunt Journal entry corresponding with the hunt
         * @returns
         */
        async function createIntakeMessage(
            before: HgResponse,
            after: HgResponse
        ): Promise<{message_pre: IntakeMessage, message_post: IntakeMessage}> {
            const journalParseResult = await journalParser.execute(before, after);
            if (!journalParseResult.markup || Object.keys(journalParseResult.markup).length === 0) {
                throw new Error('Missing journal info');
            }
            const huntJournalMarkup = journalParseResult.markup;

            const preMessageBase = createMessageFromHunt(huntJournalMarkup, before);
            const postMessageBase = createMessageFromHunt(huntJournalMarkup, after);

            const message_pre: IntakeMessage = preMessageBase as IntakeMessage;
            const message_post: IntakeMessage = postMessageBase as IntakeMessage;

            // Perform validations and stage corrections.
            fixLGLocations(message_pre);
            fixLGLocations(message_post);

            addStage(message_pre, before.user, after.user, huntJournalMarkup);
            addStage(message_post, after.user, after.user, huntJournalMarkup);

            addHuntDetails(message_pre, before.user, after.user, huntJournalMarkup, journalParseResult.details);
            addHuntDetails(message_post, after.user, after.user, huntJournalMarkup, journalParseResult.details);

            const loot = parseLoot(huntJournalMarkup, after.inventory);
            if (loot && loot.length > 0) {
                message_pre.loot = loot;
                message_post.loot = loot;
            }

            const checkPreResult = intakeMessageSchema.safeParse(message_pre);
            const checkPostResult = intakeMessageSchema.safeParse(message_post);
            if (!checkPreResult.success || !checkPostResult.success) {
                const issues = [];
                if (!checkPreResult.success) {
                    issues.push(z.prettifyError(checkPreResult.error));
                }
                if (!checkPostResult.success) {
                    issues.push(z.prettifyError(checkPostResult.error));
                }
                throw new Error(`Failed to create intake message. Issues:\n\n${issues.join('\n\n')}`);
            }

            return {
                message_pre: checkPreResult.data,
                message_post: checkPostResult.data,
            };
        }

        let message_pre;
        let message_post;
        try {
            // Create two intake messages. One based on pre-response. The other based on post-response.
            ({message_pre, message_post} = await createIntakeMessage(pre_response, post_response));
        } catch (error) {
            logger.error('Something went wrong creating message', error);
        }

        if (message_pre == null || message_post == null) {
            logger.warn('Critical user data missing; cannot record hunt. See error log.');
            return;
        }

        // Validate the differences between the two intake messages
        validated = rejectionEngine.validateMessage(message_pre, message_post);
        if (!validated) {
            // collect limited info for stage and location rejections
            const invalidProperties = rejectionEngine.getInvalidIntakeMessageProperties(message_pre, message_post);
            if (invalidProperties.has('stage') || invalidProperties.has('location')) {
                const rejection_message = createRejectionMessage(message_pre, message_post);
                void submissionService.submitRejection(rejection_message);
            }

            return;
        }

        logger.debug('Recording hunt', {message: message_pre, user_pre, user_post});
        // Upload the hunt record.
        void submissionService.submitHunt(message_pre);
    }

    /**
     * Initialize the message with main hunt details.
     * @param journal The journal entry corresponding to the active hunt.
     * @param hgResponse The HG response containing user and inventory data.
     * @returns The message object, or `null` if an error occurred.
     */
    function createMessageFromHunt(journal: JournalMarkup, hgResponse: HgResponse): IntakeMessageBase {
        const user = hgResponse.user;

        const message: Partial<IntakeMessageBase> = {};

        message.entry_id = journal.render_data.entry_id;
        message.entry_timestamp = journal.render_data.entry_timestamp;

        if (!user.environment_name) {
            throw new Error('Missing user location');
        }

        message.location = {
            name: user.environment_name,
            id: user.environment_id,
        };

        message.shield = user.has_shield;
        message.total_power = user.trap_power;
        message.total_luck = user.trap_luck;
        message.attraction_bonus = Math.round(user.trap_attraction_bonus * 100);

        type PropFields = 'weapon' | 'base' | 'trinket' | 'bait';
        type ComponentFields = 'trap' | 'base' | 'cheese' | 'charm';
        const components: {
            prop: PropFields;
            message_field: ComponentFields;
            required: boolean;
            replacer: RegExp;
            [key: string]: unknown;
        }[] = [
            {prop: 'weapon', message_field: 'trap', required: true, replacer: / trap$/i},
            {prop: 'base', message_field: 'base', required: true, replacer: / base$/i},
            {prop: 'bait', message_field: 'cheese', required: true, replacer: / cheese$/i},
            {prop: 'trinket', message_field: 'charm', required: false, replacer: / charm$/i},
        ];

        for (const component of components) {
            const prop_name: keyof User = `${component.prop}_name`;
            const prop_id: keyof User = `${component.prop}_item_id`;
            const item_name = user[prop_name];
            const item_id = user[prop_id];
            if (item_name == null || item_id == null) {
                if (component.required) {
                    throw new Error(`Missing required setup component: ${component.message_field}`);
                }
            }

            message[component.message_field] = {
                id: item_id ?? 0,
                name: item_name ? item_name.replace(component.replacer, '') : '',
            };
        }

        // Caught / Attracted / FTA'd
        const journal_css = journal.render_data.css_class;
        if (journal_css.includes('attractionfailure')) {
            message.caught = 0;
            message.attracted = 0;
        } else if (journal_css.includes('catch')) {
            message.attracted = 1;
            if (journal_css.includes('catchsuccess')) {
                message.caught = 1;
            } else if (journal_css.includes('catchfailure')) {
                message.caught = 0;
            } else {
                throw new Error(`Unknown "catch" journal css: ${journal_css}`);
            }
            // Remove HTML tags and other text around the mouse name.
            message.mouse = journal.render_data.text
                .replace(/^.*?;">/, '') // Remove all text through the first sequence of `;">`
                .replace(/<\/a>.*/i, '') // Remove text after the first <a href>'s closing tag </a>
                .replace(/ mouse$/i, ''); // Remove " [Mm]ouse" if it is not a part of the name (e.g. Dread Pirate Mousert)
        }

        // Auras
        if (hgResponse.trap_image != null) {
            message.auras = Object.keys(hgResponse.trap_image.auras).filter(codename => hgResponse.trap_image!.auras[codename].status === 'active');
        }

        const baseMessageParseResult = intakeMessageBaseSchema.safeParse(message);
        if (!baseMessageParseResult.success) {
            throw new Error(`Base message failed validation:\n${z.prettifyError(baseMessageParseResult.error)}`);
        }

        return baseMessageParseResult.data;
    }

    /**
     * Creates rejection event info containing information about location, stage, and mouse
     * @param pre
     * @param post
     */
    function createRejectionMessage(pre: IntakeMessage, post: IntakeMessage) {
        return {
            pre: createEventObject(pre),
            post: createEventObject(post),
        };

        function createEventObject(message: IntakeMessage) {
            return {
                location: message.location.name,
                stage: message.stage,
                mouse: message.mouse,
            };
        }
    }

    /**
     * Fixes location IDs for Living & Twisted Garden areas.
     * @param message The message to be sent
     * @returns
     */
    function fixLGLocations(message: IntakeMessageBase) {
        const environmentMap: Record<string, number> = {
            'Cursed City': 5000,
            'Sand Crypts': 5001,
            'Twisted Garden': 5002,
        };

        if (message.location.name in environmentMap) {
            message.location.id = environmentMap[message.location.name];
        }
    }

    const location_stager_lookup: Record<string, IStager> = {};
    for (const stager of stagers.stageModules) {
        location_stager_lookup[stager.environment] = stager;
    }

    /**
     * Use `quests` or `viewing_atts` data to assign appropriate location-specific stage information.
     * @param message The message to be sent
     * @param user The user state object, when the hunt was invoked (pre-hunt).
     * @param user_post The user state object, after the hunt.
     * @param hunt The journal entry corresponding to the active hunt
     */
    function addStage(message: IntakeMessage, user: User, user_post: User, hunt: JournalMarkup) {
        // IStagers
        const stager = location_stager_lookup[user.environment_name];
        if (stager) {
            stager.addStage(message, user, user_post, hunt);
        }
    }

    const location_detailer_lookup: Record<string, IEnvironmentDetailer> = {};
    for (const detailer of detailers.environmentDetailerModules) {
        location_detailer_lookup[detailer.environment] = detailer;
    }

    /**
     * Determine additional detailed parameters that are otherwise only visible to db exports and custom views.
     * These details may eventually be migrated to help inform location-specific stages.
     * @param message The message to be sent.
     * @param user The user state object, when the hunt was invoked (pre-hunt).
     * @param user_post The user state object, after the hunt.
     * @param hunt The journal entry corresponding to the active hunt.
     */
    function addHuntDetails(message: IntakeMessage, user: User, user_post: User, hunt: JournalMarkup, more_details: Record<string, unknown>) {
        // First, get any location-specific details:
        let locationHuntDetails: Record<string, any> | undefined = {};
        const detailer = location_detailer_lookup[user.environment_name];
        if (detailer) {
            locationHuntDetails = detailer.addDetails(message, user, user_post, hunt);
        }

        // Then, get any global hunt details (such as from ongoing events, auras, etc).
        const globalHuntDetails = detailers.globalDetailerModules
            .map(detailer => detailer.addDetails(message, user, user_post, hunt))
            .filter(details => details);

        // Finally, merge the details objects and add it to the message.
        if (locationHuntDetails || globalHuntDetails.length >= 0) {
            message.hunt_details = Object.assign({}, locationHuntDetails, ...globalHuntDetails, more_details);
        }
    }

    /**
     * Extract loot information from the hunt's journal entry.
     * @param hunt The journal entry corresponding to the active hunt.
     * @param inventory The inventory object in hg server response, has item info
     */
    function parseLoot(hunt: JournalMarkup, inventory: Inventory | undefined): Loot[] | undefined {
        const getItemFromInventoryByType = (itemType: string): InventoryItem | undefined => {
            if (inventory != null && !Array.isArray(inventory)) {
                return inventory[itemType];
            }
        };

        let hunt_description = hunt.render_data.text;
        if (!hunt_description.includes('following loot:')) { return; }

        hunt_description = hunt_description.substring(hunt_description.indexOf('following loot:') + 15);
        // Use a stricter regex to split on closing anchor tags like </a> with optional whitespace
        const loot_array = hunt_description.split(/<\/a\s*>/gi).filter(i => i.trim());
        const lootList = [];
        for (const item_text of loot_array) {
            const item_name = /item\.php\?item_type=(.*?)"/.exec(item_text)?.[1];
            const item_amount = parseHgInt(/\d+[\d,]*/.exec(item_text)?.[0] ?? '0');
            const plural_name = $($.parseHTML(item_text)).filter('a').text();

            const inventory_item = getItemFromInventoryByType(item_name ?? '');
            if (!inventory_item) {
                logger.debug(`Looted "${item_name}", but it is not in user inventory`);
                continue;
            }

            const loot_object = {
                amount: item_amount,
                lucky: item_text.includes('class="lucky"'),
                id: inventory_item.item_id,
                name: inventory_item.name,
                plural_name: item_amount > 1 ? plural_name : '',
            };

            logger.debug('Loot object', {loot_object});

            lootList.push(loot_object);
        }

        return lootList;
    }

    function escapeButtonClose() {
        if (userSettings['enhancement-escape-dismiss'] === false) {
            return;
        }

        $(document).on('keyup', (e: JQuery.KeyUpEvent) => {
            const elements = $('a[id*=jsDialogClose],input[class*=jsDialogClose],a[class*=messengerUINotificationClose],a[class*=closeButton],input[value*=Close]');
            if (elements.length === 0) {
                return;
            }

            if (e.key === 'Escape' && elements.length > 0) {
                elements.each(function () {
                    $(this).trigger('click');
                });
            }
        });
    }

    // Finish configuring the extension behavior.
    function finalLoad() {
        escapeButtonClose();

        // Tell content script we are done loading
        window.postMessage({
            mhct_finish_load: 1,
        }, window.origin);

        logger.info(`Helper Extension version ${isDev ? 'DEV' : mhhh_version} loaded! Good luck!`);
    }

    void main();
}());
