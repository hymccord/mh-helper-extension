import {z} from "zod/v4";

export const questLostCitySchema = z.object({
    minigame: z.object({
        is_cursed: z.boolean(),
    }),
});

export type QuestLostCity = z.infer<typeof questLostCitySchema>;
