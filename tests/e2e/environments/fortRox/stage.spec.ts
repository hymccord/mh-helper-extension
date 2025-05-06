import $ from 'jquery';
import nock from 'nock';

import MockServer from '../../mockServer';
import {e2eSetup, e2eTeardown} from '../../e2eSetup';
import {HgResponseBuilder, IntakeMessageBuilder, UserBuilder} from '../../builders';
import {QuestFortRox} from '@scripts/types/hg/quests';

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

    it.each<{quest: QuestFortRox, stage: string}>([
        {quest: {is_day: true, is_night: null, is_dawn: null, is_lair: null, current_stage: null}, stage: 'Day'},
        {quest: {is_day: null, is_night: true, is_dawn: null, is_lair: null, current_stage: 'stage_one'}, stage: 'Twilight'},
        {quest: {is_day: null, is_night: true, is_dawn: null, is_lair: null, current_stage: 'stage_two'}, stage: 'Midnight'},
        {quest: {is_day: null, is_night: true, is_dawn: null, is_lair: null, current_stage: 'stage_three'}, stage: 'Pitch'},
        {quest: {is_day: null, is_night: true, is_dawn: null, is_lair: null, current_stage: 'stage_four'}, stage: 'Utter Darkness'},
        {quest: {is_day: null, is_night: true, is_dawn: null, is_lair: null, current_stage: 'stage_five'}, stage: 'First Light'},
        {quest: {is_day: null, is_night: null, is_dawn: true, is_lair: null, current_stage: null}, stage: 'Dawn'},
        {quest: {is_day: null, is_night: null, is_dawn: null, is_lair: true, current_stage: null}, stage: 'Heart of the Meteor'},
    ])('should set stage to $stage', async ({quest, stage}) => {
        const userBuilder = new UserBuilder();
        let user = userBuilder
            .withEnvironment({
                environment_id: 0,
                environment_name: 'Fort Rox',
            })
            .withQuests({
                QuestFortRox: quest,
            })
            .build();

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
            .withStage(stage)
            .build(response);

        expect(data).toEqual(expect.objectContaining(expectedMessage));
    });
});

