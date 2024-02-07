import {z} from "zod";
import {userSchema} from "./user";
import {journalMarkupSchema} from "./journalMarkup";
import {inventoryItemSchema} from "./inventoryItem";
import { ConvertibleMessageBuilder } from "@tests/e2e/builders";

export const hgResponseSchema = z.object({
    user: userSchema,
    page: z.unknown().optional(),
    success: z.union([z.literal(0), z.literal(1)]),
    active_turn: z.boolean().optional(),
    journal_markup: z.array(journalMarkupSchema).optional(),
    inventory: z.union([
        z.record(z.string(), inventoryItemSchema),
        z.array(z.unknown()),
    ]).optional(),
});

export type HgResponse = z.infer<typeof hgResponseSchema>;

export const hgConvertibleResponse = hgResponseSchema.extend({
    convertible_open: z.object({
        quantity: z.coerce.number(),
        name: z.string(),
        type: z.string(),
        items: z.array(z.object({
            type: z.string(),
            name: z.string(),
            quantity: z.coerce.number()
        }))
    }),
    inventory: z.record(z.string(), z.object({
        item_id: z.coerce.number()
    })),
    items: z.record(z.string(), z.object({
        item_id: z.coerce.number(),
        name: z.string(),
        quantity: z.coerce.number()
    }))
});

export type HgConvertibleResponse = z.infer<typeof hgConvertibleResponse>;
