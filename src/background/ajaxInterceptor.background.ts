import { LoggerService } from "@scripts/util/logger";
import { AjaxRequestParams, AjaxResponseParams } from "src/content/messaging/message";

export interface IAjaxInterceptorService {
    subscribe<K extends keyof AjaxEventMap>(
        event: K,
        callback: (data: AjaxEventMap[K]) => Promise<void>
    ): void;
}

interface AjaxEventMap {
    ajaxRequest: AjaxRequestParams
    ajaxResponse: AjaxResponseParams
}

export class AjaxInterceptorService implements IAjaxInterceptorService {
    private subscribers: { [K in keyof AjaxEventMap]?: ((data: AjaxEventMap[K]) => Promise<void>)[] } = {};

    private readonly extensionMessageHandlers: InterceptorBackgroundExtensionMessageHandlers = {
        mouseHuntFetchRequest: ({ message }) => this.ajaxRequest(message),
        mouseHuntFetchResponse: ({ message }) => this.ajaxResponse(message),
    };

    constructor(private logger: LoggerService) {

        chrome.runtime.onInstalled.addListener(async (details) => {

            const tabs = await chrome.tabs.query({ url: ["https://www.mousehuntgame.com/*", "https://apps.facebook.com/mousehunt/*"] });
            for (const tab of tabs) {
                if (!tab.id) {
                    continue;
                }

                await chrome.tabs.reload(tab.id);
            }

            this.logger.debug("Extension installed.", details);
        });
    }

    async init() {
        chrome.runtime.onMessage.addListener(this.handleExtensionMessage);
        await this.injectContentScriptsInTabs();
    }

    private async injectContentScriptsInTabs() {
        this.logger.debug("registering interceptor content scripts");

        await chrome.scripting.registerContentScripts([
            {
                id: "content-script",
                matches: ["https://www.mousehuntgame.com/*"],
                allFrames: true,
                js: ["content/relay-content-script.js"],
                // world: "ISOLATED",
                runAt: "document_end",
            },
            {
                id: "page-script",
                matches: ["https://www.mousehuntgame.com/*"],
                allFrames: true,
                js: ["content/page-script.js"],
                world: "MAIN",
                runAt: "document_end",
            },
        ]);
    }

    subscribe<K extends keyof AjaxEventMap>(
        event: K,
        callback: (data: AjaxEventMap[K]) => Promise<void>
    ) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }

        this.subscribers[event]?.push(callback);
    }

    private handleExtensionMessage = (
        message: InterceptorExtensionMessage,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
    ) => {
        const handler: CallableFunction | undefined = this.extensionMessageHandlers[message?.command];
        if (!handler) {
            return false;
        }

        this.logger.debug("Background: received extension message", message);

        const messageResponse = handler({ message, sender });
        if (typeof messageResponse === "undefined") {
            return false;
        }

        return Promise.resolve(messageResponse)
            .then(
                (response) => sendResponse(response),
                (error) => sendResponse({error: { ...error, message: error.message } })
            )
            .catch(this.logger.error);

        // return true to indicate that sendResponse will be used asynchronously
        // chrome doesn't support returning promises yet https://issues.chromium.org/issues/40753031
        // return true;
    };

    private async ajaxRequest(message: InterceptorExtensionMessage): Promise<void> {
        if (message.data == null || typeof message.data.request !== "object") {
            this.logger.warn("interceptor request wasn't an object", message.data);
            return;
        }

        const params = message.data.request.params;
        const requestId = message.data.requestId;
        const url = new URL(message.data.url);
        this.logger.debug(`broadcasting ajaxRequest ${requestId} from ${url}`, { params });

        const callbacks = this.subscribers.ajaxRequest;
        if (!callbacks) {
            return;
        }

        try {
            // race callbacks with 5 second timeout
            await Promise.race([
                Promise.all(callbacks.map((callback) => callback(message.data!))),
                new Promise<void>((resolve) => setTimeout(resolve, 5000)),
            ]);
        } finally {

        }
    }

    private async ajaxResponse(message: InterceptorExtensionMessage) {
        if (message.data == null || typeof message.data.request !== "object") {
            this.logger.warn("interceptor response wasn't an object", message.data);
            return;
        }

        this.logger.debug("broadcasting ajaxResponse", message.data);

        const callbacks = this.subscribers.ajaxResponse;
        if (!callbacks) {
            return;
        }

        try {
            await Promise.all(callbacks.map((callback) => callback(message.data!)));
        } catch (error) {
            this.logger.error("Error broadcasting ajaxResponse", error);
        }
    }

    // private handleFetchRequest = async <T>(
    //     { requestId, data }: InterceptorExtensionMessage,
    //     tab: chrome.tabs.Tab,
    //     callback: (
    //         data: AjaxRequestParams | AjaxResponseParams,
    //         tab: chrome.tabs.Tab,
    //     ) => Promise<T>,
    // ) => {
    //     return await callback(data, tab);
    // }
}

interface InterceptorExtensionMessage {
    [key: string]: unknown;
    command: string;
    hostname?: string;
    origin?: string;
    requestId?: string;
    abortedRequestId?: string;
    data?: AjaxRequestParams | AjaxResponseParams;
}

interface InterceptorExtensionMessageEventParams {
    message: InterceptorExtensionMessage;
    sender: chrome.runtime.MessageSender;
}

interface InterceptorBackgroundExtensionMessageHandlers {
    [key: string]: CallableFunction;
    mouseHuntFetchRequest: ({
        message,
    }: InterceptorExtensionMessageEventParams) => void;
    mouseHuntFetchResponse: ({
        message,
    }: InterceptorExtensionMessageEventParams) => void;
}
