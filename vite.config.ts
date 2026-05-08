import type { Plugin, UserConfig } from 'vite';

import fsp from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

interface AssetPack {
    urlPrefix: string;
    pathPrefix: string;
    files: string[];
}

const browser = process.env.BROWSER ?? 'chrome';
const entryName = process.env.ENTRY ?? 'background';
const prepareStaticAssets = process.env.PREPARE_STATIC === '1';
const rootDir = __dirname;
const outDir = path.resolve(rootDir, 'dist', browser);

const supportedBrowsers = ['chrome', 'edge', 'firefox', 'opera', 'safari'];

const remoteAssets: AssetPack[] = [
    {
        urlPrefix: 'https://raw.githubusercontent.com/MHCommunity/mh-dark-mode/main/css/',
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
            'bm-setup-fields.min.js',
            'bm-setup-items.min.js',
        ],
    },
];

const entries: Record<string, string> = {
    'background': 'src/scripts/background.ts',
    'content/content-message-handler': 'src/scripts/content/content-message-handler.ts',
    'content': 'src/scripts/content.js',
    'main': 'src/scripts/main.ts',
    'options': 'src/scripts/options.js',
    'popup': 'src/scripts/popup.js',
    'theme': 'src/scripts/theme.js',
};

function transformManifest(manifestJson: string, targetBrowser: string): string {
    const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
    return JSON.stringify(transformPrefixes(manifest, targetBrowser), null, 2);
}

function transformPrefixes(manifest: Record<string, unknown>, targetBrowser: string): Record<string, unknown> {
    const prefix = `__${targetBrowser}__`;

    function transformObject(obj: Record<string, unknown>): Record<string, unknown> {
        return Object.keys(obj).reduce<Record<string, unknown>>((acc, key) => {
            const value = obj[key];
            const nested = typeof value === 'object' && value !== null && !Array.isArray(value);

            if (key.startsWith(prefix)) {
                const newKey = key.slice(prefix.length);
                if (value == null) {
                    delete acc[newKey];
                    return acc;
                }

                acc[newKey] = nested
                    ? transformObject(value as Record<string, unknown>)
                    : value;
            } else if (!supportedBrowsers.some(b => key.startsWith(`__${b}__`))) {
                acc[key] = nested
                    ? transformObject(value as Record<string, unknown>)
                    : value;
            }

            return acc;
        }, {});
    }

    return transformObject(manifest);
}

async function copyDir(src: string, dest: string): Promise<void> {
    await fsp.mkdir(dest, {recursive: true});
    const dirEntries = await fsp.readdir(src, {withFileTypes: true});
    for (const entry of dirEntries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fsp.copyFile(srcPath, destPath);
        }
    }
}

async function copyStaticAssets(): Promise<void> {
    const manifestSrc = await fsp.readFile(path.resolve(rootDir, 'src/manifest.json'), 'utf-8');
    await fsp.writeFile(path.resolve(outDir, 'manifest.json'), transformManifest(manifestSrc, browser));

    await Promise.all(
        ['images', 'css', 'sounds'].map(dir =>
            copyDir(path.resolve(rootDir, 'src', dir), path.resolve(outDir, dir))
        )
    );

    await Promise.all(
        ['popup.html', 'options.html'].map(htmlFile =>
            fsp.copyFile(path.resolve(rootDir, 'src', htmlFile), path.resolve(outDir, htmlFile))
        )
    );

    const bmMenuDest = path.resolve(outDir, 'third_party/tsitu/bm-menu.min.js');
    await fsp.mkdir(path.dirname(bmMenuDest), {recursive: true});
    let bmMenuContent = await fsp.readFile(path.resolve(rootDir, 'src/third_party/tsitu/bm-menu.min.js'), 'utf-8');
    if (browser !== 'firefox') {
        bmMenuContent = bmMenuContent.replace(
            /EXTENSION_URL/g,
            'chrome-extension://ghfmjkamilolkalibpmokjigalmncfek'
        );
    }
    await fsp.writeFile(bmMenuDest, bmMenuContent);
}

async function downloadRemoteFiles(): Promise<void> {
    const downloads: Promise<void>[] = [];
    for (const pack of remoteAssets) {
        for (const file of pack.files) {
            const url = `${pack.urlPrefix}${file}`;
            const destPath = path.resolve(outDir, pack.pathPrefix, file);
            downloads.push(
                (async () => {
                    await fsp.mkdir(path.dirname(destPath), {recursive: true});
                    try {
                        const response = await fetch(url);
                        if (!response.ok) {
                            throw new Error(`${response.status} ${response.statusText}`);
                        }
                        const content = await response.text();
                        await fsp.writeFile(destPath, content);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        console.warn(`Warning: Failed to download ${url}: ${message}`);
                    }
                })()
            );
        }
    }
    await Promise.all(downloads);
}

function staticAssetsPlugin(): Plugin {
    return {
        name: 'extension-static-assets',
        apply: 'build',
        async closeBundle() {
            await Promise.all([
                copyStaticAssets(),
                downloadRemoteFiles(),
            ]);
        },
    };
}

function getConfig(mode: string): UserConfig {
    const isDev = mode === 'development';
    const envValue = isDev ? 'development' : 'production';
    const entry = entries[entryName];
    if (!entry) {
        throw new Error(`Unknown ENTRY "${entryName}".`);
    }

    const plugins = [tsconfigPaths()];
    if (prepareStaticAssets) {
        plugins.push(staticAssetsPlugin());
    }

    return {
        plugins,
        define: {
            'process.env.ENV': JSON.stringify(envValue),
            'process.env.NODE_ENV': JSON.stringify(envValue),
        },
        build: {
            outDir,
            emptyOutDir: prepareStaticAssets,
            lib: {
                entry: path.resolve(rootDir, entry),
                formats: ['iife'],
                name: entryName.replace(/[/\\-]/g, '_'),
                fileName: () => `scripts/${entryName}.js`,
            },
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
            sourcemap: isDev ? 'inline' : true,
            minify: !isDev,
            target: 'es2020',
        },
        logLevel: 'warn',
    };
}

export default defineConfig(({mode}) => {
    return getConfig(mode);
});
