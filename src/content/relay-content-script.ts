import { ConsoleLogger } from "@scripts/util/logger";
import { Message, MessageType, AjaxXhrParams } from "./messaging/message";
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
        if (message.type === MessageType.BeforeAjaxRequestRequest) {
            return handleBeforeAjaxRequestRequestMessage(
                requestId,
                message.data
            );
        }

        if (message.type === MessageType.AfterAjaxResponseRequest) {
            return handleAfterAjaxReponseRequestMessage(
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

async function handleBeforeAjaxRequestRequestMessage(
    requestId: string,
    data: AjaxXhrParams
): Promise<Message | undefined> {

    return respondToAjaxEvent(
        "mousehuntAjaxRequest",
        MessageType.BeforeAjaxRequestResponse,
        requestId,
        data
    );
}

async function handleAfterAjaxReponseRequestMessage(
    requestId: string,
    data: AjaxXhrParams
): Promise<Message | undefined> {
    return respondToAjaxEvent(
        "mousehuntAjaxResponse",
        MessageType.AfterAjaxResponseResponse,
        requestId,
        data
    );
}

/**
 * Sends a message to the extension to handle the
 * ajax request/response and returns the result.
 *
 * @param command - The command to send to the extension.
 * @param type - The type of message, either BeforeAjaxRequestResponse or AfterAjaxResponseResponse.
 * @param requestId - The request ID of the message.
 * @param data - Data associated with the ajax request.
 */
async function respondToAjaxEvent(
    command: string,
    type:
        | MessageType.BeforeAjaxRequestResponse
        | MessageType.AfterAjaxResponseResponse,
    requestId: string,
    data: AjaxXhrParams
): Promise<Message | undefined> {

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
