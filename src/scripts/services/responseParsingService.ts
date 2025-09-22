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
        response: unknown
    ) {
        const hgResponse = await hgResponseSchema.safeParseAsync(response);

        if (hgResponse.success) {
            this.logger.debug("Parsed hgResponse", requestId, hgResponse.data);
            this.hgResponse.next({
                requestId: requestId,
                url: url,
                data: hgResponse.data,
            });
        } else {
            const message = hgResponse.error.message;
            this.logger.warn("Failed to parse a hgResponse", requestId, { error: message });
        }
    }
}

