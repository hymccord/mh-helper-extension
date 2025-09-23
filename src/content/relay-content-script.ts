import { ConsoleLogger } from "@scripts/util/logger";
import { AjaxRequestParams, AjaxResponseParams, Message, MessageType } from "./messaging/message";
import { MessageWithMetadata, Messenger } from "./messaging/messenger";

/*
  Content script that listens for messages from the page script and sends them to the extension background.
*/

const logger = new ConsoleLogger();
const messenger = Messenger.forDOMCommunication(globalThis.window);
messenger.handler = handlePageScriptMessage;

async function handlePageScriptMessage(
    message: MessageWithMetadata,
    abortController: AbortController
) {
    const requestId = Date.now().toString();
    const abortHandler = () =>
        sendExtensionMessage("mhctAbortRequest", {
            abortedRequestId: requestId,
        });
    abortController.signal.addEventListener("abort", abortHandler);

    logger.info("Content Script: Handle message from page-script", message);
    try {
        if (message.type === MessageType.BeforeFetchRequest) {
            return handleBeforeFetchRequestMessage(
                requestId,
                message.data
            );
        }

        if (message.type === MessageType.AfterFetchRequest) {
            return handleAfterFetchRequestMessage(
                requestId,
                message.data
            );
        }
    }
    catch {
        logger.debug("Content Script: runtime didn't response");
    } finally {
        abortController.signal.removeEventListener("abort", abortHandler);
    }
}

async function handleBeforeFetchRequestMessage(
    requestId: string,
    data: AjaxRequestParams
): Promise<Message | undefined> {

    return responseToFetchEvent(
        "mouseHuntFetchRequest",
        MessageType.BeforeFetchResponse,
        requestId,
        data
    );
}

async function handleAfterFetchRequestMessage(
    requestId: string,
    data: AjaxRequestParams
): Promise<Message | undefined> {
    return responseToFetchEvent(
        "mouseHuntFetchResponse",
        MessageType.AfterFetchResponse,
        requestId,
        data
    );
}

/**
 * Sends a message to the extension to handle the
 * ajax request/response and returns the result.
 *
 * @param command - The command to send to the extension.
 * @param type - The type of message, either BeforeFetchResponse or AfterFetchResponse.
 * @param requestId - The request ID of the message.
 * @param data - Data associated with the ajax request.
 */
async function responseToFetchEvent(
    command: string,
    type:
        | typeof MessageType.BeforeFetchResponse
        | typeof MessageType.AfterFetchResponse,
    requestId: string,
    data: AjaxRequestParams | AjaxResponseParams
): Promise<Message | undefined> {

    data.url = new URL(data.url); // Ensure URL is a URL object
    const result = await sendExtensionMessage(command, { data, requestId });

    if (result && result.error !== undefined) {
        return Promise.reject(result.error);
    }

    return Promise.resolve({ type, result });
}

/**
 * Sends a message to the extension (the background script).
 *
 * @param command - The command to send.
 * @param options - The options to send with the command.
 */
async function sendExtensionMessage(
    command: string,
    options: Record<string, unknown> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | void> {
    try {
        return await chrome.runtime.sendMessage(
            Object.assign({ command }, options)
        );
    } catch (error) {
        logger.error("Content Script: An error occurred sending extension message", error);
    }
}
