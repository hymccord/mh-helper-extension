import {z} from "zod/v4";

export const questMousoleumSchema = z.object({
    has_wall: z.boolean(),
});

export type QuestMousoleum = z.infer<typeof questMousoleumSchema>;
