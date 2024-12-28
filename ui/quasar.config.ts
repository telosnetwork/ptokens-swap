import { defineConfig } from '#q-app/wrappers';

export default defineConfig(() => {
    return {
        boot: [
            'wagmi'
        ],
        css: [
            'app.scss'
        ],
        extras: [
            'roboto-font',
            'material-icons',
        ],
        build: {
            target: {
                browser: [ 'es2022', 'firefox115', 'chrome115', 'safari14' ],
                node: 'node20'
            },
            typescript: {
                strict: true,
                vueShim: true
            },
            vueRouterMode: 'hash',
            env: {
                WALLETCONNECT_PROJECT_ID: '14ec76c44bae7d461fa0f5fd5f8a9da1'
            },
            vitePlugins: [
                ['vite-plugin-checker', {
                    vueTsc: true,
                    eslint: {
                        lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
                        useFlatConfig: true
                    }
                }, { server: false }]
            ]
        },
        devServer: {
            open: true
        },
        framework: {
            config: {},
            plugins: [
                'Notify'
            ]
        },
        animations: [],
        ssr: {
            prodPort: 3000,
            middlewares: [
                'render'
            ],
            pwa: false
        },
        pwa: {
            workboxMode: 'GenerateSW'
        },
        capacitor: {
            hideSplashscreen: true
        },
        electron: {
            preloadScripts: [ 'electron-preload' ],
            inspectPort: 5858,
            bundler: 'packager',
            builder: {
                appId: 'ui'
            }
        },
        bex: {
            extraScripts: []
        }
    };
});
