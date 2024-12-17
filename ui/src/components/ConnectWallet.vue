<template>
  <q-btn
    v-for="connector in connectors"
    :key="connector.id"
    v-bind:chainId
    @click="connect({ connector, chainId })"
  >
    {{ connector.name }}
  </q-btn>
</template>

<script setup lang="ts">
import { useConnect, useChainId } from '@wagmi/vue';

const chainId = useChainId();
const { connectors, connect } = useConnect();
</script>

<style scoped>

</style>

