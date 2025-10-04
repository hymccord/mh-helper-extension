import type { IMessageExemption } from '@scripts/hunt-filter/interfaces';
import type { IntakeMessage } from '@scripts/types/mhct';

class IceFortressExemption implements IMessageExemption {
    readonly description = 'Frost King transitions in Ice Fortress';
    readonly property = 'stage';
    getExemptions(
        pre: IntakeMessage,
        post: IntakeMessage
    ): (keyof IntakeMessage)[] | null {
        if (
            pre.stage === 'Shield Down' &&
            post.stage === 'Shield Up' &&
            pre.mouse === 'Frost King'
        ) {
            return ['stage'];
        } else if (
            pre.stage === 'Shield Up' &&
            post.stage === 'Shield Down'
        ) {
            // Possibly we could check things like what the old barrier level was but this should be fine
            // This is the hunt that led to the destruction of the barrier
            return ['stage'];
        }

        return null;
    }
}

export const iceFortressExemptions = [
    new IceFortressExemption(),
];
