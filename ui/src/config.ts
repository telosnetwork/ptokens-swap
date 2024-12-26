import {createConfig, http, injected} from '@wagmi/vue'
import { mainnet, telosTestnet, bsc } from '@wagmi/vue/chains'
import { metaMask, safe, walletConnect } from '@wagmi/connectors'

const projectId = process.env.WALLETCONNECT_PROJECT_ID as string;

export default createConfig({
  chains: [mainnet, bsc, telosTestnet],
  connectors: [
    injected(),
    metaMask(),
    safe(),
    walletConnect({projectId})],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [telosTestnet.id]: http(),
  },
})
