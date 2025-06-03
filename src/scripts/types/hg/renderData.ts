import {z} from "zod/v4";

export const renderDataSchema = z.object({
    //image: Image | [];
    entry_id: z.number(),
    mouse_type: z.union([z.string(), z.boolean()]),
    css_class: z.string(),
    entry_date: z.string(),
    environment: z.string(),
    // social_link_data: SocialLinkData,
    entry_timestamp: z.number(),
    text: z.string(),
});

export type RenderData = z.infer<typeof renderDataSchema>;
