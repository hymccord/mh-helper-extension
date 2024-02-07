import {HgResponse} from "@scripts/types/hg";
import nock from "nock";
import qs from "qs";

/**
 * Utility class to simplify mocking and watching http calls to
 * the hg and mhct servers.
 */
export default class MockServer {
    private mhctServer: nock.Scope;
    private hgServer: nock.Scope;
    private pageInterceptor?: nock.Interceptor;
    private activeTurnInterceptor?: nock.Interceptor;

    public get MhctServer(): nock.Scope {
        return this.mhctServer;
    }
    public get HitGrabServer(): nock.Scope {
        return this.hgServer;
    }

    constructor() {
        this.hgServer = nock("https://www.mousehuntgame.com").defaultReplyHeaders({
            "Access-Control-Allow-Origin": "*",
        });

        // Extension version must be 0 in main.js for it to call localhost (see setupDOM() in e2eSetup.ts)
        this.mhctServer = nock("http://localhost");

        // Setup a few MHCT endpoints to reply happily! (200)
        this.mhctServer
            .persist()
            .post("/uuid.php")
            .reply(200, "1", {"content-type": "text/html"});

        this.mhctServer
            .persist()
            .post("/convertible_intake.php")
            .reply(200);

        this.mhctServer
            .persist()
            .post("/intake.php")
            .reply(200);
    }

    /**
     * Get a promise that will be fulfilled when the specified url path is POST'd to successfully.
     * @param url The url to observe. Base url defaults to localhost.
     * @param timeout Amount in milliseconds to reject the returned promise. Defaults to 5000ms.
     * @returns A promise to return the body data posted to the url
     */
    async spyOnPost(url: string, timeout = 5000) {
        const body = await this.waitForAjaxSend(url, timeout);
        const data = qs.parse(body);

        return data;
    }

    /**
     * Utility method to set data returned from page.php
     * @param response The data to be returned from page.php
     */
    setPageResponse(response: HgResponse) {
        if (this.pageInterceptor != null) {
            nock.removeInterceptor(this.pageInterceptor);
        }

        this.pageInterceptor = this.hgServer.post(
            "/managers/ajax/pages/page.php"
        );
        this.pageInterceptor.reply(200, () => response);
    }

    /**
     * Utility method to set data returned from activeturn.php
     * @param response The data to be returned from activeturn.php
     */
    setActiveTurnResponse(response: HgResponse) {
        if (this.activeTurnInterceptor != null) {
            nock.removeInterceptor(this.activeTurnInterceptor);
        }

        this.activeTurnInterceptor = this.hgServer.post(
            "/managers/ajax/turns/activeturn.php"
        );
        this.activeTurnInterceptor.reply(200, response);
    }

    private waitForAjaxSend(url: string, msTimeout = 5000) {
        return Promise.race([
            new Promise<string>((resolve, reject) =>
                setTimeout(
                    () =>
                        reject(`Timed out waiting for ajaxSuccess for: ${url}`),
                    msTimeout
                )
            ),
            new Promise<string>((resolve, reject) => {
                $(document).on(
                    "ajaxSend",
                    (e, xhr: JQuery.jqXHR, opt: JQuery.AjaxSettings) => {
                        if (opt.url?.includes(url)) {
                            if (
                                opt.contentType ===
                                    "application/x-www-form-urlencoded; charset=UTF-8" &&
                                typeof opt.data === "string"
                            ) {
                                resolve(opt.data);
                            } else {
                                reject("Unexpected POST data on ajaxSend");
                            }
                        }
                    }
                );
            }),
        ]);
    }
}

/*
This mess is trying to make all types on a type definition a string
it mostly works... it's to help transform the typescript objects into what
the php object looks like (all string values)

Example
interface TestType {
    one: number,
    foo: boolean,
    obj: {
        two: number
    }
}

StringifyProperties<TestType> would be equivalent to

interface TestType {
    one: string,
    foo: string,
    obj: {
        two: string
    }
}
*/
export type StringifyProperties<T> = {
    [K in keyof T]: T[K] extends infer O
        ? O extends object
            ? StringifyProperties<O>
            : O extends O[]
            ? StringifyProperties<O>[]
            : undefined extends O
            ? never
            : null extends O
            ? null
            : string
        : never;
};
