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
            requestId: string;
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
        this.interceptor.on('response', async ({response, isMockedResponse, request, requestId}) => this.handleResponse(response, request, requestId));
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
    }

    async handleResponse(response: Response, request: Request, requestId: string) {
        if (!this.isSupportedRequest(request) || !this.isSupportedResponse(response)) {
            return;
        }
        const responseClone = response.clone();
        const requestClone = request.clone();
        const requestBody = qs.parse(await requestClone.text());

        const responseBody = hgResponseSchema.safeParse(await responseClone.json());
        if (!responseBody.success) {
            this.logger.error(`Response ${response.url}`, responseBody.error, requestId, responseClone);
            return;
        }
        const responseData = responseBody.data;


        this.logger.debug(`Emitting response ${response.url}`, {
            response: responseData,
        });

        await this.emitAsync('response', {
            url: new URL(response.url),
            response: responseData,
            request: requestBody,
        });

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
