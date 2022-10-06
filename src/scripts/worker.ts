import browser from 'webextension-polyfill';
import { BackgroundMessage, ExtensionMessage } from './common';

browser.runtime.onMessage.addListener(messageRouter);


async function messageRouter(message: BackgroundMessage, sender: browser.Runtime.MessageSender) : Promise<any> {
    if (message.source !== 'mhct-helper-extension'){
        console.log("message not from this extension");
    }

    if (message.destination !== 'background') {
        console.log('not interested!');
    }

    console.log(message.data);
}
const something = {

}