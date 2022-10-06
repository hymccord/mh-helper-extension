import {ConvertibleInfo, convertible_intake_url, HgItem} from "./common";
import {sendMessageToServer} from "./server";
import * as utils from "./utils";


export async function submitConvertible(convertible: HgItem, items: HgItem[], user_id: number) {
    const record: ConvertibleInfo = {
        convertible: convertible,
        items: items,
        extension_version: utils.getVersion(),
        asset_package_hash: Date.now(),
        user_id: user_id,
        entry_timestamp: Math.round(Date.now() / 1000),
    };

    // Send to database
    utils.log(utils.LogLevel.Info, {message: "MHCT: submitting convertible", record:record});
    await sendMessageToServer(convertible_intake_url, record);
}


