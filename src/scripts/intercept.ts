// File is injected by content.ts. Will have access to page context.

import {BackgroundMessage, ExtensionMessage} from "./common";

// Declare them here so typescript compiler will be happy :)
declare let lastReadJournalEntryId: any;
declare let user: any;

const postExtensionMessage = (
    message: ExtensionMessage
) => window.postMessage(message, '*');
  

$(document).ajaxSend(getUserBeforeHunting);
$(document).ajaxSuccess(ajaxSuccessCallback);
$(document).ajaxStop(ajaxStopCallback);

function ajaxSendCallback() {
    window.postMessage({
        greeting: 'SEND',
        source: 'mhct-helper-extension',
    }, '*');
}

function ajaxSuccessCallback() {
    // window.postMessage({
    //     greeting: 'SUCCESS',
    //     source: 'mhct-helper-extension',
    // }, '*');
}

function ajaxStopCallback() {
    window.postMessage({
        data: 'STOP',
    } as BackgroundMessage, '*');
}

function getUserBeforeHunting(event: JQuery.TriggeredEvent<Document, undefined, Document, Document>, jqx: JQuery.jqXHR<any>, ajaxOptions: JQuery.AjaxSettings<any>) {
    if (event.type !== 'ajaxSend' || !ajaxOptions.url?.includes('ajax/turns/activeturn.php')) {
        return;
    }
    
    const create_hunt_XHR = ajaxOptions.xhr;
    ajaxOptions.xhr = function() {
        const hunt_xhr = create_hunt_XHR!();
        const hunt_send = hunt_xhr.send;
        hunt_xhr.send = (...huntArgs) => {
            $.ajax({
                method: 'post',
                url: '/managers/ajax/pages/page.php',
                data: {
                    sn: 'Hitgrab',
                    page_class: 'Camp',
                    hg_is_ajax: 1,
                    last_read_journal_entry_id: lastReadJournalEntryId,
                    uh: user.unique_hash,
                },
                dataType: 'json',
            }).done(userRequestResponse => {
                hunt_xhr.addEventListener('loadend', () => {
                    const userPostResponse = JSON.parse(hunt_xhr.responseText);
                    const message: BackgroundMessage = {
                        source: 'mhct-helper-extension',
                        destination: 'background',
                        data: {
                            userRequestResponse,
                            userPostResponse,
                        },
                    };
                    postExtensionMessage(message);
                }, false);
                hunt_send.apply(hunt_xhr, huntArgs);
            });
        };
        return hunt_xhr;
    };
}