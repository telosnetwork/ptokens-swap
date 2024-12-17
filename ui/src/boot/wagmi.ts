import { defineBoot } from '#q-app/wrappers'
import { http, createConfig } from '@wagmi/vue'
import { mainnet, bsc, sepolia } from '@wagmi/vue/chains'
import { WagmiPlugin } from '@wagmi/vue'
import { injected, metaMask, safe, walletConnect } from '@wagmi/vue/connectors'
import { VueQueryPlugin } from '@tanstack/vue-query';

const projectId: string = "";

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(({ app }) => {
  const config = createConfig({
    chains: [mainnet, bsc, sepolia],
    connectors: [
      injected(),
      metaMask(),
      safe(),
      walletConnect({projectId})],
    transports: {
      [mainnet.id]: http(),
      [bsc.id]: http(),
      [sepolia.id]: http(),
    },
  })

  app.use(WagmiPlugin, { config });
  app.use(VueQueryPlugin, {});
})


