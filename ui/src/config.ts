import { createConfig, fallback, http, injected, unstable_connector } from '@wagmi/vue'
import { mainnet, bsc } from '@wagmi/vue/chains'
import { metaMask, safe, walletConnect } from '@wagmi/connectors'

const projectId = process.env.WALLETCONNECT_PROJECT_ID as string;

// we need to provide the three of the contract addresses for each network
export interface AddressConfig {
  [chainId: string]: {
    oftToken: string,
    pToken: string,
    redeem: string,
  }
}

// export the list of contracts for each network
export const contractAddressForChain: AddressConfig = {
  [mainnet.id]: {
    oftToken: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',
    pToken: '0x7825e833d495f3d1c28872415a4aee339d26ac88',
    redeem: '0x69e42a6b62f40b77975fe38ba9712f75c7c75673',
  },
  [bsc.id]: {
    oftToken: '0x193f4A4a6ea24102F49b931DEeeb931f6E32405d',
    pToken: '0xb6c53431608e626ac81a9776ac3e999c5556717c',
    redeem: '0x4B67D9321CCD4E28D7Ce9ED8654e6bfFb02Ed1b3',
  },
  // [telosTestnet.id]: {
  //   oftToken: '0x9db0209270947a780bfd825f805a5b6a30ef3f42',
  //   pToken: '0x8289489afb035c4abd5a01ca9e6272480eeeea55',
  //   redeem: '0x53046dba0825e84c0c0eeff90737f8b66441d7ca',
  // },
};

// icon URI for each chain
export const logoURLforChain: { [chain: string]: string } = {
  '1': 'branding/eth.png',
  '56': 'branding/bnb.png',
  '41': 'branding/Telos-Icon.svg',
};

// Icon URI for each connector
export const logoURLforConnector: { [conntector: string]: string } = {
  'injected': 'image/web3js.jpg',
  'metamask': 'image/svg_metaMask_lcon_color.svg',
  'safe': 'image/safepal-logo.png',
  'walletconnect': 'image/WalletConnect-icon.svg',
}

export default createConfig({
  // chains: [mainnet, bsc, telosTestnet],
  chains: [mainnet, bsc],
  connectors: [
    metaMask(),
    safe(),
    walletConnect({projectId}),
    injected()
  ],
  transports: {
    [mainnet.id]: fallback([
      unstable_connector(injected),
      http()
    ]),
    [bsc.id]: http(),
    // [telosTestnet.id]: http(),
  },
})

/*
pTokens:

Ethereum: 0x7825e833d495f3d1c28872415a4aee339d26ac88
BSC: 0xb6c53431608e626ac81a9776ac3e999c5556717c


OFT:

Ethereum: 0x193f4A4a6ea24102F49b931DEeeb931f6E32405d
BSC: 0x193f4A4a6ea24102F49b931DEeeb931f6E32405d

Redeem:
Ethereum: 0x69e42a6b62f40b77975fe38ba9712f75c7c75673
BSC: 0x4B67D9321CCD4E28D7Ce9ED8654e6bfFb02Ed1b3

 */
