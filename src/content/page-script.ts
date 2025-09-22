import { ConsoleLogger } from '@scripts/util/logger';
import { Messenger } from './messaging/messenger';
import { Message, MessageType } from './messaging/message';

/*
    The following code is loaded into the MAIN world context (has access to the page's JavaScript).
    and intercepts AJAX requests and responses to send them to the content script.
*/

(function (globalContext: Window) {

    const logger = new ConsoleLogger();
    const messenger = Messenger.forDOMCommunication(globalContext);

    logger.debug('MAIN WORLD ajax interceptor loaded');

    /**
     * Handles the request of an AJAX request by sending a message to the content script.
     *
     * @param requestId - The unique identifier for the request.
     * @param url - The URL of the request.
     * @param data - The request data.
     */
    async function handleRequest(requestId: string, url: string, data: unknown) {
        if (!isMouseHuntHostName(url)) {
            return;
        }

        const message: Message = {
            type: MessageType.BeforeAjaxRequestRequest,
            data: {
                requestId,
                url,
                body: data,
            },
        };

        try {
            logger.debug(`Sending request ${requestId} from ${url} to content script`, { data });

            const response = await messenger.request(message);
            if (response.type == null) {
                logger.debug("Page-script: No reply received from content script.");
                return;
            }

            if (response.type !== MessageType.BeforeAjaxRequestResponse) {
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
    async function handleResponse(requestId: string, url: string, body: unknown): Promise<void> {
        if (!isMouseHuntHostName(url)) {
            return;
        }

        const message: Message = {
            type: MessageType.AfterAjaxResponseRequest,
            data: {
                requestId,
                url,
                body,
            },
        };

        try {
            logger.debug(`Sending response ${requestId} from ${url} to content script`, { body });

            const response = await messenger.request(message);

            if (response.type == null) {
                logger.debug("Page-script: No reply received from content script.");
                return;
            }

            if (response.type !== MessageType.AfterAjaxResponseResponse) {
                throw new Error(`Unexpected response type: ${response.type}`);
            }
        }
        catch (error) {
            logger.error("An error occurred in the page-script handleResponse", error);
        }
    }

    /**
     * Checks if the hostname of the given URL is "www.mousehuntgame.com".
     *
     * @param url - The URL to check.
     * @returns `true` if the hostname is "www.mousehuntgame.com", otherwise `false`.
     */
    function isMouseHuntHostName(url: string): boolean {
        const urlObject = new URL(url);
        return urlObject.hostname === "www.mousehuntgame.com";
    }

    /**
     * Generate a random ID string to represent a request.
     * @example
     * createRequestId()
     * // 'f774b6c9c600f'
     */
    function createRequestId(): string {
        return Math.random().toString(16).slice(2);
    }

    $(document).on('ajaxSend', async function (event: JQuery.Event, xhr: JQuery.jqXHR, settings: JQuery.AjaxSettings) {
        /*
        Another common way to intercept request and do something async is to abort the request and then
        make the request again after the async operation is done. We can't do that here b/c aborting the
        original request makes MouseHunt think the call failed and reloads the page.

        We're going to work with the underlying XMLHttpRequest object to handle the request and response
        */

        // store the original XMLHttpRequest constructor
        const createXMLHttpRequest = settings.xhr;

        // override the XMLHttpRequest constructor with our own implementation
        settings.xhr = () => {
            const originalRequest = createXMLHttpRequest!();
            const originalSend = originalRequest.send;

            // Override initiation of request to do extension things before
            // sending the request
            originalRequest.send = async (...args) => {

                const requestId = createRequestId();
                await handleRequest(requestId, settings.url!, settings.data);

                originalRequest.addEventListener('loadend', async function () {
                    handleResponse(requestId, settings.url!, xhr.responseJSON);
                });
                originalSend.apply(originalRequest, args);
            };

            return originalRequest;
        };
    });

})(window);
