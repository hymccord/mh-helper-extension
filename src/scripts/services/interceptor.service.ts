import {BatchInterceptor, type ExtractEventNames} from '@mswjs/interceptors';
import {XMLHttpRequestInterceptor} from '@mswjs/interceptors/XMLHttpRequest';
import {FetchInterceptor} from '@mswjs/interceptors/fetch';
import {hgResponseSchema, type HgResponse} from '@scripts/types/hg';
import {LoggerService} from '@scripts/util/logger';
import qs from 'qs';
import {Emitter, Listener} from 'strict-event-emitter';
import {z} from 'zod';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InterceptorEventMap = {
    // request: [
    //     args: {
    //         url: URL;
    //         request: RequestBody;
    //         requestId: string;
    //     }
    // ],
    response: [
        args: {
            url: URL;
            response: HgResponse;
        }
    ],
    activeTurn: [
        args: {
            preResponse: HgResponse;
            postResponse: HgResponse;
        }
    ]
}

export interface RequestBody {
    [key: string]: undefined | string | RequestBody | (string | RequestBody)[];
}

export class InterceptorService {
    private readonly interceptor = new BatchInterceptor({
        name: 'mhct-interceptor',
        interceptors: [
            new XMLHttpRequestInterceptor(),
            new FetchInterceptor(),
        ]
    });
    private emitter: Emitter<InterceptorEventMap>;
    private activeTurnRequestId: string | null = null;
    private activeTurnPreFetch: HgResponse | null = null;

    constructor(private readonly logger: LoggerService) {
        this.emitter = new Emitter();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.interceptor.on('request', async ({request, requestId}) => this.handleRequest(request, requestId));

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.interceptor.on('response', async ({response, isMockedResponse, request, requestId}) => this.handleResponse(response, requestId));
    }

    public init(): void {
        this.interceptor.apply();
    }

    public on<EventName extends ExtractEventNames<InterceptorEventMap>>(
        eventName: EventName,
        listener: Listener<InterceptorEventMap[EventName]>
    ): this {
        this.emitter.on(eventName, listener);
        return this;
    }

    async emitAsync<EventName extends keyof InterceptorEventMap>(
        eventName: EventName,
        ...data: InterceptorEventMap[EventName]): Promise<void> {
        const listeners = this.emitter.listeners(eventName);

        if (listeners.length === 0) {
            return;
        }

        for (const listener of listeners) {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            await listener.apply(this.emitter, data);
        }
    }

    async handleRequest(request: Request, requestId: string): Promise<void> {
        if (!this.isSupportedRequest(request)) {
            return;
        }

        const requestClone = request.clone();
        const body = qs.parse(await requestClone.text());

        this.logger.debug(`Emitting request: ${request.url}`, body, requestId, requestClone);

        if (this.isActiveTurn(request)) {
            await this.fetchPreHuntData(body, requestId);
        }
        // await this.emitAsync('request', {
        //     url: new URL(request.url),
        //     request: body,
        //     requestId,
        // });
    }

    isActiveTurn(request: {url: string}) {
        const url = new URL(request.url);

        return url.pathname === '/managers/ajax/users/treasuremap_v2.php';
    }

    async fetchPreHuntData(request: RequestBody, requestId: string): Promise<void> {
        this.activeTurnRequestId = null;
        this.activeTurnPreFetch = null;

        const requestSchema = z.object({
            uh: z.string(),
            last_read_journal_entry_id: z.string(),
        });

        const parsedRequest = requestSchema.safeParse(request);
        if (!parsedRequest.success) {
            this.logger.error(`Invalid request data: ${parsedRequest.error.toString()}`);
            return;
        }
        const {uh, last_read_journal_entry_id} = parsedRequest.data;

        const preHuntResponse = await fetch('https://www.mousehuntgame.com/managers/ajax/pages/page.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'MHCT',
            },
            body: new URLSearchParams({
                sn: "Hitgrab",
                page_class: "Camp",
                hg_is_ajax: "1",
                last_read_journal_entry_id,
                uh,
            })
        });

        if (!preHuntResponse.ok) {
            this.logger.error(`Failed to fetch pre-hunt data: ${preHuntResponse.statusText}`);
            return;
        }
        const preHuntResponseBody = hgResponseSchema.safeParse(await preHuntResponse.json());
        if (!preHuntResponseBody.success) {
            this.logger.error(`Invalid pre-hunt response data: ${preHuntResponseBody.error.toString()}`);
            return;
        }

        this.activeTurnRequestId = requestId;
        this.activeTurnPreFetch = preHuntResponseBody.data;
        this.logger.debug(`Pre-hunt data fetched successfully`, this.activeTurnPreFetch);
    }

    async handleResponse(response: Response, requestId: string) {
        if (!this.isSupportedResponse(response)) {
            return;
        }
        const responseClone = response.clone();

        const responseBody = hgResponseSchema.safeParse(await responseClone.json());
        if (!responseBody.success) {
            this.logger.error(`Response ${response.url}`, responseBody.error, requestId, responseClone);
            return;
        }
        const responseData = responseBody.data;

        if (this.isActiveTurn(response)) {
            if (this.activeTurnRequestId !== requestId) {
                return;
            }

            if (this.activeTurnPreFetch === null) {
                this.logger.error(`Pre-hunt data is null for requestId: ${requestId}`);
                return;
            }

            this.logger.debug(`Emitting active turn response`, {
                preResponse: this.activeTurnPreFetch,
                postResponse: responseData,
            });

            await this.emitAsync('activeTurn', {
                preResponse: this.activeTurnPreFetch,
                postResponse: responseData,
            });
        } else {

            this.logger.debug(`Emitting response ${response.url}`, {
                response: responseData,
            });

            await this.emitAsync('response', {
                url: new URL(response.url),
                response: responseData,
            });
        }
    }

    isSupportedRequest(request: Request): boolean {
        const url = new URL(request.url);

        if (url.origin !== 'https://www.mousehuntgame.com') {
            return false;
        }

        if (url.pathname.startsWith('/api/')) {
            return false;
        }

        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.includes('application/x-www-form-urlencoded')) {
            return false;
        }

        return true;
    }

    isSupportedResponse(response: Response): boolean {
        const url = new URL(response.url);

        if (url.origin !== 'https://www.mousehuntgame.com') {
            return false;
        }

        if (url.pathname.startsWith('/api/')) {
            return false;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
            return true;
        }

        return false;
    }
}
