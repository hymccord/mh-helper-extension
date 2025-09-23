import { HgResponse, hgResponseSchema } from "@scripts/types/hg";
import { LoggerService } from "@scripts/util/logger";
import { Subject } from "rxjs";
import { IAjaxInterceptorService } from "src/background/ajaxInterceptor.background";

export class ResponseParsingService {

    private hgResponse = new Subject<{requestId: string, url: URL, data: HgResponse}>();
    hgResponse$ = this.hgResponse.asObservable();

    constructor(
        private logger: LoggerService,
        private ajaxInterceptorService: IAjaxInterceptorService
    ) {
        this.ajaxInterceptorService.subscribe('ajaxResponse', ({requestId, url, response}) => this.parseResponse(requestId, url, response));
    }

    private async parseResponse(
        requestId: string,
        url: URL,
        response: HgResponse | undefined
    ) {
        if (response == null) {
            this.logger.warn("HG response parsing: No response", requestId, url);
            return;
        }

        this.hgResponse.next({requestId: requestId, url: url, data: response}); // Emit early for logging
    }
}

