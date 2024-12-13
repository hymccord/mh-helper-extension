import {z} from "zod";
import {inventoryItemSchema} from "./inventoryItem";
import {journalMarkupSchema} from "./journalMarkup";
import {pageSchema} from "./page";
import {userSchema} from "./user";

export const hgResponseSchema = z.object({
    user: userSchema,
    page: pageSchema.optional(),
    success: z.union([z.literal(0), z.literal(1)]),
    active_turn: z.boolean().optional(),
    journal_markup: z.array(journalMarkupSchema).optional(),
    inventory: z.union([
        z.record(z.string(), inventoryItemSchema),
        z.array(z.unknown()),
    ]).optional(),
});

export type HgResponse = z.infer<typeof hgResponseSchema>;
