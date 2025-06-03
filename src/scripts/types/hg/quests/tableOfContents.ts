import {z} from "zod/v4";

export const questTableOfContentsSchema = z.object({
    is_writing: z.boolean(),
    current_book: z.object({
        volume: z.coerce.number(),
    }),
});

export type QuestTableOfContents = z.infer<typeof questTableOfContentsSchema>;
