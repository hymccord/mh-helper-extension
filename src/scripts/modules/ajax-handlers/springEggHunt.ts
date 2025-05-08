import {SubmissionService} from "@scripts/services/submission.service";
import {hgResponseSchema} from "@scripts/types/hg";
import type {HgItem} from "@scripts/types/mhct";
import type {LoggerService} from "@scripts/util/logger";
import {ValidatedAjaxSuccessHandler} from "./ajaxSuccessHandler";
import {z} from "zod";

export class SEHAjaxHandler extends ValidatedAjaxSuccessHandler {
    readonly schema = eggContentsResponseSchema;
    /**
     * Create a new instance of Spring Egg Hunt ajax handler
     * @param logger logger to log events
     * @param submitConvertibleCallback delegate to submit convertibles to mhct
     */
    constructor(
        logger: LoggerService,
        private readonly submissionService: SubmissionService) {
        super(logger);
    }

    /**
     * Determine if given url applies to this handler
     * @param url The url where the ajax reponse originated
     * @returns True if this handler applies, otherwise false
     */
    match(url: string): boolean {
        return url.includes("mousehuntgame.com/managers/ajax/events/spring_hunt.php");
    }

    async validatedExecute(responseJSON: z.infer<typeof this.schema>): Promise<void> {
        await this.recordEgg(responseJSON);
    }

    /**
     * Record egg convertibles when opened from eggscavator
     * @param {import("@scripts/types/hg").HgResponse} responseJSON HitGrab ajax response.
     */
    async recordEgg(responseJSON: HgResponseWithEggContents) {
        const egg_contents = responseJSON.egg_contents;
        const inventory = responseJSON.inventory;

        if (egg_contents === undefined) {
            this.logger.debug('Skipping SEH egg submission as this isn\'t an egg convertible');
            return;
        }

        if (egg_contents.type == null) {
            this.logger.debug('Skipped SEH egg submission due to unhandled XHR structure');
            this.logger.warn('Unable to parse SEH response', {responseJSON});
            return;
        }

        if (!inventory || Array.isArray(inventory)) {
            // inventory can be emtpy array [], which is unsupported
            this.logger.warn('SEH inventory response was undefined or an array');
            return;
        }

        const convertible: HgItem = {
            id: inventory[egg_contents.type].item_id,
            name: inventory[egg_contents.type].name,
            quantity: egg_contents.quantity_opened,
        };

        const inventoryWithExtraMap: Record<string, {name: string, item_id: number}> = {
            gold_stat_item: {name: 'Gold', item_id: 431},
            point_stat_item: {name: 'Points', item_id: 644},
        };
        // Using the extra inventory map from here due to limited info created above (ie gold_stat_item is not a full InventoryItem)
        Object.assign(inventoryWithExtraMap, inventory);

        const items: HgItem[] = [];
        try {
            egg_contents.items.forEach(item => {
                const inventoryItem = Object.values(inventoryWithExtraMap).find(i => i.name == item.name);
                if (inventoryItem == null) {
                    this.logger.debug('Egg content item missing from inventory', {inventoryWithExtraMap, item});
                    throw new Error(`Egg content item ${item.name} wasn't found in inventory response.`);
                }

                items.push({
                    id: inventoryItem.item_id,
                    name: item.name,
                    quantity: item.quantity,
                });
            });

        } catch (error) {
            this.logger.warn((error as Error).toString());
            return;
        }

        this.logger.debug('SEHAjaxHandler submitting egg convertible', {convertible, items});
        await this.submissionService.submitEventConvertible(convertible, items);
    }
}

const eggContentsSchema = z.object({
    type: z.string(),
    quantity_opened: z.coerce.number(),
    items: z.array(z.object({
        type: z.string(),
        name: z.string(),
        quantity: z.coerce.number(),
    })),
});

const eggContentsResponseSchema = hgResponseSchema.extend({
    egg_contents: eggContentsSchema.optional(),
});

type HgResponseWithEggContents = z.infer<typeof eggContentsResponseSchema>;
