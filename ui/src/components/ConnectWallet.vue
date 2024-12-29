<script setup lang="ts">
import { useConnect, useChainId } from '@wagmi/vue';
import { logoURLforConnector } from 'src/config';

const chainId = useChainId();
const { connectors, connect } = useConnect();

</script>


<template>
    <div class="c-connect">
      <div class="c-connect--title">
        pToken TLOS to OFT TLOS migration
      </div>

      <q-card class="c-connect--card">
        <div class="c-connect--card__title">Connect your wallet</div>

        <div class="c-connect--card__buttons">
          <q-btn
          class="c-connect--card__button"
          v-for="connector in connectors"
          :key="connector.id"
          v-bind:chainId
          @click="connect({ connector, chainId })"
          >
          <div
              class="c-connect--card__button-inner"
            >
              <img
              class="c-connect--card__button-img"
              :class="['c-connect--card__button-img--' + connector.name.toLowerCase()]"
              :src="logoURLforConnector[connector.name.toLowerCase()] || '#'"
              />
              <span class="c-connect--card__button-txt">{{ connector.name }}</span>
            </div>
          </q-btn>
        </div>
      </q-card>
    </div>
</template>


<style lang="scss">
.c-connect {

  &--title {
    font-size: 37px;
    text-align: center;
    margin: 30px;
    margin-top: -200px;
  }

  &--card {
    padding: 25px;

    &__title {
        font-size: 24px;
        text-align: center;
        margin: 20px;
    }

    &__buttons {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        justify-content: center;
    }

    &__button {
        width: 100%;
        padding: 15px;
        margin: 0;

        &-inner {
            max-height: 150px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 7px;
        }

        &-img {
            height: 50px;
        }
    }
  }
}

</style>

