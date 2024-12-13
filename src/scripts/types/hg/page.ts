import {z} from 'zod';

const journalSchema = z.object({
    entries_string: z.string(),
});

export const pageSchema = z.object({
    journal: journalSchema.optional(),
});
export type Page = z.infer<typeof pageSchema>;
