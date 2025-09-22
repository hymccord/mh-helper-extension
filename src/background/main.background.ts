import { AjaxInterceptorService } from "src/background/ajaxInterceptor.background";
import { ConsoleLogger, LogLevel, LoggerService } from "../scripts/util/logger";
import { HuntPrefetchService } from "@scripts/services/huntPrefetchService";
import { ResponseParsingService } from "@scripts/services/responseParsingService";
import { SettingsService } from "@scripts/services/settingsService";
import { BadgeUpdateService } from "@scripts/services/badgeUpdateService";

export class MainBackground {
    logger: LoggerService;
    settingsService: SettingsService;
    ajaxInterceptor: AjaxInterceptorService;
    huntPrefetchService: HuntPrefetchService;
    responseParsingService: ResponseParsingService;
    badgeUpdateService: BadgeUpdateService;

    constructor() {
        this.logger = new ConsoleLogger(LogLevel.Debug);
        this.settingsService = new SettingsService();
        this.ajaxInterceptor = new AjaxInterceptorService(this.logger);
        this.huntPrefetchService = new HuntPrefetchService(this.logger, this.ajaxInterceptor);
        this.responseParsingService = new ResponseParsingService(this.logger, this.ajaxInterceptor);
        this.badgeUpdateService = new BadgeUpdateService(this.logger, this.settingsService, this.responseParsingService);
    }

    async bootstrap() {
        await this.settingsService.init();
        await this.ajaxInterceptor.init();
        this.huntPrefetchService.init();
        await this.badgeUpdateService.init();
    }
}
