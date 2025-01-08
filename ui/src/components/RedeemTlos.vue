<script setup lang="ts">
import { type Address, formatUnits, parseEther } from 'viem'
import type { Ref } from 'vue';
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
import { contractAddressForChain, logoURLforChain } from 'src/config'
const config = useConfig()
const error = ref('')
const copiedAddress = ref('')
const loaded =  computed(() => {
    return (
        !pTokenBalanceCall.isLoading.value &&
        !pTokenBalanceCall.isFetching.value &&
        !pTokenBalanceCall.isPending.value &&
        !oftTokenBalanceCall.isLoading.value &&
        !oftTokenBalanceCall.isFetching.value &&
        !oftTokenBalanceCall.isPending.value &&
        !redeemableOftBalanceCall.isLoading.value &&
        !redeemableOftBalanceCall.isFetching.value &&
        !redeemableOftBalanceCall.isPending.value
    )
})

const connected = computed(() => isConnected.value && !!address.value)
const chainUnsupported = ref(false);
const chainName = computed(() => {
    if (chain.value) {
        return chain.value.name + (chain.value.testnet ? ' Testnet' : '')
    }
    return ''
})



const blockExplorer = computed(() => {
    let domain = '';
    if (chain.value && chain.value.blockExplorers && chain.value.blockExplorers.default && chain.value.blockExplorers.default.url ) {
        if (typeof chain.value.blockExplorers.default.url === 'string') {
            domain = chain.value.blockExplorers.default.url as string;
        } else {
            domain = '';
        }
    }
    // get rid of the last slash (if present)
    if (domain.endsWith('/')) {
        domain = domain.slice(0, -1);
    }
    return domain;
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

console.log(oftTokenBalance); // FIXME: remove this line

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
        if ( process.env.NODE_ENV === 'production' ) {
            // Only Ethereum and BSC are supported in production
            if (chain.value && ![1,56].includes(chain.value?.id || 0)) {
                chainUnsupported.value = true;
                return;
            }
        } else {
            chainUnsupported.value = connected.value && (!chain.value || ![1,56, 41].includes(chain.value?.id || 0));
        }
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

// approvalHash.value = '0x1a4b32f50644c33754e71df488eb44216b6b2a50f3158ebd8b7cc270a8d2a584';
// swapHash.value = '0x1a4b32f50644c33754e71df488eb44216b6b2a50f3158ebd8b7cc270a8d2a584';
// error.value = 'success'

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


// States
type Situation = 'redeem' | 'low' | 'unsupported' | 'empty' | 'success' | 'failed' | 'loading'
// redeem: enough OFT on the redeem contract to pay the user
// low: not enough OFT on the redeem contract to pay the user (user's balance is higher than redeem contract's balance)
// unsupported: chain is not supported
// empty: user has no pTokens to redeem
// success: migration successful
// failed: migration failed

const situation: Ref<Situation> = computed(() => {
    if (error.value === 'success') {
        return 'success'
    } else if (error.value === 'failed') {
        return 'failed'
    }
    if (chainUnsupported.value) {
        return 'unsupported'
    }
    if (!loaded.value) {
        return 'loading'
    }
    if (connected.value && +pTokenBalance.value === 0 && loaded.value) {
        return 'empty'
    }
    if (connected.value && +pTokenBalance.value > +redeemableOftBalance.value) {
        return 'low'
    }
    if (connected.value && +pTokenBalance.value <= +redeemableOftBalance.value) {
        return 'redeem'
    }
    return 'unsupported'
});

const prettyAddress = computed(() => {
    if (!address.value) return '';
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`;
})

const openContractInExplorer = (address: string) => {
    if (!blockExplorer.value) return;
    window.open(`${blockExplorer.value}/address/${address}?tab=contract`, '_blank')
}

const copyContractAddress = (address: string) => {
    copiedAddress.value = address;
    navigator.clipboard.writeText(address);
    setTimeout(() => {
        copiedAddress.value = '';
    }, 500);
}

</script>

<template>
    <q-card class="c-redeem-tlos">
        <div class="c-redeem-tlos__container">
            <!-- Header: network selected + user address + disconnect button -->
            <div
                v-if="connected"
                class="c-redeem-tlos__card-header"
            >
                <div
                    v-if="chainUnsupported"
                    class="c-redeem-tlos__network"
                >
                    <!-- info icone -->
                    <q-icon name="info" size="md" />
                    <span> Unsupported Network </span>
                </div>
                <div
                    v-else
                    class="c-redeem-tlos__network"
                >
                    <img
                        :src="`${logoURLforChain[chain?.id || 0]}`"
                        alt="Chain Logo"
                        class="c-redeem-tlos__network-logo"
                    >
                    <span class="c-redeem-tlos__network-name">
                        {{ chainName }}
                    </span>
                </div>
                <div class="c-redeem-tlos__wallet">
                    <div class="c-redeem-tlos__wallet-address">
                        <b>Connected as:</b>
                        <a class="c-redeem-tlos__link"
                            :href="`${blockExplorer}/address/${address}`"
                            target="_blank"
                        >{{ prettyAddress }}</a>

                        <q-tooltip>
                            <span class="c-redeem-tlos__wallet-tooltip-info">
                                <b>Explore:</b> {{ address }}
                            </span>
                        </q-tooltip>
                    </div>
                    <q-btn
                        @click="disconnect()"
                        color="negative"
                        icon="logout"
                        class="c-redeem-tlos__wallet-disconnect-btn"
                        size="sm"
                    />
                </div>
            </div>

            <div
                v-if="
                    situation === 'success' ||
                    situation === 'failed' ||
                    situation === 'empty' ||
                    situation === 'loading'
                "
                class="c-redeem-tlos__column-centered"
            >
                <div v-if="situation === 'success'" class="c-redeem-tlos__title" >Migration successful! </div>
                <div v-if="situation === 'failed'" class="c-redeem-tlos__title" >Migration failed for unknown reason </div>
                <div v-if="situation === 'empty'" class="c-redeem-tlos__title" >You have no pTokens TLOS to redeem </div>
                <q-spinner v-if="situation === 'loading'" class="c-redeem-tlos__swap-spinner" />
            </div>

            <q-card
                v-if="situation ==='low'"
                class="c-redeem-tlos__container c-redeem-tlos__container--warning"
            >
                <div class="c-redeem-tlos__title c-redeem-tlos__title--warning">
                    <!-- info sign -->
                    <q-icon name="info" size="sm" />
                    The migration contract is refilled periodically.
                    The amount you can redeem is limited by the amount that the contract currently has.
                    More will be added soon.
                </div>
                <div
                    class="c-redeem-tlos__contact-us-container"
                >
                    <q-btn
                        flat
                        color="primary"
                        href="https://t.me/HelloTelos"
                        target="_blank"
                        class="c-redeem-tlos__balance"
                    >
                        Contact us
                    </q-btn>
                </div>
            </q-card>


            <!-- Network Check -->
            <div v-if="situation === 'unsupported'" class="c-redeem-tlos__unsupported">
                <div
                    class="c-redeem-tlos__column-centered"
                >
                    <div
                        class="c-redeem-tlos__title"
                    >Please, switch to Ethereum or BSC chain.</div>
                </div>
            </div>

            <!-- redeem situation -->
            <div v-if="situation === 'redeem' || situation === 'low'" class="c-redeem-tlos__balance-swap">
                <div class="c-redeem-tlos__column-centered" >
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
                </div>
            </div>

            <!-- Success situation -->
            <div v-if="situation === 'success'" class="c-redeem-tlos__balance-swap">
                <div class="c-redeem-tlos__result" v-if="swapHash">
                    <hr class="c-redeem-tlos__separator"/>
                    <div class="c-redeem-tlos__result-part"><b>Approval: </b> <a
                            class="c-redeem-tlos__link"
                            :href="`${blockExplorer}/tx/${approvalHash}`"
                            target="_blank"
                        >{{ approvalHash }}</a></div>
                    <div class="c-redeem-tlos__result-part"><b>Swap: </b> <a
                            class="c-redeem-tlos__link"
                            :href="`${blockExplorer}/tx/${swapHash}`"
                            target="_blank"
                        >{{ swapHash }}</a></div>
                </div>
            </div>

            <!-- This block is shown only if situation is not 'unsupported' or 'failed' -->
            <div
            v-if="situation !== 'unsupported' && situation !== 'failed'"
            class="c-redeem-tlos__footer"
            >
                <hr class="c-redeem-tlos__separator" />
                <!-- pTLOS -->
                <div class="c-redeem-tlos__footer-row">
                    <div class="c-redeem-tlos__footer-cell">
                        <a
                            class="c-redeem-tlos__balance c-redeem-tlos__link"
                            :href="`${blockExplorer}/address/${address}?tab=tokens`"
                            target="_blank"
                        >
                            <b>Your balance:</b> {{ pTokenBalance }} pTLOS
                            <q-tooltip>
                                Click to explore your tokens balances
                            </q-tooltip>
                        </a>
                    </div>
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="openContractInExplorer(pTokenAddress)"
                            icon="description"
                        >
                            <q-tooltip>
                                Explore pTLOS Contract
                            </q-tooltip>
                        </q-btn>
                    </div>
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="copyContractAddress(pTokenAddress)"
                            :icon="copiedAddress !== pTokenAddress ? 'content_copy' : 'check'"
                        >
                            <q-tooltip>
                                Copy pTLOS Address
                            </q-tooltip>
                        </q-btn>
                    </div>
                </div>


                <!-- OFT TLOS -->
                <div class="c-redeem-tlos__footer-row">
                    <!-- Balance cell with tooltip -->
                    <div class="c-redeem-tlos__footer-cell">
                        <a
                            class="c-redeem-tlos__balance c-redeem-tlos__link"
                            :href="`${blockExplorer}/address/${address}?tab=tokens`"
                            target="_blank"
                        >
                            <b>Your balance:</b> {{ oftTokenBalance }} (OFT) TLOS
                            <q-tooltip>
                                Click to explore your tokens balances
                            </q-tooltip>
                        </a>
                    </div>
                    <!-- Explore contract cell -->
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="openContractInExplorer(oftTokenAddress)"
                            icon="description"
                        >
                            <q-tooltip>
                                Explore OFT TLOS Contract
                            </q-tooltip>
                        </q-btn>
                    </div>
                    <!-- Copy address cell -->
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="copyContractAddress(oftTokenAddress)"
                            :icon="copiedAddress !== oftTokenAddress ? 'content_copy' : 'check'"
                        >
                            <q-tooltip>
                                Copy OFT TLOS Address
                            </q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <!-- Redeem (contract's OFT balance) -->
                <div class="c-redeem-tlos__footer-row">
                    <div class="c-redeem-tlos__footer-cell">
                        <a
                            class="c-redeem-tlos__balance c-redeem-tlos__link"
                            :href="`${blockExplorer}/address/${redeemAddress}?tab=tokens`"
                            target="_blank"
                        >
                            <b>Redeem contract funds: </b>{{ redeemableOftBalance }} (OFT) TLOS
                            <q-tooltip>
                                Click to explore the redeem contract balances
                            </q-tooltip>
                        </a>
                    </div>
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="openContractInExplorer(redeemAddress)"
                            icon="description"
                        >
                            <q-tooltip>
                                Explore Redeem Contract
                            </q-tooltip>
                        </q-btn>
                    </div>
                    <div class="c-redeem-tlos__footer-cell">
                        <q-btn
                            flat
                            dense
                            @click="copyContractAddress(redeemAddress)"
                            :icon="copiedAddress !== redeemAddress ? 'content_copy' : 'check'"
                        >
                            <q-tooltip>
                                Copy Redeem Address
                            </q-tooltip>
                        </q-btn>
                    </div>
                </div>
            </div>




        </div>
    </q-card>
</template>

<style lang="scss">
.c-redeem-tlos {
    &__container {
        padding: 20px 25px;
        max-width: 800px;
        margin: 20px;
        &--warning {
            margin: 0 0 30px 0;
            padding: 12px;
        }
    }

    &__contact-us-container {
        display: flex;
        justify-content: center;
    }

    &__card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
    }

    &__wallet {
        padding-left: 50px;
    }
    &__network {
        padding-right: 50px;
    }
    &__column-centered {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__wallet,
    &__network {
        display: flex;
        gap: 15px;
        align-items: center;

        &-logo {
            width: 50px;
            height: 50px;
        }

        &-name {
            font-size: 24px;
        }

        &-address {
            font-size: 14px;
            display: flex;
            gap: 5px;
        }

        &-tooltip-info {
            font-size: 16px;
        }
    }
    &__title {
        font-size: 24px;
        line-height: 36px;

        &--warning {
            color: var(--q-warning);
        }
    }
    &__logo {
        width: 50px;
        height: 50px;
        margin-right: 10px;
    }
    &__separator {
        margin: 40px 0 20px 0;
        height: 1px;
        width: 100%;
    }

    &__footer {
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    &__footer-row {
        /* Each row in a single line with 3 cells */
        display: flex;
        justify-content: space-around;
        align-items: center;
    }

    &__footer-cell {
        /* Each cell takes the same horizontal space */
        flex: 1;
        text-align: center;
    }

    &__balance {
        font-size: 14px;
        white-space: nowrap;
        margin-right: 5px;
        cursor: pointer;
        text-decoration: none;
        color: var(--q-primary);
    }

    &__explore-button,
    &__copy-button {
        cursor: pointer;
        background-color: transparent;
        border: none;
        padding: 0;
        outline: none;
    }

    &__explore-button:hover,
    &__copy-button:hover {
        opacity: 0.7;
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

    &__link {
        color: var(--q-primary);
    }

    @media (max-width: 724px) {
        &__container {
            padding: 10px 12px;
            max-width: calc(100vw - 30px);
            margin: 10px;
            &--warning {
                margin: 0 0 15px 0;
                padding: 6px;
            }
        }
        &__card-header {
            margin-bottom: 10px;
            // flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
        }
        &__wallet,
        &__network {
            display: flex;
            gap: 5px;
            align-items: center;

            &-logo {
                width: 32px;
                height: 32px;
            }

            &-name {
                font-size: 19px;
            }

            &-address {
                font-size: 12px;
                gap: 5px;
            }

            &-tooltip-info {
                font-size: 12px;
            }
        }
        &__wallet {
            padding-left: 0px;
            align-items: flex-start;
            flex-direction: column;
            &-address {
                font-size: 12px;
                gap: 5px;
                align-items: flex-start;
                flex-direction: column;
            }
        }
        &__network {
            padding-right: 0px;
        }
        &__footer {
            margin: 10px 0;
            display: flex;
            flex-direction: column;
            align-items: normal;
        }
        &__footer-row {
            justify-content: flex-start;
            flex-wrap: wrap;
            padding-top: 10px;
            flex-grow: 1;
        }
        &__footer-cell {
            // Each cell takes the same horizontal space
            flex: 0;
            text-align: left;
            flex-grow: 1;
            & + & {
                flex-grow: 0;
            }
        }
        &__title {
            font-size: 19px;
            line-height: 22px;
            padding: 5px;
        }
        &__balance {
            font-size: 13px;
            white-space: wrap;
            margin-right: 5px;
        }

        &__result {
            display: block;
            width: 100%;
            &-part {
                font-size: 13px;
                margin-right: 5px;
                display: block;
                width: 100%;
                overflow: hidden;
            }
        }

        &__link {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }
    }
}
</style>

