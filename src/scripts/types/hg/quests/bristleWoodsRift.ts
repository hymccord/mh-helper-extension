import {z} from "zod/v4";

export const questRiftBristleWoodsSchema = z.object({
    chamber_name: z.string(),
});

export type QuestRiftBristleWoods = z.infer<typeof questRiftBristleWoodsSchema>;
