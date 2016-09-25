// Polyfill
// import 'webrtc-adapter';

import Vue from 'vue';
import App from './App.vue';

if (
  process.env.NODE_ENV !== 'production' &&
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__
) {
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue = Vue;
  Vue.config.devtools = true;
}

new Vue(App).$mount('App');
