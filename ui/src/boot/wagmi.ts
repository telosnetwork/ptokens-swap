import { defineBoot } from '#q-app/wrappers'
import { WagmiPlugin } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query';
import config from '../config';

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(({ app }) => {
  app.use(WagmiPlugin, { config });
  app.use(VueQueryPlugin, {});
})


