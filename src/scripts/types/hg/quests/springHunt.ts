import {z} from "zod/v4";

export const questSpringHuntSchema = z.object({
});

export type QuestSpringHunt = z.infer<typeof questSpringHuntSchema>;
