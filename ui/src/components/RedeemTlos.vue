<template>
  <q-card class="c-redeem-tlos">
    <div class="c-redeem-tlos__container">

      <!-- Wallet Info -->
      <div v-if="connected" class="c-redeem-tlos__wallet-info">
          <h1 class="c-redeem-tlos__title" >{{ chainName }}</h1>
          <div class="c-redeem-tlos__"> Connected as: {{ address }} </div>
          <div class="c-redeem-tlos__">Your pTokens TLOS Balance: {{ pTokenBalance }} TLOS</div>
          <div class="c-redeem-tlos__">Your OFT TLOS Balance: {{ oftTokenBalance }} TLOS</div>
          <q-btn class="c-redeem-tlos__disconnect-btn" @click="disconnect()" label="Disconnect" color="negative" icon="logout" />
      </div>
      <hd />

      <h1 v-if="situation === 'success'" class="c-redeem-tlos__title" >Migration successful! </h1>
      <h1 v-if="situation === 'failed'" class="c-redeem-tlos__title" >Migration failed for unknown reason </h1>
      <h1 v-if="situation === 'updated'" class="c-redeem-tlos__title" >You have no pTokens TLOS to redeem </h1>

      <div
        v-if="situation ==='low'"
      >
        <h1 class="c-redeem-tlos__title"> Please note: The contract is temporarily low on OFT TLOS to perform such a migration, the amount you can migrate is limited to what the contract currently has.  More will be added soon.</h1>
        <div>Your pToken balance:  {{ pTokenBalance }} TLOS</div>
        <div>Contract OFT balance: {{ maximumRedeemable }} TLOS</div>
      </div>


      <!-- Network Check -->
      <div v-if="situation === 'unsupported'" class="c-redeem-tlos__unsupported">
        <q-banner class="c-redeem-tlos__unsupported-banner" color="negative" inline-actions>
          <div>Please switch to Ethereum or BSC chain.</div>
        </q-banner>
      </div>

      <!-- Normal situation -->
      <div v-if="situation === 'normal' || situation === 'low'" class="c-redeem-tlos__balance-swap">
        <div class="c-redeem-tlos__title" > You can redeem {{ maximumRedeemable }} pTLOS for OFT TLOS </div>
        <q-btn
          class="c-redeem-tlos__swap-btn"
          :disable="pTokenBalance === '0.0' || swapping"
          @click="swapTokens"
          label="Redeem now"
          color="secondary"
          icon="swap_horiz"
        />
        <q-spinner v-if="swapping" class="c-redeem-tlos__swap-spinner" />
        <hr  class="c-redeem-tlos__separator"/>
        <div>
          <b>Redeem Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${redeemAddress}?tab=contract`"
            target="_blank"
          >{{ redeemAddress }}</a><br>
          <b>OFT TLOS Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${oftTokenAddress}?tab=contract`"
            target="_blank"
          >{{ oftTokenAddress }}</a><br>
          <b>pTLOS Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${pTokenAddress}?tab=contract`"
            target="_blank"
          >{{ pTokenAddress }}</a><br>
        </div>
      </div>

      <!-- Success situation -->
      <div v-if="situation === 'success'" class="c-redeem-tlos__balance-swap">
        <div v-if="swapHash">
          <hr  class="c-redeem-tlos__separator"/>
          <div class="c-redeem-tlos__">Approval hash: <a class="c-redeem-tlos__hash"
              :href="`${blockExplorer}tx/${approvalHash}`"
              target="_blank"
            >{{ approvalHash }}</a></div>
          <div class="c-redeem-tlos__">Swap hash: <a class="c-redeem-tlos__hash"
              :href="`${blockExplorer}tx/${swapHash}`"
              target="_blank"
            >{{ swapHash }}</a></div>
        </div>
      </div>

      <div v-if="situation === 'success' || situation === 'updated'" class="c-redeem-tlos__balance-swap">
        <hr  class="c-redeem-tlos__separator"/>
        <div>
          <b>OFT TLOS Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${oftTokenAddress}?tab=contract`"
            target="_blank"
          >{{ oftTokenAddress }}</a><br>
          <b>pTLOS Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${pTokenAddress}?tab=contract`"
            target="_blank"
          >{{ pTokenAddress }}</a><br>
          <b>Redeem Contract: </b><a class="c-redeem-tlos__contract"
            :href="`${blockExplorer}address/${redeemAddress}?tab=contract`"
            target="_blank"
          >{{ redeemAddress }}</a><br>
          <div class="c-redeem-tlos__">Redeemable OFT TLOS: {{ redeemableOftBalance }} TLOS</div>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { type Address, formatUnits, parseEther } from 'viem'
import { ref, computed, watch } from 'vue'
import { useConfig, useReadContract, useDisconnect, useAccount, useWriteContract, type UseReadContractReturnType } from '@wagmi/vue'
import { waitForTransactionReceipt } from '@wagmi/core'

import RedeemABI from 'src/contracts/RedeemPTokenTLOS.json'
import ERC20ABI from 'src/contracts/MockERC20.json'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const { disconnect } = useDisconnect()
const { chain, address, isConnected } = useAccount()
const { writeContractAsync } = useWriteContract()
import { contractAddressForChain } from 'src/config'
const config = useConfig()
const error = ref('')

const connected = computed(() => isConnected.value && !!address.value)
const chainUnsupported = ref(false);
const chainName = computed(() => {
  if (chain.value) {
    return chain.value.name + (chain.value.testnet ? ' Testnet' : '')
  }
  return ''
})

const blockExplorer = computed(() => {
  console.log('chain.value.blockExplorers: ', chain.value?.name, chain.value?.blockExplorers);
  if (chain.value && chain.value.blockExplorers && chain.value.blockExplorers.default && chain.value.blockExplorers.default.url ) {
    if (typeof chain.value.blockExplorers.default.url === 'string') {
      return chain.value.blockExplorers.default.url as string;
    } else {
      return '';
    }
  }
  return '';
})

// Getting Contract Address dynamically
const addresses = computed(() => contractAddressForChain[chain.value?.id || 0])
const oftTokenAddress = computed(() => (!chainUnsupported.value ? addresses.value?.oftToken : '') as Address)
const pTokenAddress = computed(() => (!chainUnsupported.value ? addresses.value?.pToken : '') as Address)
const redeemAddress = computed(() => (!chainUnsupported.value ? addresses.value?.redeem : '') as Address)

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

// maximum amount that can be redeemed
const maximumRedeemable = computed(() => {
  let result = '0.0';
  if (pTokenBalance.value === '0.0') return result
  if (+pTokenBalance.value > +redeemableOftBalance.value) {
    result = redeemableOftBalance.value;
  } else {
    result = pTokenBalance.value;
  }
  return result
})

let timer = setTimeout(() => {}, 0)
const handleOnChainChanged = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    chainUnsupported.value = connected.value && (!chain.value || ![1,56, 41].includes(chain.value?.id || 0));
  }, 100);
}

watch(chain, handleOnChainChanged, { immediate: true })


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
  error.value = ''
  if (!connected.value || chainUnsupported.value) {
    $q.notify({ type: 'negative', message: 'Please connect wallet on Ethereum or BSC.' })
    return
  }
  if (pTokenBalance.value === '0.0') return

  try {
    swapping.value = true
    // TODO: Calculate based on available OFT balance of redeem contract
    const amountToSwap = parseEther(maximumRedeemable.value);
    const approveResult = await writeContractAsync({
      abi: ERC20ABI.abi,
      address: pTokenAddress.value,
      functionName: 'approve',
      args: [redeemAddress.value, amountToSwap]
    })
    approvalHash.value = approveResult

    await waitForTransactionReceipt(config, {
      hash: approveResult,
      confirmations: 1,
      pollingInterval: 1000
    });


    // TODO: Check for confimrations/receipt before doing swap
    const sendResult = await writeContractAsync({
      abi: RedeemABI.abi,
      address: redeemAddress.value,
      functionName: 'redeem',
      args: [amountToSwap]
    })
    swapHash.value = sendResult

    await waitForTransactionReceipt(config, {
      hash: sendResult,
      confirmations: 1,
      pollingInterval: 1000
    })

    pTokenBalanceCall.refetch()
    oftTokenBalanceCall.refetch()
    redeemableOftBalanceCall.refetch()
    $q.notify({ type: 'positive', message: 'Swap successful!' })
    error.value = 'success';
  } catch (err) {
    error.value = 'failed';
    console.error(err)
    $q.notify({ type: 'negative', message: `Swap failed for unknown reason` })
  } finally {
    swapping.value = false
  }
}


// State
// normal: enough OFT on the redeem contract to pay the user
// low: not enough OFT on the redeem contract to pay the user (user's balance is higher than redeem contract's balance)
// unsupported: chain is not supported
const situation = computed(() => {
  if (error.value === 'success') {
    return 'success'
  } else if (error.value === 'failed') {
    return 'failed'
  }
  if (chainUnsupported.value) {
    return 'unsupported'
  }
  if (connected.value && +pTokenBalance.value === 0) {
    return 'updated'
  }
  if (connected.value && +pTokenBalance.value > +redeemableOftBalance.value) {
    return 'low'
  }
  if (connected.value && +pTokenBalance.value <= +redeemableOftBalance.value) {
    return 'normal'
  }
  return 'unsupported'
})


</script>

<style lang="scss">
.c-redeem-tlos {
  padding: 20px 25px;
  max-width: 800px;
  margin: 20px;
  &__title {
    font-size: 24px;
    margin-bottom: 20px;
    line-height: 36px;
  }
  &__separator {
    margin: 20px 0;
    height: 1px;
  }
  &__contract {
    // margin-bottom: 10px;
    font-size: 14px;
  }
  &__wallet-info {
    margin-bottom: 20px;
  }
  &__unsupported {
    margin-bottom: 20px;
  }
  &__unsupported-banner {
    padding: 10px;
  }
  &__balance-swap {
    margin-bottom: 20px;
  }
  &__disconnect-btn {
    margin-top: 10px;
  }
  &__swap-btn {
    margin-top: 20px;
  }
  &__swap-spinner {
    margin: 20px 0px 0px 15px;
    font-size: x-large;
  }

}
</style>
