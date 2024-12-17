<template>
  <div class="q-pa-md">
    <h1>Swap pTLOS for OFT TLOS</h1>

    <!-- Wallet Info -->
    <div v-if="connected" class="q-mb-md">
        <div>
          Connected to: {{ address }}
        </div>
        <q-btn @click="disconnect()" label="Disconnect" color="negative" />
    </div>

    <!-- Network Check -->
    <div v-if="chainUnsupported">
      <q-banner class="q-mb-md" color="negative" inline-actions>
        <div>Please switch to Ethereum or BSC chain.</div>
      </q-banner>
    </div>

    <!-- Balance and Swap -->
    <div v-if="connected && !chainUnsupported">
      <div>Your pTokens TLOS Balance: {{ pTokenBalance }} TLOS</div>
      <div>Your OFT TLOS Balance: {{ oftTokenBalance }} TLOS</div>
      <q-btn
        class="q-mt-md"
        :disable="pTokenBalance === '0.0' || swapping"
        @click="swapTokens"
        label="Swap pTLOS for OFT TLOS"
        color="secondary"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDisconnect, useAccount } from '@wagmi/vue'
import { ethers } from 'ethers'
import RedeemABI from 'src/contracts/RedeemPTokenTLOS.json'
import ERC20ABI from 'src/contracts/MockERC20.json'
import { useQuasar } from 'quasar'

// Environment Variables
const oftTokenAddress = import.meta.env.VITE_OFTTELOS_CONTRACT
const pTokenAddress = import.meta.env.VITE_PTLOS_CONTRACT
const redeemAddress = import.meta.env.VITE_REDEEMER_CONTRACT

const $q = useQuasar()
const { disconnect } = useDisconnect()
const { chain, address, isConnected } = useAccount()

// State
const connected = computed(() => isConnected.value && !!address.value)
const chainUnsupported = computed(() => {
  // For simplicity, only allow Ethereum mainnet (chainId 1) or BSC (chainId 56)
  return connected.value && chain.value && ![1,56].includes(chain.value.id)
})

const pTokenBalance = ref('0.0')
const oftTokenBalance = ref('0.0')
const swapping = ref(false)

async function fetchBalance() {
  if (!connected.value || chainUnsupported.value) return
  const provider = new ethers.BrowserProvider(window.ethereum)
  debugger;
  const pTokenErc20 = new ethers.Contract(pTokenAddress, ERC20ABI.abi, provider)
  const oftTokenErc20 = new ethers.Contract(oftTokenAddress, ERC20ABI.abi, provider)
  const pTokenBal = await pTokenErc20.balanceOf(address.value)
  const oftTokenBal = await oftTokenErc20.balanceOf(address.value)
  pTokenBalance.value = ethers.formatUnits(pTokenBal, 18)
  oftTokenBal.value = ethers.formatUnits(oftTokenBal, 18)
}

async function swapTokens() {
  if (!connected.value || chainUnsupported.value) {
    $q.notify({ type: 'negative', message: 'Please connect wallet on Ethereum or BSC.' })
    return
  }
  if (pTokenBalance.value === '0.0') return

  try {
    swapping.value = true
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const erc20 = new ethers.Contract(pTokenAddress, ERC20ABI.abi, signer)
    const redeemContract = new ethers.Contract(redeemAddress, RedeemABI.abi, signer)

    // Decide how much to swap. For simplicity, swap half the balance
    const halfBal = ethers.parseUnits((Number(pTokenBalance.value) / 2).toString(), 18)

    // Approve Redeem contract to spend pTLOS
    let tx = await erc20.approve(redeemAddress, halfBal)
    await tx.wait()

    // Call redeem function
    tx = await redeemContract.redeem(halfBal)
    await tx.wait()

    $q.notify({ type: 'positive', message: 'Swap successful!' })
    await fetchBalance()
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Swap failed.' })
  } finally {
    swapping.value = false
  }
}

onMounted(() => {
  if (connected.value && !chainUnsupported.value) {
    fetchBalance()
  }
})

// Refetch balance when chain or address changes
watch([connected, chainUnsupported, address, () => chain.value?.id], () => {
  if (connected.value && !chainUnsupported.value) {
    fetchBalance()
  } else {
    balance.value = '0.0'
  }
})
</script>
