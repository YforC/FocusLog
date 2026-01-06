<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">FocusLog</div>
    </header>
    <main class="app-main">
      <slot />
    </main>
    <nav class="CornerNav" :class="{ 'CornerNav--open': navOpen }">
      <button
        class="CornerNav__Toggle"
        type="button"
        :aria-expanded="navOpen"
        aria-label="菜单"
        @click="toggleNav"
      >
        <span class="CornerNav__Icon" aria-hidden="true">&#9776;</span>
      </button>
      <div class="CornerNav__Links">
        <RouterLink class="CornerNav__Link" to="/">今日</RouterLink>
        <RouterLink class="CornerNav__Link" to="/planning">周期规划</RouterLink>
        <RouterLink class="CornerNav__Link" to="/summary">学习汇总</RouterLink>
        <RouterLink class="CornerNav__Link" to="/plans">计划管理</RouterLink>
        <RouterLink class="CornerNav__Link" to="/settings">外观设置</RouterLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSettings } from '../services/settings'
import { applyAppearance, extractAppearanceSettings } from '../utils/appearance'

const navOpen = ref(false)

const toggleNav = () => {
  navOpen.value = !navOpen.value
}

const loadAppearance = async () => {
  try {
    const settings = await getSettings()
    applyAppearance(extractAppearanceSettings(settings))
  } catch {
    // Ignore settings load failures for appearance.
  }
}

onMounted(() => {
  loadAppearance()
})
</script>
