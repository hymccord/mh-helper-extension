import type { ConvertibleMessage } from '@scripts/types/mhct';
import type { StringyObject } from '@tests/utility/stringyObject';

import { HgResponseBuilder, UserBuilder } from '@tests/utility/builders';
import { LoggingAssertions } from '@tests/utility/logging-assertions';
import nock from 'nock';
import qs from 'qs';

import MockServer from '../util/mockServer';
import { soundHorn } from '../util/soundHorn';

describe('journal processing', () => {
    let server: MockServer;

    beforeEach(() => {
        vi.resetAllMocks();
        server = new MockServer();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('should submit convertible for queso cannonstorm base', async () => {
        server.setPageResponse(
            new HgResponseBuilder()
                .withPage({
                    journal: {
                        entries_string: `data-entry-id='0'`,
                    },
                })
                .build()
        );

        const huntResponse = new HgResponseBuilder()
            .withActiveTurn(true)
            .withUser(
                new UserBuilder()
                    .withTurn({
                        num_active_turns: 1,
                        next_activeturn_seconds: 900,
                    })
                    .build()
            )
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 1,
                        css_class: 'active catchsuccess',
                        entry_timestamp: 419,
                        text: 'MouseHunt Community Tools Mouse',
                        environment: 'Server Room',
                        entry_date: '12:00 am',
                        mouse_type: 'mhct',
                    },
                },
                {
                    render_data: {
                        entry_id: 298001,
                        mouse_type: false,
                        css_class: 'entry short misc custom queso_cannonstorm_base_trigger',
                        entry_date: '11:50pm',
                        environment: 'Queso River',
                        entry_timestamp: 1759809015,
                        text: 'My <a class="" title="" href="https://www.mousehuntgame.com/item.php?item_type=queso_cannonstorm_base" onclick="hg.views.ItemView.show(\'queso_cannonstorm_base\'); return false;">Queso Cannonstorm Base</a> blasted 5 <a class="" title="" href="https://www.mousehuntgame.com/item.php?item_type=amber_queso_stat_item" onclick="hg.views.ItemView.show(\'amber_queso_stat_item\'); return false;">Solidified Amber Queso</a> to smithereens, revealing 1 <a class="" title="" href="https://www.mousehuntgame.com/item.php?item_type=ember_stone_crafting_item" onclick="hg.views.ItemView.show(\'ember_stone_crafting_item\'); return false;">Ember Stone</a> within the rubble!<br /><br />I have 12,996 <a class="" title="" href="https://www.mousehuntgame.com/item.php?item_type=amber_queso_stat_item" onclick="hg.views.ItemView.show(\'amber_queso_stat_item\'); return false;">Solidified Amber Queso</a> left.'
                    },
                }
            ])
            .withInventory({
                ember_stone_crafting_item: {
                    item_id: 2613,
                    name: 'Ember Stone',
                    type: 'ember_stone_crafting_item',
                    quantity: 101
                }
            })
            .build();
        server.setActiveTurnResponse(huntResponse);

        const intakeRequestEvent = server.on('request', 'https://www.mhct.win/convertible_intake.php');

        await soundHorn();

        // Data is posted to mhct as x-www-form-urlencoded
        let event: {
            request: Request;
        };
        try {
            event = await intakeRequestEvent;
        } catch {
            assert.fail(`Did not receive intake request in time`);
        }

        const data = await event.request.text();
        const actual = qs.parse(data);

        const expectedMessage: StringyObject<ConvertibleMessage> = {
            convertible: {
                id: '3526',
                name: 'Queso Cannonstorm Base',
                quantity: '1',
            },
            items: [
                {
                    id: '2613',
                    name: 'Ember Stone',
                    quantity: '1',
                }
            ],
            asset_package_hash: '1212121000'
        };

        expect(actual).toEqual(expect.objectContaining(expectedMessage));
        LoggingAssertions.expectNoWarningsOrErrors();
    });

    it('should submit convertible for gilded charm', async () => {
        server.setPageResponse(
            new HgResponseBuilder()
                .withPage({
                    journal: {
                        entries_string: `data-entry-id='0'`,
                    },
                })
                .build()
        );

        const huntResponse = new HgResponseBuilder()
            .withActiveTurn(true)
            .withUser(
                new UserBuilder()
                    .withTurn({
                        num_active_turns: 1,
                        next_activeturn_seconds: 900,
                    })
                    .build()
            )
            .withJournalMarkup([
                {
                    render_data: {
                        entry_id: 1,
                        css_class: 'active catchsuccess',
                        entry_timestamp: 419,
                        text: 'MouseHunt Community Tools Mouse',
                        environment: 'Server Room',
                        entry_date: '12:00 am',
                        mouse_type: 'mhct',
                    },
                },
                {
                    render_data: {
                        entry_id: 298002,
                        mouse_type: false,
                        css_class: 'entry short misc custom chesla_trap_trigger minimalJournal',
                        entry_date: '11:50pm',
                        environment: 'Queso River',
                        entry_timestamp: 1759809015,
                        text: '*BLING* In a flash of light my Gilded Charm turned into 2 <a href="https://www.mousehuntgame.com/item.php?item_type=super_brie_cheese" onclick="hg.views.ItemView.show(\'super_brie_cheese\'); return false;">SUPER|brie+</a>!'
                    },
                }
            ])
            .withInventory({
                super_brie_cheese: {
                    item_id: 2613,
                    name: 'SUPER|brie+',
                    type: 'super_brie_cheese',
                    quantity: 101
                }
            })
            .build();
        server.setActiveTurnResponse(huntResponse);

        const intakeRequestEvent = server.on('request', 'https://www.mhct.win/convertible_intake.php');

        await soundHorn();

        // Data is posted to mhct as x-www-form-urlencoded
        let event: {
            request: Request;
        };
        try {
            event = await intakeRequestEvent;
        } catch {
            assert.fail(`Did not receive intake request in time`);
        }

        const data = await event.request.text();
        const actual = qs.parse(data);

        const expectedMessage: StringyObject<ConvertibleMessage> = {
            convertible: {
                id: '2174',
                name: 'Gilded Charm',
                quantity: '1',
            },
            items: [
                {
                    id: '114',
                    name: 'SUPER|brie+',
                    quantity: '2',
                }
            ],
            asset_package_hash: '1212121000'
        };

        expect(actual).toEqual(expect.objectContaining(expectedMessage));
        LoggingAssertions.expectNoWarningsOrErrors();
    });
});
