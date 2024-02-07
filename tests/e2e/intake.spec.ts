import $ from 'jquery';
import nock from 'nock';

import MockServer from './mockServer';
import {e2eTeardown, e2eSetup} from './e2eSetup';
import {HgResponseBuilder, IntakeMessageBuilder, UserBuilder} from './builders';

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

});

