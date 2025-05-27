import {BatchInterceptor, type ExtractEventNames} from '@mswjs/interceptors';
import {XMLHttpRequestInterceptor} from '@mswjs/interceptors/XMLHttpRequest';
import {FetchInterceptor} from '@mswjs/interceptors/fetch';
import {hgResponseSchema, type HgResponse} from '@scripts/types/hg';
import {LoggerService} from '@scripts/util/logger';
import qs from 'qs';
import {Emitter, Listener} from 'strict-event-emitter';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InterceptorEventMap = {
    request: [
        args: {
            url: URL;
            request: RequestBody;
        }
    ],
    response: [
        args: {
            url: URL;
            request: RequestBody;
            response: HgResponse;
        }
    ],
}

export interface RequestBody {
    [key: string]: undefined | string | RequestBody | (string | RequestBody)[];
}


/**
 * Service for intercepting HTTP requests and responses from MouseHunt game endpoints.
 *
 * This service uses the MSW (Mock Service Worker) interceptor to monitor XMLHttpRequest
 * and Fetch API calls, specifically targeting MouseHunt game AJAX endpoints. It validates
 * requests and responses, parses the data, and emits events for consumption by other
 * parts of the application.
 */
export class InterceptorService {
    private readonly interceptor = new BatchInterceptor({
        name: 'mhct-interceptor',
        interceptors: [
            new XMLHttpRequestInterceptor(),
            new FetchInterceptor(),
        ]
    });
    private emitter: Emitter<InterceptorEventMap>;

    constructor(private readonly logger: LoggerService) {
        this.emitter = new Emitter();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.interceptor.on('request', async ({request, requestId}) => this.processRequest(request, requestId));

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.interceptor.on('response', async ({response, request, requestId}) => this.processResponse(response, request, requestId));

        this.interceptor.apply();
    }

    public on<EventName extends ExtractEventNames<InterceptorEventMap>>(
        eventName: EventName,
        listener: Listener<InterceptorEventMap[EventName]>
    ): this {
        this.emitter.on(eventName, listener);
        return this;
    }

    async emitEventAsync<EventName extends keyof InterceptorEventMap>(
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

    async processRequest(request: Request, requestId: string): Promise<void> {
        if (!this.isValidMouseHuntRequest(request)) {
            return;
        }

        const body = qs.parse(await request.clone().text());

        this.logger.debug(`Emitting request: ${request.url}`, body, requestId);
        await this.emitEventAsync('request', {
            url: new URL(request.url),
            request: body,
        });
    }

    async processResponse(response: Response, request: Request, requestId: string) {
        if (!this.isValidMouseHuntRequest(request) || !this.isValidMouseHuntResponse(response)) {
            return;
        }
        const responseJson = response.clone().json();
        const responseBody = hgResponseSchema.safeParse(responseJson);
        if (!responseBody.success) {
            this.logger.error(`Response ${response.url}`, responseBody.error, requestId, responseJson);
            return;
        }
        const responseData = responseBody.data;

        const requestBody = qs.parse(await request.clone().text());

        this.logger.debug(`Emitting response ${response.url}`, {
            response: responseData,
        });

        await this.emitEventAsync('response', {
            url: new URL(response.url),
            response: responseData,
            request: requestBody,
        });

    }

    isValidMouseHuntRequest(request: Request): boolean {
        const url = new URL(request.url);

        if (!this.isMouseHuntOrigin(url) || !this.isAjaxEndpoint(url)) {
            return false;
        }

        const contentType = request.headers.get('content-type') ?? '';
        return contentType.includes('application/x-www-form-urlencoded');
    }

    isValidMouseHuntResponse(response: Response): boolean {
        const url = new URL(response.url);

        if (!this.isMouseHuntOrigin(url) || !this.isAjaxEndpoint(url)) {
            return false;
        }

        const contentType = response.headers.get('content-type') ?? '';
        return contentType.includes('application/json') || contentType.includes('text/javascript');
    }

    private isMouseHuntOrigin(url: URL): boolean {
        return url.origin === 'https://www.mousehuntgame.com';
    }

    private isAjaxEndpoint(url: URL): boolean {
        return url.pathname.startsWith('/managers/ajax/');
    }
}
