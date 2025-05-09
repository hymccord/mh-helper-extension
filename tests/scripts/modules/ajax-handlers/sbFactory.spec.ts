import {SBFactoryAjaxHandler} from "@scripts/modules/ajax-handlers";
import {VendingMachinePurchase, VendingMachineReponse} from "@scripts/modules/ajax-handlers/sbFactory.types";
import {SubmissionService} from "@scripts/services/submission.service";
import {InventoryItem} from "@scripts/types/hg";
import {LoggerService} from '@scripts/util/logger';
import {HgResponseBuilder} from "@tests/utility/builders";
import {mock} from "jest-mock-extended";

const logger = mock<LoggerService>();
const submissionService = mock<SubmissionService>();
const handler = new SBFactoryAjaxHandler(logger, submissionService);

const sbfactory_url = "mousehuntgame.com/managers/ajax/events/birthday_factory.php";

describe("SBFactoryAjaxHandler", () => {

    const responseBuilder = new HgResponseBuilder();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("match", () => {
        it('is false when url is ignored', () => {
            expect(handler.match('mousehuntgame.com/managers/ajax/events/kings_giveaway.php')).toBe(false);
        });

        it('is true when url matches', () => {
            expect(handler.match(sbfactory_url)).toBe(true);
        });
    });

    describe("execute", () => {
        it('logs if birthday response is not purchase', async () => {
            // vending_machine_purchase missing here,
            const response = responseBuilder.build();

            await handler.execute(response);

            expect(logger.warn).toHaveBeenCalledWith('Unexpected vending machine response object.', expect.anything());
            expect(submissionService.submitEventConvertible).toHaveBeenCalledTimes(0);
        });

        it('submits expected response one', async () => {

            const hgResponse = responseBuilder.withInventory(
                testResponses.responseOne.inventory
            ).build();
            const response: VendingMachineReponse = {
                ...hgResponse,
                vending_machine_purchase: testResponses.responseOne.vending_machine_purchase,
            };

            await handler.execute(response);

            const expectedConvertible = {
                id: 130001,
                name: 'larry_starter_mix_snack_pack',
                quantity: 1,
            };

            const expectedItems = [
                {
                    id: 96,
                    name: 'Glutter Cheese',
                    quantity: 3,
                },
                {
                    id: 907,
                    name: 'Runny Cheese',
                    quantity: 2,
                },
                {
                    id: 92,
                    name: 'Gauntlet Cheese Tier 7',
                    quantity: 1,
                },
            ];

            expect(submissionService.submitEventConvertible).toHaveBeenCalledWith(
                expect.objectContaining(expectedConvertible),
                expect.objectContaining(expectedItems)
            );
        });

        it('submits expected response two', async () => {

            const hgResponse = responseBuilder.withInventory(
                testResponses.responseTwo.inventory
            ).build();
            const response: VendingMachineReponse = {
                ...hgResponse,
                vending_machine_purchase: testResponses.responseTwo.vending_machine_purchase,
            };

            await handler.execute(response);

            const expectedConvertible = {
                id: 130007,
                name: 'story_seeds_snack_pack',
                quantity: 1,
            };

            const expectedItems = [
                {
                    id: 3461,
                    name: 'Second Draft Derby Cheese',
                    quantity: 20,
                },
                {
                    id: 3457,
                    name: 'Clamembert Cheese',
                    quantity: 30,
                },
                {
                    id: 3451,
                    name: 'Mythical Mulch',
                    quantity: 60,
                },
            ];

            expect(submissionService.submitEventConvertible).toHaveBeenCalledWith(
                expect.objectContaining(expectedConvertible),
                expect.objectContaining(expectedItems)
            );
        });
    });
});

// Data is minimum required for the execute to pass
const testResponses: Record<string, {
    vending_machine_purchase: VendingMachinePurchase,
    inventory: Record<string, InventoryItem>,
}> = {
    // Larry Starter Mix
    // 3 Glutter Cheese, 2 Runny Cheese, 1 Gauntlet Cheese Tier 7
    responseOne: {
        "vending_machine_purchase": {
            "quantity": 1,
            "type": "larry_starter_mix_snack_pack",
            "items": [
                {
                    "name": "Glutter Cheese",
                    "quantity": 3,
                    "is_epic": null,
                },
                {
                    "name": "Runny Cheese",
                    "quantity": 2,
                    "is_epic": null,
                },
                {
                    "name": "Gauntlet Cheese Tier 7",
                    "quantity": 1,
                    "is_epic": true,
                },
            ],
        },
        "inventory": {
            "vending_machine_token_stat_item": {
                "item_id": 3186,
                "name": "SUPER|token+",
                "type": "vending_machine_token_stat_item",
                "quantity": 51,
            },
            "glutter_cheese": {
                "item_id": 96,
                "name": "Glutter Cheese",
                "type": "glutter_cheese",
                "quantity": 340,
            },
            "runny_cheese": {
                "item_id": 907,
                "name": "Runny Cheese",
                "type": "runny_cheese",
                "quantity": 103,
            },
            "gauntlet_cheese_7": {
                "item_id": 92,
                "name": "Gauntlet Cheese Tier 7",
                "type": "gauntlet_cheese_7",
                "quantity": 54,
            },
        },
    },

    // Story Seeds (inferred from preview by Dave on 2023-02-17 FBF)
    // 20 Second Draft Derby Cheese, 30 Clamembert Cheese, 60 Mythical Mulch
    responseTwo: {
        "vending_machine_purchase": {
            "quantity": 1,
            "type": "story_seeds_snack_pack",
            "items": [
                {
                    "name": "Second Draft Derby Cheese",
                    "quantity": 20,
                    "is_epic": null,
                },
                {
                    "name": "Clamembert Cheese",
                    "quantity": 30,
                    "is_epic": null,
                },
                {
                    "name": "Mythical Mulch",
                    "quantity": 60,
                    "is_epic": null,
                },
            ],
        },
        "inventory": {
            "vending_machine_token_stat_item": {
                "item_id": 3186,
                "name": "SUPER|token+",
                "type": "vending_machine_token_stat_item",
                "quantity": 666,
            },
            "second_draft_derby_cheese": {
                "item_id": 3461,
                "name": "Second Draft Derby Cheese",
                "type": "second_draft_derby_cheese",
                "quantity": 20,
            },
            "clamembert_cheese": {
                "item_id": 3457,
                "name": "Clamembert Cheese",
                "type": "clamembert_cheese",
                "quantity": 30,
            },
            "mythical_mulch_stat_item": {
                "item_id": 3451,
                "name": "Mythical Mulch",
                "type": "mythical_mulch_stat_item",
                "quantity": 60,
            },
        },
    },
};
