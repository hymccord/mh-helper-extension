import {z} from "zod/v4";

export const questSunkenCitySchema = z.object({
    is_diving: z.boolean(),
    distance: z.coerce.number(),
    zone_name: z.string(),
});

export type QuestSunkenCity = z.infer<typeof questSunkenCitySchema>;
