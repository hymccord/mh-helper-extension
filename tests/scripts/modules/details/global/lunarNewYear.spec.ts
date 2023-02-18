import { LunarNewYearDetailer, type LunarNewYearDetails } from '@scripts/modules/details/global/lunarNewYear'
import { JournalMarkup, QuestLunarNewYearLantern, type User } from '@scripts/types/hg';
import { HgResponseBuilder, IntakeMessageBuilder, UserBuilder } from '@tests/utility/builders';

describe('lunarNewYearDetailer', () => {
    const userBuilder = new UserBuilder();
    const detailer = new LunarNewYearDetailer();

    describe('getDetails', () => {
        it('returns undefined when quest is undefined', () => {
            const preUser = userBuilder.withQuests({}).build();
            const postUser = userBuilder.withQuests({}).build();

            expect(detailer.addDetails(null!, preUser, postUser, null!)).toBe(undefined);
        })

        it('calculates luck using post hunt quest', () => {

            const preUser = userBuilder.withQuests({
                QuestLunarNewYearLantern: {
                    lantern_status: 'lantern',
                    is_lantern_active: true,
                    lantern_height: 142,
                }
            }).build();
            const postUser = userBuilder.withQuests({
                QuestLunarNewYearLantern: {
                    lantern_status: 'lantern',
                    is_lantern_active: true,
                    lantern_height: 255
                }
            }).build();

            const expected: LunarNewYearDetails = {
                is_lny_hunt: true,
                lny_luck: 25
            }

            expect(detailer.addDetails(null!, preUser, postUser, null!)).toStrictEqual(expected);
        });

        it('sets luck to 0 when latern is not active', () => {
            const postUser = userBuilder.withQuests({
                QuestLunarNewYearLantern: {
                    lantern_status: '',
                    is_lantern_active: false,
                    lantern_height: 144,
                }
            }).build();

            const expected: LunarNewYearDetails = {
                is_lny_hunt: true,
                lny_luck: 0
            }

            expect(detailer.addDetails(null!, null!, postUser, null!)).toStrictEqual(expected);
        });

        it('sets max luck to 50', () => {
            const postUser = userBuilder.withQuests({
                QuestLunarNewYearLantern: {
                    lantern_status: 'lantern',
                    is_lantern_active: true,
                    lantern_height: 1000,
                }
            }).build();

            const expected: LunarNewYearDetails = {
                is_lny_hunt: true,
                lny_luck: 50
            }
            expect(detailer.addDetails(null!, null!, postUser, null!))
                .toStrictEqual(expected);
        })
    })
})
