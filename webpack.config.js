const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const RemoteDownloadFileWebpackPlugin = require('./webpack/RemoteDownloadFileWebpackPlugin.js');

/**
 * @param {Object} env - Environment configuration
 * @param {('firefox'| undefined)} env.browser - Target browser
 * @param {('production'| undefined )} env.mode - Build mode
 */
module.exports = (env) => {
    const manifest = env.browser === 'firefox' ? 'manifest.v3.firefox.json' : 'manifest.v3.chrome.json';
    const devtool = env.mode === 'production' ? 'inline-source-map' : 'inline-cheap-module-source-map';
    /**
     * @type {import('webpack').Configuration}
     */
    return {
        entry: {
            background: './src/scripts/background.js',
            content: './src/scripts/content.js',
            main: './src/scripts/main.js',
            options: './src/scripts/options.js',
            popup: './src/scripts/popup.js',
            theme: './src/scripts/theme.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist', env.browser ?? 'chrome'),
            filename: 'scripts/[name].js',
            clean: true,
        },
        mode: 'development',
        devtool: devtool,
        module: {
            rules: [
                {
                    test: /\.[jt]sx?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/,
                    options: {
                        transpileOnly: true,
                    },
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
            plugins: [new TsconfigPathsPlugin()],
        },
        plugins: [
            new ForkTsCheckerWebpackPlugin(),
            new HtmlWebpackPlugin({
                template: './src/options.html',
                filename: 'options.html',
                chunks: [
                    'theme',
                    'options'
                ],
            }),
            new HtmlWebpackPlugin({
                template: './src/popup.html',
                filename: 'popup.html',
                chunks: [
                    'theme',
                    'popup'
                ],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    { from: `./src/${manifest}`, to: 'manifest.json' },
                    { from: './src/images', to: 'images' },
                    { from: './src/css', to: 'css' },
                    { from: './src/sounds', to: 'sounds' },
                ],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: './src/third_party/tsitu/bm-menu.min.js',
                        to: 'third_party/tsitu/bm-menu.min.js',
                        transform(content, path) {
                            // Replace EXTENSION_URL with the appropriate extension URL iff Chrome
                            // Firefox will be replaced at runtime due to unique internal extension ID
                            if (env.browser == 'firefox') {
                                return content;
                            }

                            // The reason we replace for chrome at compile time is the extension review for MV3 rejects
                            // it otherwise. Even when we were replacing at runtime.
                            return content.toString().replace(/EXTENSION_URL/g, 'chrome-extension://ghfmjkamilolkalibpmokjigalmncfek');
                        },
                    },
                ],
            }),
            new RemoteDownloadFileWebpackPlugin([
                {
                    urlPrefix:'https://raw.githubusercontent.com/MHCommunity/mh-dark-mode/main/css/',
                    pathPrefix: 'third_party/potatosalad/css/',
                    files: [
                        'giftbox.css',
                        'inbox.css',
                        'inventory.css',
                        'main.css',
                        'marketplace.css',
                        'messagebox.css',
                        'profile.css',
                        'scoreboard.css',
                        'shop.css',
                        'team.css',
                        'trap.css',
                        'treasuremap.css',
                        'camp/camp.css',
                        'camp/hud.css',
                        'camp/journal.css',
                    ],
                },
                {
                    urlPrefix: 'https://cdn.jsdelivr.net/gh/tsitu/MH-Tools@master/src/bookmarklet/',
                    pathPrefix: 'third_party/tsitu/',
                    files: [
                        'bm-analyzer.min.js',
                        'bm-crafting.min.js',
                        'bm-cre.min.js',
                        'bm-crown.min.js',
                        'bm-map.min.js',
                        'bm-powers.min.js',
                        'bm-setup-fields.min.js',
                        'bm-setup-items.min.js',
                    ],
                },
            ])
        ],
    };
}

