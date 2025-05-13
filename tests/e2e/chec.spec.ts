import nock from 'nock';
import $ from 'jquery';
import { set } from 'zod';

describe('Check', () => {
    beforeAll(() => {
        window.$ = $;
    });

    it('should check if the test is running', async () => {
        const scope = nock('http://localhost')
            .post('/uuid.php')
            .reply(200, "1", {"content-type": "text/html"});

        const postAsync = (url: string, data: string) => {
            return new Promise((resolve, reject) => {
                $.post(url, data)
                    .done((response) => resolve(response))
                    .fail((error) => reject(error));
            });
        };

        const data = await postAsync('http://localhost/uuid.php', "2");
        console.log('done', data);

        expect(data).toBe("1");
    });
});
