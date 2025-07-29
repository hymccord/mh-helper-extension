import {z} from "zod";

export const FortRoxStages = [ 'stage_one', 'stage_two', 'stage_three', 'stage_four', 'stage_five' ] as const;
const fortRoxStageSchema = z.enum(FortRoxStages);

export const questFortRoxSchema = z.object({
    is_day: z.literal(true).nullable(),
    is_night: z.literal(true).nullable(),
    is_dawn: z.literal(true).nullable(),
    is_lair: z.literal(true).nullable(),
    current_stage: fortRoxStageSchema.nullable(),
    tower_status: z.string(),
    fort: z.object({
        w: z.object({
            level: z.coerce.number(),
            status: z.string(),
        }),
        b: z.object({
            level: z.coerce.number(),
            status: z.string(),
        }),
        c: z.object({
            level: z.coerce.number(),
            status: z.string(),
        }),
        m: z.object({
            level: z.coerce.number(),
            status: z.string(),
        }),
        t: z.object({
            level: z.coerce.number(),
            status: z.string(),
        }),
    }),
});

export type FortRoxStage = z.infer<typeof fortRoxStageSchema>;
export type QuestFortRox = z.infer<typeof questFortRoxSchema>;
