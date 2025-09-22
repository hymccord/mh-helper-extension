import { LoggerService } from "@scripts/util/logger";
import { IAjaxInterceptorService } from "../../background/ajaxInterceptor.background";
import { Subject } from "rxjs";
import { HgResponse, hgResponseSchema } from "@scripts/types/hg";

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

        this.ajaxInterceptorService.subscribe('ajaxRequest', async ({requestId, url, params}) => {
            if (activeTurnFilter(url)) {
                await this.huntRequestObserver(requestId, params);
            }
        });

        this.ajaxInterceptorService.subscribe('ajaxResponse', async ({requestId, url, response}) => {
            if (activeTurnFilter(url)) {
                await this.huntResponseObserver(requestId, response);
            }
        });
    }

    private async huntRequestObserver(
        requestId: string,
        params: Record<string, string>
    ) {
        if (await this.fetchPrehuntData(params)) {
            this.logger.debug("Fetched prehunt data", requestId);
            this.preHuntRequestId = requestId;
        }

        this.logger.debug("Hunt intake got request", {
            requestId,
            params,
        });
    }

    private async fetchPrehuntData(params: Record<string, string>): Promise<boolean> {
        this.logger.debug("Fetching prehunt data");
        performance.mark("fetch-prehunt-data");

        try {
            const response = await fetch(
                "https://www.mousehuntgame.com/managers/ajax/pages/page.php",
                {
                    method: "POST",
                    body: new URLSearchParams({
                        sn: params.sn,
                        hg_is_ajax: params.hg_is_ajax,
                        page_class: "Camp",
                        last_read_journal_entry_id:
                            params.last_read_journal_entry_id,
                        uh: params.uh,
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
