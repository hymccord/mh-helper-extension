import {z} from "zod/v4";

export const questForbiddenGroveSchema = z.object({
    grove: z.object({
        is_open: z.boolean(),
        progress: z.coerce.number(),
    }),
});

export type QuestForbiddenGrove = z.infer<typeof questForbiddenGroveSchema>;
