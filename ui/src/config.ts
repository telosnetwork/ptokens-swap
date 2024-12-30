import {createConfig, http, injected} from '@wagmi/vue'
import { mainnet, telosTestnet, bsc } from '@wagmi/vue/chains'
import { metaMask, safe, walletConnect } from '@wagmi/connectors'

const projectId = process.env.WALLETCONNECT_PROJECT_ID as string;

// we need to provide the three of the contract addresses for each network
export interface AddressConfig {
  [chainId: string]: {
    oftToken: string,
    pToken: string,
    redeem: string,
  }
};

// export the list of contracts for each network
export const contractAddressForChain: AddressConfig = {
  [mainnet.id]: {
    oftToken: '0x111',
    pToken: '0x111',
    redeem: '0x111',
  },
  [bsc.id]: {
    oftToken: '0x222',
    pToken: '0x222',
    redeem: '0x222',
  },
  [telosTestnet.id]: {
    oftToken: '0x9db0209270947a780bfd825f805a5b6a30ef3f42',
    pToken: '0x8289489afb035c4abd5a01ca9e6272480eeeea55',
    redeem: '0x53046dba0825e84c0c0eeff90737f8b66441d7ca',
  },
};


// Icon URI for each connector
export const logoURLforConnector: { [conntector: string]: string } = {
  'injected': 'image/web3js.jpg',
  'metamask': 'image/svg_metaMask_lcon_color.svg',
  'safe': 'image/safepal-logo.png',
  'walletconnect': 'image/WalletConnect-icon.svg',
}

export default createConfig({
  chains: [mainnet, bsc, telosTestnet],
  connectors: [
    metaMask(),
    safe(),
    walletConnect({projectId}),
    injected()
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [telosTestnet.id]: http(),
  },
})
