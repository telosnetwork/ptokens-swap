<script setup lang="ts">
import {computed} from "vue";
import ConnectWallet from "components/ConnectWallet.vue";
import { useAccount, useDisconnect, useSwitchChain } from '@wagmi/vue';
import RedeemTlos from "components/RedeemTlos.vue";
import { chainConfigurations, type ChainMetadata } from 'src/config'

const { address, isConnected, chain } = useAccount()
const { disconnect } = useDisconnect()
const { switchChain } = useSwitchChain()

const connected = computed(() => isConnected.value && !!address.value)

const prettyAddress = computed(() => {
    if (!address.value) return '';
    return `${address.value.slice(0, 3)}...${address.value.slice(-3)}`;
})

const currentChainDisplay = computed(() => {
    if (!chain.value) return null;
    const chainData = supportedChains.find(c => c.id === chain.value?.id);
    return chainData || null;
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
    if (domain.endsWith('/')) {
        domain = domain.slice(0, -1);
    }
    return domain;
})

const supportedChains: ChainMetadata[] = Object.values(chainConfigurations)

const handleChainSwitch = (chainId: number) => {
    try {
        const chainConfig = chainConfigurations[chainId]
        if (!chainConfig) {
            console.error('Chain configuration not found for chainId:', chainId)
            return
        }

        if (chainConfig.customRpcUrl) {
            switchChain({
                chainId,
                addEthereumChainParameter: {
                    chainName: chainConfig.name,
                    rpcUrls: [chainConfig.customRpcUrl],
                    nativeCurrency: chainConfig.nativeCurrency,
                    blockExplorerUrls: [chainConfig.blockExplorerUrl]
                }
            })
        } else {
            switchChain({ chainId  })
        }
    } catch (error) {
        console.error('Failed to switch chain:', error)
    }
}
</script>

<template>
  <div>
    <q-header class="c-main-header" elevated>
      <header class="c-main-header-container">
          <div class="c-main-header__left">
              <img
                  src="/branding/telos.png"
                  alt="Telos Circle Logo"
                  class="c-main-header__logo"
              >
              Telos
          </div>
          <div v-if="connected" class="c-main-header__right">
              <q-select
                  v-if="chain && currentChainDisplay"
                  :model-value="currentChainDisplay"
                  :options="supportedChains"
                  option-value="id"
                  option-label="name"
                  @update:model-value="(val) => handleChainSwitch(val.id)"
                  dense
                  outlined
                  class="c-main-header__chain-select"
              >
                  <template v-slot:prepend>
                      <img
                          :src="currentChainDisplay.logo"
                          alt="Chain Logo"
                          class="c-main-header__chain-logo"
                      >
                  </template>
                  <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                          <q-item-section avatar>
                              <img :src="scope.opt.logo" class="c-main-header__chain-option-logo" />
                          </q-item-section>
                          <q-item-section>
                              <q-item-label>{{ scope.opt.name }}</q-item-label>
                          </q-item-section>
                      </q-item>
                  </template>
              </q-select>
              <div class="c-main-header__wallet">
                  <a
                      class="c-main-header__wallet-address"
                      :href="`${blockExplorer}/address/${address}`"
                      target="_blank"
                  >
                      {{ prettyAddress }}
                  </a>
                  <q-btn
                      @click="disconnect()"
                      color="negative"
                      icon="logout"
                      flat
                      dense
                      size="sm"
                  >
                      <q-tooltip>Disconnect</q-tooltip>
                  </q-btn>
              </div>
          </div>
      </header>
    </q-header>
    <q-page class="c-main-page row items-center justify-evenly">
    <div class="c-main-page__background-container">
        <div class="c-main-page__background-top">
            <div class="c-main-page__background-circle c-main-page__background-circle--1"></div>
            <div class="c-main-page__background-circle c-main-page__background-circle--2"></div>
        </div>
        <div class="c-main-page__background-bottom">
            <div class="c-main-page__background-subtitle">
            </div>
        </div>
    </div>
    <redeem-tlos v-if="connected"/>
    <connect-wallet v-else/>
    </q-page>
  </div>
</template>

<style lang="scss">

