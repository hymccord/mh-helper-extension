import {SpookyShuffleAjaxHandler} from "@scripts/modules/ajax-handlers";
import {SpookyShuffleResponse, SpookyShuffleStatus} from "@scripts/modules/ajax-handlers/spookyShuffle.types";
import {MouseRipApiService} from "@scripts/services/mouserip-api.service";
import {SubmissionService} from "@scripts/services/submission.service";
import {LoggerService} from '@scripts/util/logger';
import {CustomConvertibleIds} from "@scripts/util/constants";
import {HgResponseBuilder} from "@tests/utility/builders";
import {mock} from "jest-mock-extended";

const logger = mock<LoggerService>();
const submissionService = mock<SubmissionService>();
const mouseRipApiService = mock<MouseRipApiService>();
const handler = new SpookyShuffleAjaxHandler(logger, submissionService, mouseRipApiService);

const spookyShuffle_url = "mousehuntgame.com/managers/ajax/events/spooky_shuffle.php";

describe("SpookyShuffleAjaxHandler", () => {

    const responseBuilder = new HgResponseBuilder();

    beforeEach(() => {
        jest.clearAllMocks();

        mouseRipApiService.getAllItems.mockResolvedValue([
            {
                name: 'Test Item',
                type: 'test_item',
                id: 1234,
            },
            {
                name: 'Gold',
                type: 'gold_stat_item',
                id: 431,
            }
        ]);
    });

    describe("match", () => {
        it('is false when url is ignored', () => {
            expect(handler.match('mousehuntgame.com/managers/ajax/events/gwh.php')).toBe(false);
        });

        it('is true when url matches', () => {
            expect(handler.match(spookyShuffle_url)).toBe(true);
        });
    });

    describe("execute", () => {
        it('warns if response is unexpected', async () => {

            // memory_game missing here,
            const response = responseBuilder.build();

            await handler.execute(response);

            expect(logger.warn).toHaveBeenCalledWith('Couldn\'t validate JSON response', expect.anything());
            expect(submissionService.submitEventConvertible).toHaveBeenCalledTimes(0);
        });

        it('debug logs if response is an incomplete game', async () => {
            const result: SpookyShuffleStatus = {
                is_complete: null,
                is_upgraded: null,
                has_selected_testing_pair: false,
                reward_tiers: [],
                title_range: 'novice_journeyman',
                cards: [],
            };

            const response = responseBuilder
                .withUnknown({memory_game: result})
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith('Spooky Shuffle board is not complete yet.');
            expect(submissionService.submitEventConvertible).toHaveBeenCalledTimes(0);
        });

        it('debug logs if response is an complete game but no testing pair', async () => {
            const result: SpookyShuffleStatus = {
                is_complete: true,
                is_upgraded: null,
                has_selected_testing_pair: false,
                reward_tiers: [],
                title_range: 'novice_journeyman',
                cards: [],
            };
            const response: SpookyShuffleResponse = {
                ...responseBuilder.build(),
                memory_game: result,
            };

            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith('Spooky Shuffle board is not complete yet.');
            expect(submissionService.submitEventConvertible).toHaveBeenCalledTimes(0);
        });

        it('submits regular novice board', async () => {
            const result: SpookyShuffleStatus = {
                is_complete: true,
                is_upgraded: null,
                has_selected_testing_pair: true,
                reward_tiers: [
                    {
                        name: 'Test Title Range',
                        type: 'novice_journeyman',
                    },
                ],
                title_range: 'novice_journeyman',
                cards: [
                    {
                        id: 1,
                        name: 'Test Item',
                        is_matched: true,
                        is_revealed: true,
                        quantity: 567,
                    },
                ],
            };
            const response: SpookyShuffleResponse = {
                ...responseBuilder.build(),
                memory_game: result,
            };

            await handler.execute(response);

            const expectedConvertible = {
                id: CustomConvertibleIds.HalloweenSpookyShuffleNovice,
                name: 'Spooky Shuffle (Test Title Range)',
                quantity: 1,
            };

            const expectedItems = [
                {
                    id: 1234,
                    name: 'Test Item',
                    quantity: 567,
                },
            ];

            expect(submissionService.submitEventConvertible).toHaveBeenCalledWith(
                expect.objectContaining(expectedConvertible),
                expect.objectContaining(expectedItems)
            );
        });


        it('submits upgraded duke board', async () => {
            const result: SpookyShuffleStatus = {
                is_complete: true,
                is_upgraded: true,
                has_selected_testing_pair: true,
                reward_tiers: [
                    {
                        name: 'Grand Test Title and up',
                        type: 'grand_duke_plus',
                    },
                ],
                title_range: 'grand_duke_plus',
                cards: [
                    {
                        id: 1,
                        name: 'Test Item',
                        is_matched: true,
                        is_revealed: true,
                        quantity: 567,
                    },
                    {
                        id: 2,
                        name: 'Gold',
                        is_matched: true,
                        is_revealed: true,
                        quantity: 5000,
                    },
                ],
            };
            const response: SpookyShuffleResponse = {
                ...responseBuilder.build(),
                memory_game: result,
            };

            await handler.execute(response);

            const expectedConvertible = {
                id: CustomConvertibleIds.HalloweenSpookyShuffleGrandDukeDusted,
                name: 'Upgraded Spooky Shuffle (Grand Test Title and up)',
                quantity: 1,
            };

            const expectedItems = [
                {
                    id: 1234,
                    name: 'Test Item',
                    quantity: 567,
                },
                {
                    id: 431,
                    name: 'Gold',
                    quantity: 5000,
                },
            ];

            expect(submissionService.submitEventConvertible).toHaveBeenCalledWith(
                expect.objectContaining(expectedConvertible),
                expect.objectContaining(expectedItems)
            );
        });

        it('logs error when card name is not returned in getItemsByClass', async () => {
            const result: SpookyShuffleStatus = {
                is_complete: true,
                is_upgraded: true,
                has_selected_testing_pair: true,
                reward_tiers: [
                    {
                        name: 'Grand Test Title and up',
                        type: 'grand_duke_plus',
                    },
                ],
                title_range: 'grand_duke_plus',
                cards: [
                    {
                        id: 1,
                        name: 'Unfound Item',
                        is_matched: true,
                        is_revealed: true,
                        quantity: 567,
                    },
                ],
            };
            const response: SpookyShuffleResponse = {
                ...responseBuilder.build(),
                memory_game: result,
            };

            await handler.execute(response);

            expect(logger.warn).toHaveBeenCalledWith(`Item 'Unfound Item' wasn't found in item map. Check its classification type`);
            expect(submissionService.submitEventConvertible).not.toHaveBeenCalled();
        });

    });
});
