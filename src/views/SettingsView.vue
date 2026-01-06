<template>
  <section class="page SettingsPage">
    <div class="SettingsHeader">
      <h1>外观设置</h1>
      <p>自定义背景图与字体大小。</p>
    </div>

    <div v-if="loading" class="Empty">加载中...</div>
    <div v-else-if="error" class="Empty">{{ error }}</div>
    <div v-else class="SettingsContent">
      <div class="AppearancePanel">
        <h3>外观设置</h3>
        <div class="AppearancePanel__Row">
          <label>背景图 URL</label>
          <input
            v-model="appearanceForm.backgroundUrl"
            type="url"
            class="TextBox"
            placeholder="https://example.com/background.jpg"
          />
        </div>
        <div class="AppearancePanel__Row">
          <label>字体大小</label>
          <div class="AppearancePanel__Controls">
            <input
              v-model.number="appearanceForm.fontSize"
              type="number"
              min="12"
              max="20"
              class="SelectBox"
            />
            <span class="AppearancePanel__Hint">12-20px</span>
          </div>
        </div>
        <div class="AppearancePanel__Row">
          <label>背景模糊度</label>
          <div class="AppearancePanel__Controls">
            <input
              v-model.number="appearanceForm.blur"
              type="range"
              min="0"
              max="20"
              step="1"
              class="RangeInput"
            />
            <span class="AppearancePanel__Hint">{{ appearanceForm.blur }}px</span>
          </div>
        </div>
        <div class="AppearancePanel__Row">
          <label>磨砂度</label>
          <div class="AppearancePanel__Controls">
            <input
              v-model.number="appearanceForm.frost"
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              class="RangeInput"
            />
            <span class="AppearancePanel__Hint">{{ appearanceForm.frost }}</span>
          </div>
        </div>
        <div class="AppearancePanel__Row">
          <label>字体颜色</label>
          <div class="AppearancePanel__Controls">
            <input
              v-model="appearanceForm.fontColor"
              type="color"
              class="ColorInput"
            />
            <input
              v-model="appearanceForm.fontColor"
              type="text"
              class="TextBox"
              placeholder="#1f2937"
            />
          </div>
        </div>
        <div class="AppearancePanel__Actions">
          <button type="button" class="MiniButton" @click="resetAppearance">
            恢复默认
          </button>
          <button type="button" class="PrimaryButton" @click="saveAppearanceSettings">
            保存外观
          </button>
        </div>
        <span v-if="appearanceSaved" class="ReviewPanel__Saved">已保存</span>
        <span class="ReviewPanel__Hint">
          背景图使用可访问的 URL，清空后恢复默认背景。
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getSettings, saveSettings } from '../services/settings'
import {
  appearanceDefaults,
  applyAppearance,
  extractAppearanceSettings,
  normalizeBlur,
  normalizeFontColor,
  normalizeFontSize,
  normalizeFrost,
} from '../utils/appearance'

const loading = ref(true)
const error = ref('')
const appearanceForm = reactive({
  backgroundUrl: '',
  fontSize: appearanceDefaults.fontSize,
  blur: appearanceDefaults.blur,
  frost: appearanceDefaults.frost,
  fontColor: appearanceDefaults.fontColor,
})
const appearanceSaved = ref(false)

const setError = (err: unknown) => {
  error.value = err instanceof Error ? err.message : String(err)
}

const applyAppearanceSettings = (settings: Record<string, string>) => {
  const appearance = extractAppearanceSettings(settings)
  appearanceForm.backgroundUrl = appearance.backgroundUrl
  appearanceForm.fontSize = appearance.fontSize
  appearanceForm.blur = appearance.blur
  appearanceForm.frost = appearance.frost
  appearanceForm.fontColor = appearance.fontColor
  applyAppearance(appearance)
}

const loadSettings = async () => {
  loading.value = true
  error.value = ''
  try {
    const settings = await getSettings()
    applyAppearanceSettings(settings)
  } catch (err) {
    setError(err)
  } finally {
    loading.value = false
  }
}

const saveAppearanceSettings = async () => {
  try {
    const fontSize = normalizeFontSize(appearanceForm.fontSize)
    const blur = normalizeBlur(appearanceForm.blur)
    const frost = normalizeFrost(appearanceForm.frost)
    const fontColor = normalizeFontColor(appearanceForm.fontColor)
    const backgroundUrl = appearanceForm.backgroundUrl.trim()
    appearanceForm.fontSize = fontSize
    appearanceForm.backgroundUrl = backgroundUrl
    appearanceForm.blur = blur
    appearanceForm.frost = frost
    appearanceForm.fontColor = fontColor
    await saveSettings({
      'appearance.background.url': backgroundUrl,
      'appearance.font.size': String(fontSize),
      'appearance.background.blur': String(blur),
      'appearance.background.frost': String(frost),
      'appearance.font.color': fontColor,
    })
    applyAppearance({ backgroundUrl, fontSize, blur, frost, fontColor })
    appearanceSaved.value = true
    setTimeout(() => {
      appearanceSaved.value = false
    }, 2000)
  } catch (err) {
    setError(err)
  }
}

const resetAppearance = async () => {
  appearanceForm.backgroundUrl = ''
  appearanceForm.fontSize = appearanceDefaults.fontSize
  appearanceForm.blur = appearanceDefaults.blur
  appearanceForm.frost = appearanceDefaults.frost
  appearanceForm.fontColor = appearanceDefaults.fontColor
  await saveAppearanceSettings()
}

onMounted(() => {
  loadSettings()
})
</script>
