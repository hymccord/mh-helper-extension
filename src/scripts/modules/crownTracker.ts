import {ApiService} from '@scripts/services/api.service';
import {InterceptorService, RequestBody} from '@scripts/services/interceptor.service';
import {HgResponse} from '@scripts/types/hg';
import {LoggerService} from "@scripts/util/logger";
import {z} from 'zod';

export class CrownTracker {
    private readonly requestHunterProfileSchema = z.object({
        sn: z.literal('Hitgrab'),
        hg_is_ajax: z.literal('1'),
        page_class: z.literal('HunterProfile'),
        page_arguments: z.object({
            snuid: z.coerce.string(),
        }),
        last_read_journal_entry_id: z.coerce.number(),
        uh: z.string(),
    }).strict(); // .strict() is used to ensure that no extra properties are present in the request
    // to differentiate between a plain profile request and a King's Crown request
    private readonly requestKingsCrownSchema = z.object({
        page_class: z.literal('HunterProfile'),
        page_arguments: z.object({
            tab: z.literal('kings_crowns'),
            snuid: z.coerce.string(),
        }),
        last_read_journal_entry_id: z.coerce.number(),
        uh: z.string(),
    });
    private readonly responseKingsCrownSchema = z.object({
        page: z.object({
            tabs: z.object({
                kings_crowns: z.object({
                    subtabs: z.tuple([
                        z.object({
                            mouse_crowns: z.object({
                                badge_groups: z.array(z.object({
                                    name: z.string(),
                                    type: z.literal('bronze').or(z.literal('silver')).or(z.literal('gold')).or(z.literal('platinum')).or(z.literal('diamond')),
                                    count: z.coerce.number(),
                                }).or(z.object({
                                    type: z.literal('none'),
                                })))
                            })
                        })
                    ]).rest(z.unknown()),
                }),
            }),
        }),
    });
    private lastSentRequestTime: Date = new Date();
    private lastSnuid: string | null = null;

    constructor(private readonly logger: LoggerService,
        private readonly interceptorService: InterceptorService,
        private readonly apiService: ApiService
    ) { }

    public init(): void {
        this.interceptorService.on('request', ({url, request}) => this.handleRequest(url, request));

        this.interceptorService.on('response', ({url, request, response}) => this.handleResponse(url, request, response));
    }

    private handleRequest(url: URL, request: RequestBody): void {
        if (url.pathname !== '/managers/ajax/pages/page.php') {
            return;
        }

        const parsedRequest = this.requestHunterProfileSchema.safeParse(request);
        if (!parsedRequest.success) {
            return;
        }

        const data = parsedRequest.data;
        if (this.lastSnuid === data.page_arguments.snuid) {
            return;
        }

        // Throttle safety check
        const now = new Date();
        const timeSinceLastRequest = now.getTime() - this.lastSentRequestTime.getTime();
        if (timeSinceLastRequest < 5000) {
            this.logger.debug("Throttling King's Crown request");
            return;
        }

        this.lastSentRequestTime = now;
        // Request King's Crowns
        this.apiService.send("POST",
            "/managers/ajax/pages/page.php",
            {
                sn: "Hitgrab",
                hg_is_ajax: "1",
                page_class: "HunterProfile",
                page_arguments: {
                    legacyMode: "",
                    tab: "kings_crowns",
                    sub_tab: "false",
                    snuid: data.page_arguments.snuid,
                },
                last_read_journal_entry_id: data.last_read_journal_entry_id,
                uh: data.uh,
            },
            false,
        ).catch((error) => {
            this.logger.error("Failed to send request", error);
        });
    }

    private handleResponse(url: URL, request: RequestBody, response: HgResponse): void {
        if (url.pathname !== '/managers/ajax/pages/page.php') {
            return;
        }

        const parsedRequest = this.requestKingsCrownSchema.safeParse(request);
        if (!parsedRequest.success) {
            return;
        }

        const parsedResponse = this.responseKingsCrownSchema.safeParse(response);
        if (!parsedResponse.success) {
            this.logger.debug('Skipped crown submission due to unhandled XHR structure');
            window.postMessage({
                "mhct_log_request": 1,
                "is_error": true,
                "crown_submit_xhr_response": response,
                "reason": "Unable to determine King's Crowns",
            }, window.origin);
            return;
        }

        const mouseCrowns = parsedResponse.data.page.tabs.kings_crowns.subtabs[0].mouse_crowns;

        const payload = {
            user: parsedRequest.data.page_arguments.snuid,
            timestamp: Math.round(Date.now() / 1000),
            bronze: 0,
            silver: 0,
            gold: 0,
            platinum: 0,
            diamond: 0,
        };

        /** Rather than compute counts ourselves, use the `badge` display data.
         * badges: [
         *     {
         *         badge: (2500   | 1000     | 500  | 100    | 10),
         *         type: (diamond | platinum | gold | silver | bronze),
         *         mice: string[]
         *     },
         *     ...
         * ]
         */
        for (const badge of mouseCrowns.badge_groups) {
            if (badge.type === 'none') {
                continue;
            }

            payload[badge.type] = badge.count;
        }
        this.logger.debug("Crowns payload: ", payload);

        // Prevent other extensions (e.g. Privacy Badger) from blocking the crown
        // submission by submitting from the content script.
        window.postMessage({
            "mhct_crown_update": 1,
            "crowns": payload,
        }, window.origin);

        this.lastSnuid = parsedRequest.data.page_arguments.snuid;
    }
}

interface CrownTrackerExtensionMessage {
    [key: string]: unknown;
    command: string;
}

interface CrownTrackerExtensionMessageParam {message: CrownTrackerExtensionMessage}

interface CrownTrackerBackgroundExtensionMessageHandlers {
    [key: string]: CallableFunction;
    networkRequest: ({message}: CrownTrackerExtensionMessageParam) => Promise<unknown>;
}

export class CrownTrackerBackground {

    private readonly extensionMessageHandlers: CrownTrackerBackgroundExtensionMessageHandlers = {
        networkRequest: ({message}) => this.handleNetworkRequest(message),
    };
    constructor(private readonly logger: LoggerService){

    }

    init(): void {
        chrome.runtime.onMessage.addListener(this.handleExtensionMessage);
    }

    private async handleNetworkRequest(message: CrownTrackerExtensionMessage): Promise<unknown> {
    };

    private handleExtensionMessage = (
        message: CrownTrackerBackgroundExtensionMessage,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
    ) => {
        const handler: CallableFunction | undefined = this.extensionMessageHandlers[message?.command];
        if (!handler) {
            return null;
        }

        Promise.resolve(messageResponse)
            .then((response) => sendResponse(response))
            .catch((error) => this.logger.error("Error handling extension message", error));


        return true;
    };
}
