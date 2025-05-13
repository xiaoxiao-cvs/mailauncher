<template>
  <div class="instances-panel">
    <InstancesList />
  </div>
</template>

<script setup>
import InstancesList from './instances/InstancesList.vue';
</script>

<style scoped>
.instances-panel {
  height: 100%;
  overflow-y: auto;
}
</style>
