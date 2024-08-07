import {readFileSync} from 'fs';
import * as hg from '@scripts/types/hg';
import {z} from 'zod';

describe('ZodTest', () => {
    // read json from file
    // read as json
    const responseOne: string = JSON.parse(readFileSync(process.env.USERPROFILE + '/OneDrive/Documents/MouseHunt/mh-dumps/json-responses/bb/2024-beanstalk_page.php planting vine.json', 'utf-8'));
    const responseTwo: string = JSON.parse(readFileSync(process.env.USERPROFILE + '/OneDrive/Documents/MouseHunt/mh-dumps/json-responses/ronza/page.json', 'utf-8'));

    it('should parse post', async () => {
        const result = hg.hgResponseSchema.safeParse(responseOne);

        if (!result.success) {
            const issues = result.error.message;
            // fail test with error
            throw new Error(issues);
        }
    });

    it('should parse pre', async () => {
        const result = hg.hgResponseSchema.safeParse(responseTwo);

        if (!result.success) {
            const issues = result.error.message;
            // fail test with error
            throw new Error(issues);
        }

        // const viewingAtts = result.data.user.viewing_atts;
        // if (viewingAtts != null && 'desert_warpath' in viewingAtts) {
        //     console.log(viewingAtts.desert_warpath.wave);
        // }
    });

    it('should do something', async () => {
        const result = hg.viewingAttributesSchema.safeParse({
            trap_effectiveness: 'strong',
            reset_effectivness: false,
        });

        if (!result.success) {
            const issues = result.error.message;
            // fail test with error
            throw new Error(issues);
        }
    });

    it('test', () => {
        const schema = z.object({
            viewing_atts: z.union([
                z.object({
                    trap_effectiveness: z.string(),
                    reset_effectiveness: z.boolean(),
                }),
                z.object({
                    fiery_warpath: z.object({
                        wave: z.union([z.number(), z.literal('portal')]),
                    }),
                }),
                z.object({}),
            ]),
        });
        const result = schema.safeParse({
            viewing_atts: {
                "trap_effectiveness": "Excellent",
                "reset_effectiveness": false,
            },
        });
        type x = z.infer<typeof schema>;

        if (!result.success) {
            const issues = result.error.message;
            // fail test with error
            throw new Error(issues);
        }
    });
});
