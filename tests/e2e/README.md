# End-to-End Testing

The contents of this directory are to help test the core functionality of the extension (hunt + convertible submission) through fake HTTP calls.

Any HTTP calls that aren't properly mocked won't turn into real network requests since the [setup-env.ts](/tests/setup-env.ts) sets nock to throw if any calls try to connect. This file is run when jest initializes the environment from [jest.config.js](/jest.config.js).

## Template

A good starting point for any new file will look like this:

```typescript
import $ from 'jquery';
import nock from 'nock';

import MockServer from './mockServer';
import {e2eTeardown, e2eSetup} from './e2eSetup';

// Dont run any legacy js for now. It isn't strongly typed yet (mostly quests for detailers).
jest.mock('@scripts/modules/details/legacy');
jest.mock('@scripts/modules/stages/legacy');

describe('test module description', () => {
    let server: MockServer;

    beforeAll(async () => {
        await e2eSetup();
    });

    beforeEach(() => {
        server = new MockServer();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    afterAll(() => {
        e2eTeardown();
    });

    it('is a test', () => {

    });
});
```
