import $ from 'jquery';
import nock from 'nock';

import MockServer from './mockServer';
import {e2eTeardown, e2eSetup} from './e2eSetup';
import {ConvertibleMessageBuilder, HgResponseBuilder, IntakeMessageBuilder, UserBuilder} from './builders';
import {HgConvertibleResponse} from '@scripts/types/hg';

// Dont run any legacy js for now. It isn't strongly typed yet (mostly quests for detailers).
jest.mock('@scripts/modules/details/legacy');
jest.mock('@scripts/modules/stages/legacy');

describe('mhct intake', () => {
    let server: MockServer;

    beforeAll(async () => {
        await e2eSetup();
    });

    beforeEach(() => {
        server = new MockServer();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    afterAll(() => {
        e2eTeardown();
    });

    it('should process an active hunt', async () => {
        const userBuilder = new UserBuilder();
        let user = userBuilder.build();

        let response = new HgResponseBuilder()
            .withUser(user)
            .withPage({
                journal: {
                    entries_string: `data-entry-id='0'`,
                },
            })
            .build();

        // Pre response
        server.setPageResponse(response);

        // Post
        user = userBuilder
            .withTurn({
                num_active_turns: 1,
                next_activeturn_seconds: 900,
            })
            .build();

        response = new HgResponseBuilder()
            .withActiveTurn(true)
            .withUser(user)
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
            ])
            .build();

        server.setActiveTurnResponse(response);

        const postedDataPromise = server.spyOnPost('intake.php');

        // Simulate hitting horn
        $.post('https://www.mousehuntgame.com/managers/ajax/turns/activeturn.php');

        const data = await postedDataPromise;

        const expectedMessage = new IntakeMessageBuilder()
            .build(response);

        expect(data).toEqual(expect.objectContaining(expectedMessage));
    });

    it('should process an opened convertible', async () => {
        const response = {
            convertible_open: {
                quantity: 7,
                type: 'baz_convertible',
                items: [
                    {
                        type: 'foo_stat_item',
                        name: 'Foo',
                        quantity: 32,
                    },
                ],
            },
            inventory: {
                foo_stat_item: {
                    item_id: 555,
                },
            },
            items: {
                baz_convertible: {
                    item_id: 1234,
                    name: 'Baz',
                    quantity: 7,
                },
            },
        };

        server.HitGrabServer
            .post('/managers/ajax/users/useconvertible.php')
            .reply(200, () => response);

        const postedDataPromise = server.spyOnPost('convertible_intake.php');

        // "Open" convertible
        $.post('https://www.mousehuntgame.com/managers/ajax/users/useconvertible.php');

        const data = await postedDataPromise;

        const expected = new ConvertibleMessageBuilder()
            .build(response as unknown as HgConvertibleResponse);

        expect(data).toEqual(expect.objectContaining(expected));
    });
});

