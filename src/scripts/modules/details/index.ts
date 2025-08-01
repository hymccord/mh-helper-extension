import type {IDetailer, IEnvironmentDetailer} from './details.types';
import {DraconicDepthsDetailer} from './environments/draconicDepths';
import {AugerBotAmbientIcebergDetailer} from './environments/iceberg';
import {IceFortressDetailer} from './environments/iceFortress';
import {HalloweenDetailer} from './global/halloween';

/* Hunt Response Detailers */
// Receive the pre and post user states, and the journal markup associated with the active hunt.
const environmentDetailerModules: IEnvironmentDetailer[]  = [
    new DraconicDepthsDetailer(),
    new IceFortressDetailer(),
];

const globalDetailerModules: IDetailer[] = [
    new HalloweenDetailer(),
];

/* Ambient Detailers */
// Provide additional context or information that may not be directly related to the hunt journal markup.
// They are run on every post-hunt journal markup entry
const ambientEnvironmentDetailerModules: IEnvironmentDetailer[] = [
    new AugerBotAmbientIcebergDetailer(),
];
const ambientDetailerModules: IDetailer[] = [];

export {environmentDetailerModules, globalDetailerModules, ambientEnvironmentDetailerModules, ambientDetailerModules};
