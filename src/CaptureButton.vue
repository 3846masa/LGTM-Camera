<style lang="postcss">
</style>

<template lang="pug">
svg(
  viewBox="0 0 100 100", style="transform: rotate(-90deg);",
  @touchstart.prevent="emit('start')", @touchend.prevent="emit('stop')",
)
  circle.captureButton__bg(
    cx="50", cy="50", :r="radius",
    fill="white", stroke="#BDBDBD", :stroke-width="strokeWidth",
  )
  circle.captureButton__limit(
    cx="50", cy="50", :r="radius",
    fill="none", stroke="#616161", :stroke-width="strokeWidth",
    :stroke-dasharray="(10 / 12) * circumference", stroke-dashoffset="0",
  )
  circle.captureButton__loop(
    cx="50", cy="50", :r="radius",
    fill="none", stroke="#FFC107", :stroke-width="strokeWidth",
    :stroke-dasharray="getDashArray(0)", :stroke-dashoffset="getDashOffset(0)",
  )
  circle.captureButton__4sec(
    cx="50", cy="50", :r="radius",
    fill="none", stroke="#4CAF50", :stroke-width="strokeWidth",
    :stroke-dasharray="getDashArray(0.5)", :stroke-dashoffset="getDashOffset(0.5)",
  )
  circle.captureButton__10sec(
    cx="50", cy="50", :r="radius",
    fill="none", stroke="#00BCD4", :stroke-width="strokeWidth",
    :stroke-dasharray="getDashArray(4)", :stroke-dashoffset="getDashOffset(4)",
  )
  circle.captureButton__button(
    cx="50", cy="50", :r="radius * 0.75",
    fill="none", stroke="black", stroke-width="1",
  )
</template>

<script>
export default {
  data: () => ({
    strokeWidth: 10,
  }),
  props: [
    'time',
  ],
  computed: {
    radius() {
      return 50 - (this.strokeWidth / 2);
    },
    circumference() {
      return this.radius * 2 * Math.PI;
    },
  },
  mounted() {},
  methods: {
    getDashArray(sec) {
      const len = ((this.time - sec) / 12) * this.circumference;
      return `${Math.max(len, 0)} 1000`;
    },
    getDashOffset(sec) {
      const len = (sec / 12) * this.circumference;
      return -1 * len;
    },
    emit(evName) {
      this.$emit(evName);
    },
  },
  components: {},
};
</script>
