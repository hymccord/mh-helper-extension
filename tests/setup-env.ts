import nock from 'nock';
import {TextEncoder, TextDecoder} from 'util';

// https://github.com/jsdom/jsdom/issues/2524
Object.assign(window, {TextEncoder, TextDecoder});

// Throw if any real requests are made that aren't mocked
nock.disableNetConnect();
