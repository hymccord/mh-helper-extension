import {parseJournalEntries} from "@scripts/parseJournalEntries";
import {ConsoleLogger, type LoggerService} from "@scripts/util/logger";
import {HgResponseBuilder} from "@tests/utility/builders";
jest.mock("@scripts/util/logger");

describe("parseJournalEntries", () => {
    const responseBuilder = new HgResponseBuilder();
    const logger: LoggerService = new ConsoleLogger();
    const userSettings: Record<string, boolean> = {};
    let submitMainIntakeMessage: jest.Mock;
    let submitItemConvertible: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        submitMainIntakeMessage = jest.fn();
        submitItemConvertible = jest.fn();
    });

    it("should return null if no journal entries in postResponse", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup(undefined).build();

        const result = parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(result).toBeNull();
    });

    it("should filter out stale entries", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div><div data-entry-id='2'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 3,
                        css_class: "active",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "custom",
                        entry_date: "11:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
            ]).build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);

        expect(logger.debug).toHaveBeenNthCalledWith(1, "Pre (old) maximum entry id: 2");
        expect(logger.debug).toHaveBeenNthCalledWith(2, "Before filtering there's 2 journal entries.", expect.objectContaining({journal_entries: postResponse.journal_markup, max_old_entry_id: 2}));
        expect(logger.debug).toHaveBeenNthCalledWith(3, "After filtering there's 1 journal entries left.", expect.objectContaining({journal_entries: [postResponse.journal_markup![0]], max_old_entry_id: 2}));
    });

    it.each([true, false])("should handle Relic Hunter attraction with settings", (trackingEvents) => {
        //
        jest.useFakeTimers().setSystemTime(0);
        userSettings["tracking-events"] = trackingEvents;

        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "relicHunter_catch",
                        entry_date: "11:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
            ]).build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);

        if (trackingEvents) {
            expect(submitMainIntakeMessage).toHaveBeenCalledWith({
                rh_environment: "Test Environment",
                entry_timestamp: 1234567890,
            });
        } else {
            expect(submitMainIntakeMessage).not.toHaveBeenCalled();
        }
    });

    // These follow a pattern where the only link in the div is the loot item
    it.each<{charmName: string, css: string, convertibleId: number}>([
        {charmName: 'Unstable Charm',           css: 'unstable_charm_trigger',          convertibleId: 1478},
        {charmName: 'Torch Charm',              css: 'torch_charm_event',               convertibleId: 2180},
        {charmName: 'Gift Wrapped Charm',       css: 'gift_wrapped_charm_trigger',      convertibleId: 2525},
        {charmName: 'Boiling Cauldron Trap',    css: 'boiling_cauldron_potion_bonus',   convertibleId: 3304},
    ])('should handle $charmName proc', ({charmName, css, convertibleId}) => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: css,
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: `<a href="item.php?item_type=test_charm">Test Charm</a>`,
                    },
                },
            ])
            .withInventory([
                {item_id: 1, name: "Test Charm", type: "test_charm", quantity: 1},
            ])
            .build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(submitItemConvertible).toHaveBeenCalledWith(
            expect.objectContaining({id: convertibleId, name: charmName, quantity: 1}),
            expect.objectContaining([{id: 1, name: "Test Charm", quantity: 1}])
        );
    });

    it("should handle Desert Heater Base loot proc", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "desert_heater_base_trigger",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "mouse dropped 4 <a class='item' href='item.php?item_type=loot_item'>Loot Item</a>",
                    },
                },
            ])
            .withInventory([
                {item_id: 1, name: "Loot Item", type: "loot_item", quantity: 600},
            ])
            .build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(submitItemConvertible).toHaveBeenCalledWith(
            expect.objectContaining({id: 2952, name: "Desert Heater Base", quantity: 1}),
            expect.objectContaining([{id: 1, name: "Loot Item", quantity: 4}])
        );
    });

    it("should handle Queso Cannonstorm Base proc", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "queso_cannonstorm_base_trigger",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        // 4 links to items
                        text: `<a href="item.php?item_type=base"></a>
                        <a href="item.php?item_type=amber"></a>
                        <a href="item.php?item_type=loot_item">Loot Item</a>
                        <a href="item.php?item_type=amber"></a>`,
                    },
                },
            ])
            .withInventory([
                {item_id: 1, name: "Loot Item", type: "loot_item", quantity: 1000},
            ])
            .build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(submitItemConvertible).toHaveBeenCalledWith(
            expect.objectContaining({id: 3526, name: "Queso Cannonstorm Base", quantity: 1}),
            expect.objectContaining([{id: 1, name: "Loot Item", quantity: 1}])
        );
    });

    it("should handle Gilded Charm proc", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "chesla_trap_trigger",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "my Gilded Charm turned into 10 <a>SUPER|brie+</a>",
                    },
                },
            ])
            .withInventory([
                {item_id: 114, name: "SUPER|brie+", type: "super_brie_cheese", quantity: 600},
            ])
            .build();

        parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(submitItemConvertible).toHaveBeenCalledWith(
            expect.objectContaining({id: 2174, name: "Gilded Charm", quantity: 1}),
            expect.objectContaining([{id: 114, name: "SUPER|brie+", quantity: 10}])
        );
    });

    it.each<{detail: string, css: string}>([
        {detail: 'pirate_sleigh_trigger',           css: 'pirate_sleigh_trigger'},
        {detail: 'alchemists_cookbook_base_bonus',  css: 'alchemists_cookbook_base_bonus'},
    ])("should handle adding extra details", ({detail, css}) => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "active catchsuccess",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
                {
                    render_data: {
                        entry_id: 2,
                        css_class: css,
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
            ]).build();

        const result = parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(result?.more_details![detail]).toBe(true);
    });

    it("should bail if passive hunt found in post", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "active catchsuccess",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "passive catchsuccess",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
            ]).build();

        const result = parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(result).toBeNull();
        expect(logger.info).toHaveBeenCalledWith("Found trap check too close to hunt. Aborting.");
    });

    it("should increment hunt count for hunt records", () => {
        const preResponse = responseBuilder
            .withPage({
                journal: {
                    entries_string: "<div data-entry-id='1'></div>",
                },
            }).build();
        const postResponse = responseBuilder
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 2,
                        css_class: "active catchsuccess",
                        entry_date: "12:00pm",
                        entry_timestamp: 1234567890,
                        environment: "Test Environment",
                        mouse_type: false,
                        text: "",
                    },
                },
            ]).build();

        const result = parseJournalEntries(preResponse, postResponse, logger, userSettings, submitMainIntakeMessage, submitItemConvertible);
        expect(result?.more_details?.hunt_count).toBe(1);
    });
});
