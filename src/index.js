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

navigator.serviceWorker.register('/serviceworker.js')
  .then((registration) => {
    console.log(registration);
  })
  .catch((error) => {
    console.error(error);
  });

new Vue(App).$mount('App');
