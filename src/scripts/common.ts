
export const base_domain_url = "https://www.mhct.win";
export const db_url = base_domain_url + "/intake.php";
export const map_intake_url = base_domain_url + "/map_intake.php";
export const convertible_intake_url = base_domain_url + "/convertible_intake.php";
export const map_helper_url = base_domain_url + "/maphelper.php";
export const rh_intake_url = base_domain_url + "/rh_intake.php";

export interface Options {
    success_messages: boolean,
    error_messages: boolean,
    debug_logging: boolean,
    icon_timer: boolean,
    horn_sound: boolean,
    custom_sound: string,
    horn_volume: number,
    horn_alert: boolean,
    horn_webalert: boolean,
    horn_popalert: boolean,
    tracking_enabled: boolean,
    tsitu_loader_on: boolean,
    tsitu_loader_offset: number,
    escape_button_close: boolean,
}

export interface HgItem {
    id: number,
    name: string,
    quantity: number,
}

export interface BasicInfo {
    user_id: number,
    entry_timestamp: number
}

export interface FinalMessage extends BasicInfo {
    uuid?: string,
}

export interface ConvertibleInfo extends FinalMessage {
    convertible: HgItem,
    items: HgItem[],
    extension_version: string,
    asset_package_hash: number,
}

export interface ExtensionMessage {
    source: 'mhct-helper-extension',

}
export interface BackgroundMessage extends ExtensionMessage {
    destination: 'background',
    data: any
}