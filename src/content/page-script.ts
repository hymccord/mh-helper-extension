import { ConsoleLogger } from '@scripts/util/logger';
import { Messenger } from './messaging/messenger';
import { MessageType } from './messaging/message';
import { InterceptorService, RequestBody } from '@scripts/services/interceptor.service';
import { HgResponse } from '@scripts/types/hg';

/*
    The following code is loaded into the MAIN world context (has access to the page's JavaScript).
    and intercepts AJAX requests and responses to send them to the content script.
*/

(function (globalContext: Window) {

    const logger = new ConsoleLogger();
    const ajaxInterceptor = new InterceptorService(logger);
    const messenger = Messenger.forDOMCommunication(globalContext);

    logger.debug('MAIN WORLD ajax interceptor loaded');
    ajaxInterceptor.init();

    ajaxInterceptor.on('request', handleRequest);
    ajaxInterceptor.on('response', handleResponse);

    /**
     * Handles the request of an AJAX request by sending a message to the content script.
     *
     * @param requestId - The unique identifier for the request.
     * @param url - The URL of the request.
     * @param data - The request data.
     */
    async function handleRequest(args: { url: URL; request: RequestBody; requestId: string; }): Promise<void> {
        try {
            logger.debug(`Sending request ${args.requestId} from ${args.url} to content script`, { data: args.request });

            const response = await messenger.request({
                type: MessageType.BeforeFetchRequest,
                data: {
                    // @ts-expect-error
                    url: args.url.toString(),
                    request: args.request,
                    requestId: args.requestId,
                },
            });
            if (response.type == null) {
                logger.debug("Page-script: No reply received from content script.");
                return;
            }

            if (response.type !== MessageType.BeforeFetchResponse) {
                throw new Error(`Unexpected response type: ${response.type}`);
            }
        }
        catch (error) {
            logger.error("An error occurred in the page-script handleRequest", error);
        }
    }

    /**
     * Handles the response of an AJAX request by sending a message to the content script
     * and processing the response.
     *
     * @param requestId - The unique identifier for the request.
     * @param url - The URL of the request.
     * @param body - The response data from the AJAX request.
     * @returns A promise that resolves when the response has been handled.
     *
     * @throws Will throw an error if the response type is unexpected.
     */
    async function handleResponse(args: { url: URL, request: RequestBody, response: HgResponse, requestId: string }): Promise<void> {
        try {
            logger.debug(`Sending response ${args.requestId} from ${args.url} to content script`, { body: args.response });

            const response = await messenger.request({
                type: MessageType.AfterFetchRequest,
                data: {
                    // @ts-expect-error
                    url: args.url.toString(),
                    request: args.request,
                    response: args.response,
                    requestId: args.requestId,
                },
            });

            if (response.type == null) {
                logger.debug("Page-script: No reply received from content script.");
                return;
            }

            if (response.type !== MessageType.AfterFetchResponse) {
                throw new Error(`Unexpected response type: ${response.type}`);
            }
        }
        catch (error) {
            logger.error("An error occurred in the page-script handleResponse", error);
        }
    }
})(window);
