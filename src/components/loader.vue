<template>
  <div class="centered">
    <!-- <fa class="spinner" icon="spinner" size="5x" spin /> -->
    <i class="spinner fas fa-spinner fa-5x fa-spin" />
    &nbsp;
  </div>
</template>

<script setup>
// import { computed } from 'vue';

// // eslint-disable-next-line no-undef
// const props = defineProps({
//   pageLoader: {
//     type: Boolean,
//     required: false,
//     default: () => false
//   }
// });

</script>

<style lang="scss" scoped>
  .centered {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
    z-index: 9999;
  }
  .spinner {
    color: #337ab7;
  }
</style>
