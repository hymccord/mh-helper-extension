import {mergician} from "mergician";
import {BountifulBeanstalkRoomTrackerAjaxHandler} from "@scripts/modules/ajax-handlers";
import {HgResponse, QuestBountifulBeanstalk, User} from "@scripts/types/hg";
import {ConsoleLogger} from "@scripts/util/logger";
import type {BeanstalkRarityPayload} from "@scripts/modules/ajax-handlers/beanstalkRoomTracker.types";
import {HgResponseBuilder} from "@tests/utility/builders";

jest.mock("@scripts/util/logger");
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
    })
) as jest.Mock;

const logger = new ConsoleLogger();
const showFlashMessage = jest.fn();
const handler = new BountifulBeanstalkRoomTrackerAjaxHandler(
    logger,
    showFlashMessage
);

const activeHuntUrl = "mousehuntgame.com/managers/ajax/turns/activeturn.php";
const beanstalkUrl =
    "mousehuntgame.com/managers/ajax/environment/bountiful_beanstalk.php";

describe("BountifulBeanstalkRoomTrackerAjaxHandler", () => {
    const responseBuilder = new HgResponseBuilder();
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("match", () => {
        it("is false when url is ignored", () => {
            expect(
                handler.match(
                    "mousehuntgame.com/managers/ajax/environment/table_of_contents.php"
                )
            ).toBe(false);
        });

        it.each([activeHuntUrl, beanstalkUrl])(
            "is true when url matches",
            (url) => {
                expect(handler.match(url)).toBe(true);
            }
        );
    });

    describe("execute", () => {
        it("should ignore if not in bountiful beanstalk", async () => {
            const response = responseBuilder
                .withUser({
                    environment_name: "Server Room",
                })
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Not in BB environment"
            );
        });

        it("should log if there are too many journal entries", async () => {
            const response = responseBuilder
                .withActiveTurn(false)
                .withUser(getDefaultUser({}))
                .withJournalMarkup([
                    {
                        render_data: {
                            css_class: "",
                            entry_id: 0,
                            mouse_type: "",
                            entry_date: "",
                            environment: "",
                            entry_timestamp: 0,
                            text: ""
                        },
                    },
                    {
                        render_data: {
                            css_class: "",
                            entry_id: 0,
                            mouse_type: "",
                            entry_date: "",
                            environment: "",
                            entry_timestamp: 0,
                            text: ""
                        },
                    },
                ])
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Didn't plant vine or too many journal entries (2 entries)"
            );
        });

        it("should ignore if not in castle", async () => {
            const response = responseBuilder
                .withActiveTurn(true)
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            in_castle: false,
                            beanstalk: {
                                is_boss_encounter: false,
                            }
                        },
                    },
                }))
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: User not in castle"
            );
        });

        it("should ignore if not suitable room position", async () => {
            const response = responseBuilder
                .withActiveTurn(true)
                .withUser(getDefaultUser({}))
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: User not in a submittable position"
            );
        });

        it("should submit if user just planted vine", async () => {
            const response = responseBuilder
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            castle: {
                                room_position: 0,
                            },
                        },
                    },
                }))
                .withJournalMarkup([
                    {
                        render_data: {
                            css_class: 'bountifulBeanstalk-plantedVine',
                            entry_id: 0,
                            mouse_type: "",
                            entry_date: "",
                            environment: "",
                            entry_timestamp: 0,
                            text: ""
                        },
                    },
                ])
                .build();
            await handler.execute(response);

            const expectedData: BeanstalkRarityPayload = {
                version: 1,
                floor: "dungeon_floor",
                embellishments: {
                    golden_key: true,
                    ruby_remover: false,
                },
                room: "magic_bean_ultimate_room",
            };
            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Submitting current room"
            );
            expect(showFlashMessage).toHaveBeenCalledWith(
                "success",
                "Castle room data submitted successfully"
            );
            expect(global.fetch).toHaveBeenCalledWith(
                "https://script.google.com/macros/s/AKfycbynfLfTaN6tnEYBE1Z9iPJEtO4xCCvsqHQqiu246JCKCUvwQU8WyICEJGzX45UF3HPmAA/exec",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(expectedData),
                })
            );
        });

        it("should submit if user just entered new room", async () => {
            const response = responseBuilder
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            in_castle: true,
                            castle: {
                                is_boss_chase: false,
                                room_position: 0,
                            },
                        },
                    },
                }))
                .build();
            await handler.execute(response);

            const expectedData: BeanstalkRarityPayload = {
                version: 1,
                floor: "dungeon_floor",
                embellishments: {
                    golden_key: true,
                    ruby_remover: false,
                },
                room: "magic_bean_ultimate_room",
            };
            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Submitting current room"
            );
            expect(showFlashMessage).toHaveBeenCalledWith(
                "success",
                "Castle room data submitted successfully"
            );
            expect(global.fetch).toHaveBeenCalledWith(
                "https://script.google.com/macros/s/AKfycbynfLfTaN6tnEYBE1Z9iPJEtO4xCCvsqHQqiu246JCKCUvwQU8WyICEJGzX45UF3HPmAA/exec",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(expectedData),
                })
            );
        });

        it("should submit next room if user just triggered chase", async () => {
            const response = responseBuilder
                .withActiveTurn(true)
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            castle: {
                                is_boss_chase: true,
                                room_position: 19,
                                current_floor: {
                                    type: "great_hall_floor",
                                },
                                next_room: {
                                    type: "egg_standard_room",
                                },
                            },
                        },
                    }
                }))
                .build();
            await handler.execute(response);

            const expectedData: BeanstalkRarityPayload = {
                version: 1,
                floor: "great_hall_floor",
                embellishments: {
                    golden_key: true,
                    ruby_remover: false,
                },
                room: "egg_standard_room",
            };
            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Submitting next room"
            );
            expect(showFlashMessage).toHaveBeenCalledWith(
                "success",
                "Castle room data submitted successfully"
            );
            expect(global.fetch).toHaveBeenCalledWith(
                "https://script.google.com/macros/s/AKfycbynfLfTaN6tnEYBE1Z9iPJEtO4xCCvsqHQqiu246JCKCUvwQU8WyICEJGzX45UF3HPmAA/exec",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(expectedData),
                })
            );
        });

        it("should log an error if fetch throws", async () => {
            const err = new Error();
            global.fetch = jest.fn(() => {
                throw err;
            });

            const response = responseBuilder
                .withActiveTurn(true)
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            castle: {
                                is_boss_chase: true,
                                room_position: 19,
                            },
                        },
                    },
                }))
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Submitting next room"
            );
            expect(showFlashMessage).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
                "BBRoomTracker: Castle room data network error",
                err
            );
        });

        it("should log a warning if response is not OK", async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: false,
                })
            ) as jest.Mock;

            const response = responseBuilder
                .withActiveTurn(true)
                .withUser(getDefaultUser({
                    quests: {
                        QuestBountifulBeanstalk: {
                            castle: {
                                is_boss_chase: true,
                                room_position: 19,
                            },
                        },
                    },
                }))
                .build();
            await handler.execute(response);

            expect(logger.debug).toHaveBeenCalledWith(
                "BBRoomTracker: Submitting next room"
            );
            expect(showFlashMessage).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                "BBRoomTracker: Error submitting castle room data"
            );
        });
    });

    /**
     * Gets an partially filled HgResponse for the purpose of these tests.
     *
     * User is not in a submittable position but everything else is fine.
     *
     * In castle. Dungeon. Current room: 8M. Next room: 2S. Embellishments: K.
     */
    function getDefaultUser(overrides: PartialDeep<User>): Partial<User> {
        return mergician(
            {
                environment_name: "Bountiful Beanstalk",
                quests: {
                    QuestBountifulBeanstalk: {
                        in_castle: true,
                        castle: {
                            is_boss_chase: false,
                            is_boss_encounter: false,
                            current_floor: {
                                type: "dungeon_floor",
                                name: "Dungeon",
                            },
                            current_room: {
                                type: "magic_bean_ultimate_room",
                                name: "Ultimate Magic Bean Room",
                            },
                            next_room: {
                                type: "string_super_room",
                                name: "Super Harp String Room"
                            },
                            room_position: 10,
                        },
                        embellishments: [
                            {
                                type: "golden_key",
                                is_active: true,
                            },
                            {
                                type: "ruby_remover",
                                is_active: false,
                            },
                        ],
                    },
                },
            },
            overrides
        );
    }
});
