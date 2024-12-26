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
                PTLOS_CONTRACT: '0x8289489afb035c4abd5a01ca9e6272480eeeea55',
                OFTTELOS_CONTRACT: '0x9db0209270947a780bfd825f805a5b6a30ef3f42',
                REDEEMER_CONTRACT: '0x53046dba0825e84c0c0eeff90737f8b66441d7ca',
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
