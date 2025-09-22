import { LoggerService } from "@scripts/util/logger";
import { AjaxXhrParams } from "src/content/messaging/message";

export interface IAjaxInterceptorService {
    subscribe<K extends keyof AjaxEventMap>(
        event: K,
        callback: (data: AjaxEventMap[K]) => Promise<void>
    ): void;
}

interface AjaxEventMap {
    ajaxRequest: {
        requestId: string;
        url: URL;
        params: Record<string, string>;
    };
    ajaxResponse: {
        requestId: string;
        url: URL;
        response: unknown;
    };
}
export class AjaxInterceptorService implements IAjaxInterceptorService {
    private subscribers: { [K in keyof AjaxEventMap]?: ((data: AjaxEventMap[K]) => Promise<void>)[] } = {};

    private readonly extensionMessageHandlers: InterceptorBackgroundExtensionMessageHandlers =
        {
            mousehuntAjaxRequest: ({ message }) => this.ajaxRequest(message),
            mousehuntAjaxResponse: ({ message }) => this.ajaxResponse(message),
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
                id: "ajax-interceptor",
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

        Promise.resolve(messageResponse)
            .then(
                (response) => sendResponse(response),
                (error) => sendResponse({error: { ...error, message: error.message } })
            )
            .catch(this.logger.error);

        // return true to indicate that sendResponse will be used asynchronously
        // chrome doesn't support returning promises yet https://issues.chromium.org/issues/40753031
        return true;
    };

    private async ajaxRequest(message: InterceptorExtensionMessage) {
        if (message.data == null || typeof message.data.body !== "string") {
            this.logger.warn("interceptor request body wasn't a string", message.data);
            return;
        }

        // requests should be x-www-form-urlencoded
        const requestId = message.data.requestId;
        const url = new URL(message.data.url);
        const params = Object.fromEntries(
            new URLSearchParams(message.data.body)
        );

        this.logger.debug(`broadcasting ajaxRequest ${requestId} from ${url}`, { params });

        const callbacks = this.subscribers.ajaxRequest;
        if (!callbacks) {
            return;
        }

        // race callbacks with 5 second timeout
        await Promise.race([
            Promise.all(callbacks.map((callback) => callback({ requestId, url, params }))),
            new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
    }

    private async ajaxResponse(message: InterceptorExtensionMessage) {
        if (message.data == null || typeof message.data.body !== "object") {
            this.logger.warn("interceptor response body wasn't an object", message.data);
            return;
        }

        // responses should be JSON
        try {
            const response = message.data.body;

            const requestId = message.data.requestId;
            const url = new URL(message.data.url);

            this.logger.debug(`broadcasting ajaxResponse ${requestId} from ${url}`, { response });

            const callbacks = this.subscribers.ajaxResponse;
            if (!callbacks) {
                return;
            }

            callbacks.forEach((callback) => callback({ requestId, url, response }));
        }
        catch (error) {
            this.logger.error("interceptor response wasn't valid json", error);
            return;
        }
    }
}

interface InterceptorExtensionMessage {
    [key: string]: unknown;
    command: string;
    data?: AjaxXhrParams;
}

interface InterceptorExtensionMessageEventParams {
    message: InterceptorExtensionMessage;
    sender: chrome.runtime.MessageSender;
}

interface InterceptorBackgroundExtensionMessageHandlers {
    [key: string]: CallableFunction;
    mousehuntAjaxRequest: ({
        message,
    }: InterceptorExtensionMessageEventParams) => void;
    mousehuntAjaxResponse: ({
        message,
    }: InterceptorExtensionMessageEventParams) => void;
}
