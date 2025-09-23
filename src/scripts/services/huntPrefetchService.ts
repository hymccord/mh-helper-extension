import { LoggerService } from "@scripts/util/logger";
import { IAjaxInterceptorService } from "../../background/ajaxInterceptor.background";
import { Subject } from "rxjs";
import { HgResponse, hgResponseSchema } from "@scripts/types/hg";
import { RequestBody } from "./interceptor.service";

/**
 * Service to handle fetching per-hunt user data.
 *
 * This service intercepts AJAX requests and responses related to the hunt process,
 * fetches necessary prehunt data, and logs relevant information for debugging purposes.
 */
export class HuntPrefetchService {
    private preHuntRequestId?: string;
    private preHuntData: HgResponse | null;

    private userHunt = new Subject<{
        preData: HgResponse;
        postData: HgResponse;
    }>();
    userHunt$ = this.userHunt.asObservable();

    constructor(
        private logger: LoggerService,
        private ajaxInterceptorService: IAjaxInterceptorService
    ) {}

    init() {
        const activeTurnFilter = (url: URL) => url.pathname === "/managers/ajax/turns/activeturn.php";

        this.ajaxInterceptorService.subscribe('ajaxRequest', async ({requestId, url, request}) => {
            if (activeTurnFilter(new URL(url))) {
                await this.huntRequestObserver(requestId, request);
            }
        });

        this.ajaxInterceptorService.subscribe('ajaxResponse', async ({requestId, url, response}) => {
            if (activeTurnFilter(new URL(url))) {
                await this.huntResponseObserver(requestId, response);
            }
        });
    }

    private async huntRequestObserver(
        requestId: string,
        request: RequestBody
    ) {
        if (await this.fetchPrehuntData(request)) {
            this.logger.debug("Fetched prehunt data", requestId);
            this.preHuntRequestId = requestId;
        }

        this.logger.debug("Hunt intake got request", {
            requestId,
            request,
        });
    }

    private async fetchPrehuntData(request: RequestBody): Promise<boolean> {
        this.logger.debug("Fetching prehunt data");
        performance.mark("fetch-prehunt-data");

        try {
            const response = await fetch(
                "https://www.mousehuntgame.com/managers/ajax/pages/page.php",
                {
                    method: "POST",
                    body: new URLSearchParams({
                        sn: request.sn as string,
                        hg_is_ajax: request.hg_is_ajax as string,
                        page_class: "Camp",
                        last_read_journal_entry_id:
                            request.last_read_journal_entry_id as string,
                        uh: request.uh as string,
                    }),
                }
            );
            if (response.ok) {
                const preHuntJson = await response.json();
                this.preHuntData = await hgResponseSchema.parseAsync(preHuntJson);
            }

            this.logger.debug(
                "Fetch prehunt data performance",
                performance.measure("fetch-prehunt-data").duration
            );

            return response.ok;
        } catch (error) {
            this.logger.error("fetchPrehuntData", error);
        }

        return false;
    }

    private async huntResponseObserver(
        requestId: string,
        response: unknown
    ) {
        if (requestId !== this.preHuntRequestId) {
            this.logger.warn(
                "Prehunt requestId ({0}) does not match response requestId ({1})",
                this.preHuntRequestId,
                requestId
            );
            return;
        }

        if (this.preHuntData == null) {
            this.logger.warn("No prehunt data found for requestId", requestId);
            return;
        }

        try {
            const postHuntData = await hgResponseSchema.parseAsync(response);

            this.logger.debug("Broadcasting userHunt$", {
                pre: this.preHuntData,
                post: response,
            });

            this.userHunt.next({
                preData: this.preHuntData,
                postData: postHuntData,
            });

            this.preHuntData = null;
        } catch (error) {
            this.logger.error("huntResponseObserver", error);
        }
    }
}
