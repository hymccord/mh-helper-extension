import {defineConfig} from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';
// import {resolve} from 'path';

export default defineConfig({
    test: {
        globals: true,
    //   environment: 'jsdom',
    //   alias: {
    //     // Match your existing Jest path aliases
    //     '@scripts': resolve(__dirname, './src/scripts'),
    //     '@tests': resolve(__dirname, './tests')
    //   },
    //   coverage: {
    //     provider: 'v8',
    //     reporter: ['text', 'html'],
    //   },
    //   deps: {
    //     interopDefault: true
    //   }
    browser: {
        enabled: true,
        provider: 'playwright',
        instances: [
          {
            browser: 'chromium',

          },
          {
            browser: 'firefox',
          },
        ],
      },
        setupFiles: ['./tests/setup-env.ts'],
    },
    plugins: [tsConfigPaths()]
});
