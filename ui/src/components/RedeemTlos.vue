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
      <div>Currently connected to: {{ chainName }}</div>
      <div>Your pTokens TLOS Balance: {{ pTokenBalance }} TLOS</div>
      <div>Your OFT TLOS Balance: {{ oftTokenBalance }} TLOS</div>
      <div>Redeemable OFT TLOS: {{ redeemableOftBalance }} TLOS</div>
      <div>Amount to swap (minus fees): {{ amountReceived }} TLOS</div>
      <div>Approval hash: {{ approvalHash }}</div>
      <div>Swap hash: {{ swapHash }}</div>
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
import { formatUnits, parseEther } from 'viem'
import { ref, computed } from 'vue'
import { useConfig, useReadContract, useDisconnect, useAccount, useWriteContract } from '@wagmi/vue'
import { waitForTransactionReceipt } from '@wagmi/core'

import RedeemABI from 'src/contracts/RedeemPTokenTLOS.json'
import ERC20ABI from 'src/contracts/MockERC20.json'
import { useQuasar } from 'quasar'

// Environment Variables
const oftTokenAddress = String(process.env.OFTTELOS_CONTRACT)
const pTokenAddress = String(process.env.PTLOS_CONTRACT)
const redeemAddress = String(process.env.REDEEMER_CONTRACT)

const $q = useQuasar()
const { disconnect } = useDisconnect()
const { chain, address, isConnected } = useAccount()
const { writeContractAsync } = useWriteContract()
const config = useConfig()

// State
const connected = computed(() => isConnected.value && !!address.value)
const chainUnsupported = computed(() => {
  // For simplicity, only allow Ethereum mainnet (chainId 1) or BSC (chainId 56)
  return connected.value && chain.value && ![1,56, 41].includes(chain.value.id)
})
const chainName = computed(() => {
  if (chain.value) {
    return chain.value.name + (chain.value.testnet ? ' Testnet' : '')
  }
  return ''
})

const pTokenBalanceCall = useReadContract({
  abi: ERC20ABI.abi,
  address: pTokenAddress,
  functionName: 'balanceOf',
  args: [address]
})

const oftTokenBalanceCall = useReadContract({
  abi: ERC20ABI.abi,
  address: oftTokenAddress,
  functionName: 'balanceOf',
  args: [address]
})

const redeemableOftBalanceCall = useReadContract({
  abi: ERC20ABI.abi,
  address: oftTokenAddress,
  functionName: 'balanceOf',
  args: [redeemAddress]
})

const pTokenBalance = computed(() => formatOrZero(pTokenBalanceCall))
const oftTokenBalance = computed(() => formatOrZero(oftTokenBalanceCall))
const redeemableOftBalance = computed(() => formatOrZero(redeemableOftBalanceCall))
const amountReceived = computed(() => {
  if (pTokenBalanceCall?.data?.value && oftTokenBalanceCall?.data?.value) {
    const amountLessFee = Math.min(pTokenBalanceCall.value, oftTokenBalanceCall.value) * 0.9975
    return formatUnits(amountLessFee, 18)
  }

  return '0.0'
})

const formatOrZero = (value: UseReadContractReturnType) => {
  if (!value || !value.isFetched || !value.data || !value.data.value) {
    return '0.0'
  }

  return formatUnits(value.data.value as bigint, 18)
}

const swapping = ref(false)
const approvalHash = ref('')
const swapHash = ref('')

const swapTokens = async () => {
  if (!connected.value || chainUnsupported.value) {
    $q.notify({ type: 'negative', message: 'Please connect wallet on Ethereum or BSC.' })
    return
  }
  if (pTokenBalance.value === '0.0') return

  try {
    swapping.value = true
    // TODO: Calculate based on available OFT balance of redeem contract
    let amountToSwap = parseEther('1')
    let approveResult = await writeContractAsync({
      abi: ERC20ABI.abi,
      address: pTokenAddress,
      functionName: 'approve',
      args: [redeemAddress, amountToSwap]
    })
    approvalHash.value = approveResult

    await waitForTransactionReceipt(config, {
      hash: approveResult,
      confirmations: 1,
      pollInterval: 1000
    })

    // TODO: Check for confimrations/receipt before doing swap
    let sendResult = await writeContractAsync({
      abi: RedeemABI.abi,
      address: redeemAddress,
      functionName: 'redeem',
      args: [amountToSwap]
    })
    swapHash.value = sendResult

    await waitForTransactionReceipt(config, {
      hash: sendResult,
      confirmations: 1,
      pollInterval: 1000
    })

    pTokenBalanceCall.refetch()
    oftTokenBalanceCall.refetch()
    redeemableOftBalanceCall.refetch()
    $q.notify({ type: 'positive', message: 'Swap successful!' })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: `Swap failed for unknown reason` })
  } finally {
    swapping.value = false
  }
}

// onMounted(() => {
//   if (connected.value && !chainUnsupported.value) {
//     fetchBalance()
//   }
// })
//
// Refetch balance when chain or address changes
// watch([connected, chainUnsupported, address, () => chain.value?.id], () => {
//   if (connected.value && !chainUnsupported.value) {
//     fetchBalance()
//   } else {
//     pTokenBalance.value = '0.0'
//     oftTokenBalance.value = '0.0'
//   }
// })
</script>