.c-main-header {
    background-color: white;
    color: var(--text-color);
    padding: 10px 20px;
    font-size: 24px;
    &-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    &__left {
        display: flex;
        align-items: center;
    }
    &__right {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    &__logo {
        width: 38px;
        height: 38px;
        margin-right: 10px;
    }
    &__chain-select {
        min-width: 180px;
    }
    &__chain-logo {
        width: 24px;
        height: 24px;
    }
    &__chain-option-logo {
        width: 32px;
        height: 32px;
    }
    &__wallet {
        display: flex;
        align-items: center;
        gap: 10px;
        &-address {
            color: var(--q-primary);
            text-decoration: none;
            font-size: 16px;
            font-weight: 500;
            &:hover {
                text-decoration: underline;
            }
        }
    }

    @media (max-width: 724px) {
        padding: 10px;
        font-size: 19px;
        &__right {
            gap: 10px;
        }
        &__chain-select {
            min-width: 140px;
        }
        &__wallet-address {
            font-size: 14px;
        }
    }
}

.c-main-page {


    &__background-container {
        position: absolute;
        z-index: -1;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-color: rgba(var(--q-primary), 0.04);

        body.body--dark & {
            background-color: rgb(28, 28, 28);
            opacity: 1;
        }
    }

    &__background-title {
        font-size: 36px;
        // font shadow
        text-shadow: 0 0 10px rgba(220, 220, 220, 0.5);
        color: white;
        padding: 30px;
    }

    &__background-subtitle {
        font-size: 24px;
        font-weight: 500;
        color: var(--text-color);
        text-align: center;
    }

    &__background-top {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    &__background-top,
    &__background-bottom {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-position: center center;
        background-size: 100% auto;
        background-repeat: no-repeat;
    }

    &__background-top {
        top: 0;
        height: 320px;
        overflow: hidden;
        background-image:
        radial-gradient(circle at 0% 170%, var(--q-secondary), transparent 45%),
            radial-gradient(circle at 100% 130%, var(--q-secondary), transparent 30%),
            radial-gradient(circle at 100% 0%, var(--q-primary), transparent 30%),
            radial-gradient(circle at 50% 20%, var(--q-accent), transparent 70%);

        @media screen and (min-width: $breakpoint-sm-min) {
            background-image:
            radial-gradient(circle at 0% 170%, var(--q-secondary), transparent 45%),
            radial-gradient(circle at 100% 130%, var(--q-secondary), transparent 30%),
            radial-gradient(circle at 100% 0%, var(--q-primary), transparent 30%),
            radial-gradient(circle at 50% 20%, var(--q-accent), transparent 70%)
        }

        @media screen and (min-width: $breakpoint-md-min) {
            height: 400px;

            background-image:
            radial-gradient(circle at 0% 170%, var(--q-secondary), transparent 45%),
            radial-gradient(circle at 100% 130%, var(--q-secondary), transparent 30%),
            radial-gradient(circle at 100% 0%, var(--q-primary), transparent 30%),
            radial-gradient(circle at 50% 20%, var(--q-accent), transparent 70%)
        }

        @media screen and (min-width: $breakpoint-lg-min) {
            background-image:
                radial-gradient(circle at 0% 170%, var(--q-secondary), transparent 40%),
                radial-gradient(circle at 100% 140%, var(--q-secondary), transparent 20%),
                radial-gradient(circle at 100% 0%, var(--q-primary), transparent 20%),
                radial-gradient(circle at 50% 20%, var(--q-accent), transparent 90%)
        }
    }

    &__background-bottom {
        font-size: 24px;
        padding: 30px;
        text-align: center;

        top: 30%;
        height: 70%;

        background-image:
            radial-gradient(circle at 112% 75%, var(--q-accent), transparent 20%),
                radial-gradient(circle at 98% 100%, var(--q-primary), transparent 20%);

        @media screen and (min-width: $breakpoint-lg-min) {
            background-image:
                radial-gradient(circle at 112% 75%, var(--q-accent), transparent 20%),
                radial-gradient(circle at 98% 100%, var(--q-primary), transparent 20%);
        }
    }

    &__background-circle {
        position: absolute;
        content: "";
        border-radius: 100%;
        border: 32px solid var(--faint-circle-color);

        &--1 {
            top: -12vh;
            right: -16vh;
            width: 45vh;
            height: 45vh;
        }

        &--2 {
            display: none;

            @media screen and (min-width: $breakpoint-md-min) {
                display: block;
                top: -50%;
                right: 0;
                left: 0;
                width: 45vh;
                height: 45vh;
                margin: 0 auto;
            }
        }
    }

    &__page-container {
        $stacked-header-height: calc(var(--top-bar-height) + var(--bottom-bar-height));

        margin: $stacked-header-height 12px 0;

        &--home {
            margin-top: var(--bottom-bar-height);

            @media screen and (min-width: $breakpoint-md-min) {
                margin-top: $stacked-header-height;
            }
        }
    }

}


</style>