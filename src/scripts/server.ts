import * as utils from './utils';
import * as common from "./common";

export async function sendMessageToServer(url: string, final_message: common.FinalMessage) {
    const settings = await utils.getSettings();
    if (!settings.tracking_enabled){
        return;
    }

    const basic_info: common.BasicInfo = {
        user_id: final_message.user_id,
        entry_timestamp: final_message.entry_timestamp,
    };

    // Get UUID
    void $.post(common.base_domain_url + "/uuid.php", basic_info).done(data => {
        if (typeof data === 'string') {
            final_message.uuid = data;
            sendAlready(url, final_message);
        }
    });

}

function sendAlready(url: string, fin_message: common.FinalMessage) {
    // Send to database
    void $.post(url, fin_message)
        .done(data => {
            if (typeof data === 'string') {
                //const response = JSON.parse(data);
                //showFlashMessage(response.status, response.message);
            }
        });
}