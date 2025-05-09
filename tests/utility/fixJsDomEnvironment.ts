import JSDOMEnvironment from 'jest-environment-jsdom';
import {TextDecoder, TextEncoder} from 'util';

export default class FixJsDomEnvironment extends JSDOMEnvironment {
    constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
        super(...args);

        this.global.fetch = fetch;
        this.global.Headers = Headers;
        this.global.Request = Request;
        this.global.Response = Response;
        this.global.TextEncoder = TextEncoder;
        // @ts-ignore
        this.global.TextDecoder = TextDecoder;
    }
}
