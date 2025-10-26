<script setup>
import { RouterView } from 'vue-router'
import { useTheme } from './composables/useTheme'

const { theme } = useTheme()
</script>

<template>
  <div class="min-h-screen" :data-theme="theme">
    <RouterView />
  </div>
</template>

