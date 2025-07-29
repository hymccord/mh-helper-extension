import {FortRoxStager} from "@scripts/modules/stages/environments/fortRox";
import {JournalMarkup, User} from "@scripts/types/hg";
import {IntakeMessage} from "@scripts/types/mhct";
import {QuestFortRox} from "@scripts/types/hg/quests";
import {UserBuilder} from "@tests/utility/builders";
import {mock} from "jest-mock-extended";

describe('Fort Rox stages', () => {
    const message = mock<IntakeMessage>();
    const postUser = mock<User>();
    const journal = mock<JournalMarkup>();


    let preUser: User & { quests: { QuestFortRox: QuestFortRox } };
    let stager: FortRoxStager;

    beforeEach(() => {
        stager = new FortRoxStager();

        const quest: QuestFortRox = {
            is_day: null,
            is_night: null,
            is_dawn: null,
            is_lair: null,
            current_stage: null,
            tower_status: "",
            fort: {
                w: {level: 0, status: 'inactive'},
                b: {level: 0, status: 'inactive'},
                c: {level: 0, status: 'inactive'},
                m: {level: 0, status: 'inactive'},
                t: {level: 0, status: 'inactive'}
            }
        };
        preUser = new UserBuilder()
            .withEnvironment({
                environment_id: 0,
                environment_name: 'Fort Rox',
            })
            .withQuests({QuestFortRox: quest})
            .build() as User & { quests: { QuestFortRox: QuestFortRox } };
    });

    it('should be for the Fort Rox environment', () => {
        expect(stager.environment).toBe('Fort Rox');
    });

    it('should throw when QuestFortRox is undefined', () => {
        // @ts-expect-error - testing nullish input
        preUser.quests.QuestFortRox = undefined;

        expect(() => stager.addStage(message, preUser, postUser, journal))
            .toThrow('QuestFortRox is undefined');
    });

    it.each`
        nightStage          | expected
        ${'stage_one'}      | ${'Twilight'}
        ${'stage_two'}      | ${'Midnight'}
        ${'stage_three'}    | ${'Pitch'}
        ${'stage_four'}     | ${'Utter Darkness'}
        ${'stage_five'}     | ${'First Light'}
    `('should set stage to $expected during night when in $nightStage', ({nightStage, expected}) => {
        preUser.quests.QuestFortRox.is_night = true;
        preUser.quests.QuestFortRox.current_stage = nightStage;

        stager.addStage(message, preUser, postUser, journal);

        expect(message.stage).toBe(expected);
    });

    it('should throw when night stage is unknown', () => {
        preUser.quests.QuestFortRox.is_night = true;
        // @ts-expect-error - testing invalid input
        preUser.quests.QuestFortRox.current_stage = 'stage_foo';

        expect(() => stager.addStage(message, preUser, postUser, journal))
            .toThrow('Skipping unknown Fort Rox stage');
    });

    it('should set stage to Day when is day', () => {
        preUser.quests.QuestFortRox.is_day = true;

        stager.addStage(message, preUser, postUser, journal);

        expect(message.stage).toBe('Day');
    });

    it('should set stage to Dawn when in dawn', () => {
        preUser.quests.QuestFortRox.is_dawn = true;

        stager.addStage(message, preUser, postUser, journal);

        expect(message.stage).toBe('Dawn');
    });

    it('should set stage to Heart of the Meteor when in lair', () => {
        preUser.quests.QuestFortRox.is_lair = true;

        stager.addStage(message, preUser, postUser, journal);

        expect(message.stage).toBe('Heart of the Meteor');
    });

    it('should throw when there is an unhandled state', () => {
        expect(() => {
            stager.addStage(message, preUser, postUser, journal);
        }).toThrow('Skipping unknown Fort Rox stage');
    });
});
