import {z} from "zod";

export interface BaseIntakeMessage {
    uuid: string;
    extension_version: number;
    hunter_id_hash: string;
    entry_timestamp: number; // seconds
}

export interface IntakeMessage extends BaseIntakeMessage {
    entry_id: number;
    location: ComponentEntry | null;
    shield: boolean;
    total_power: number;
    total_luck: number;
    attraction_bonus: number;
    stage?: unknown;
    trap: ComponentEntry;
    base: ComponentEntry;
    cheese: ComponentEntry;
    charm: ComponentEntry | null;
    caught: number;
    attracted: number;
    mouse: string;
    loot?: Loot[];
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
    hunt_details: {[key: PropertyKey]: string | number | boolean}
}

export interface ConvertibleMessage extends BaseIntakeMessage {
    convertible: HgItem;
    items: HgItem[];
    asset_package_hash: number;
}

/**
 * An object with an numbered id and string name.
 */
// This may need to be ComponentEntry<TId, TName> if id needs to be not a number
export interface ComponentEntry {
    id: number;
    name: string;
}

interface Loot {
    id: number;
    name: string;
    amount: number;
    lucky: boolean;
    plural_name: string;
}

/**
 * An object opened (convertible) or received (convertible contents)
 */
export const hgItemSchema = z.object({
    /** HitGrab's ID for the id */
    id: z.coerce.number().optional(),
    item_id: z.coerce.number().optional(),
    /** HitGrab's display name for the item */
    name: z.string(),
    /** The number of items opened or received */
    quantity: z.coerce.number(),
})
    .transform((val, ctx) => {
        // Make sure that either id or item_id is set
        const id = val.id ?? val.item_id;
        if (id === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Either id or item_id must be set",
            });
            return z.NEVER;
        }
        return {
            id: id,
            name: val.name,
            quantity: val.quantity,
        };
    });
export type HgItem = z.infer<typeof hgItemSchema>;

export const MhctResponseSchema = z.object({
    status: z.string(),
    message: z.string(),
});
export type MhctResponse = z.infer<typeof MhctResponseSchema>;
