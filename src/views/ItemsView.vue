<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>计划管理</h1>
        <p class="page-subtitle">管理你的计划与标签。</p>
      </div>
      <button class="secondary-btn" type="button">新建计划</button>
    </header>
    <div class="card">
      <p v-if="loading" class="muted">加载中...</p>
      <p v-else-if="error" class="muted">{{ error }}</p>
      <p v-else-if="actionError" class="muted">{{ actionError }}</p>
      <p v-else-if="items.length === 0" class="muted">
        暂无计划。
      </p>
      <ul v-else class="item-list">
        <li v-for="item in items" :key="item.id" class="item-row">
          <div>
            <strong>{{ item.title }}</strong>
          </div>
          <div class="item-actions">
            <button
              class="ghost-btn"
              type="button"
              :disabled="deletingId === item.id"
              @click="removeItem(item)"
            >
              删除
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteItem, listItems, type Item } from '../services/items'

const items = ref<Item[]>([])
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const deletingId = ref('')

const toMessage = (value: unknown) =>
  value instanceof Error ? value.message : String(value)

const loadItems = async () => {
  loading.value = true
  error.value = ''
  actionError.value = ''
  try {
    items.value = await listItems()
  } catch (err) {
    error.value = toMessage(err)
  } finally {
    loading.value = false
  }
}

const removeItem = async (item: Item) => {
  if (!window.confirm('确认删除该计划？')) {
    return
  }
  deletingId.value = item.id
  actionError.value = ''
  try {
    await deleteItem(item.id)
    await loadItems()
  } catch (err) {
    actionError.value = toMessage(err)
  } finally {
    deletingId.value = ''
  }
}

onMounted(async () => {
  await loadItems()
})
</script>
