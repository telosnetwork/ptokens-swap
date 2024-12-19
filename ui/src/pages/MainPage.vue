<template>
  <q-page class="row items-center justify-evenly">
    <redeem-tlos v-if="connected"/>
    <connect-wallet v-else/>

  </q-page>
</template>

<script setup lang="ts">
import {computed} from "vue";
import ConnectWallet from "components/ConnectWallet.vue";
import { useAccount } from '@wagmi/vue';
import RedeemTlos from "components/RedeemTlos.vue";
const { address, isConnected } = useAccount()

const connected = computed(() => isConnected.value && !!address.value)
// const chainUnsupported = computed(() => {
//   // For simplicity, only allow Ethereum mainnet (chainId 1) or BSC (chainId 56)
//   return connected.value && ![1,56].includes(chain.value)
// })
</script>
