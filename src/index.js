// Polyfill
// import 'webrtc-adapter';

import Vue from 'vue';
import App from './App.vue';

Vue.config.devtools = true;
new Vue(App).$mount('App');
