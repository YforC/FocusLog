<template>
  <section class="page PlanManagePage">
    <div class="ManageHeader">
      <h1>计划管理</h1>
      <p>按日期查看与导出计划。</p>
    </div>

    <div class="ManageToolbar">
      <div class="ManageToolbar__Field">
        <span class="ManageToolbar__Label">选择日期</span>
        <input v-model="selectedDate" type="date" class="SelectBox" />
        <button class="MiniButton" type="button" @click="clearDate">全部</button>
      </div>
      <span class="ManageToolbar__Hint">仅显示该日期任务，可批量管理</span>
    </div>
    <div v-if="loading" class="Empty">加载中...</div>
    <div v-else-if="error" class="Empty">{{ error }}</div>
    <div v-else-if="displayDates.length === 0" class="Empty">{{ emptyText }}</div>

    <div v-for="date in displayDates" :key="date" class="Group">
      <div class="Group__TitleRow">
        <div class="Group__Title">{{ date }}</div>
        <div class="Group__Meta">已选 {{ selectedCount(date) }} / {{ groupedItems[date]?.length ?? 0 }}</div>
      </div>
      <div class="Group__Actions">
        <div class="Group__ActionsLeft">
          <label class="Group__SelectAll">
            <input
              type="checkbox"
              :checked="isAllSelected(date)"
              @change="toggleAll(date)"
            />
            全选
          </label>
          <button
            class="MiniButton"
            type="button"
            :disabled="selectedCount(date) === 0"
            @click="bulkDelete(date)"
          >
            批量删除
          </button>
        </div>
        <div class="Group__ActionsRight">
          <select v-model="exportFormat[date]" class="ExportSelect">
            <option value="json">导出 JSON</option>
            <option value="csv">导出 CSV</option>
          </select>
          <button class="ExportButton" type="button" @click="exportGroup(date)">
            导出
          </button>
        </div>
      </div>
      <ul class="Todolist">
        <li
          v-for="item in groupedItems[date]"
          :key="item.id"
          class="Todo"
          :class="{ 'Todo--checked': isDone(item) }"
        >
          <div class="Todo__Check">
            <input
              class="Todo__Select"
              type="checkbox"
              v-model="selectedItems[item.id]"
              @click.stop
            />
            <span class="Todo__CheckDot"></span>
          </div>
          <div class="Todo__Task">
            <div class="Todo__Title">{{ item.title }}</div>
          </div>
          <div class="Todo__Actions">
            <button
              class="Todo__Delete"
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { listLogs, type Log } from '../services/logs'
import { deleteItem, listItems, type Item } from '../services/items'
import { listMilestones, type Milestone } from '../services/milestones'

const items = ref<Item[]>([])
const logs = ref<Log[]>([])
const milestones = ref<Milestone[]>([])
const loading = ref(true)
const error = ref('')
const deletingId = ref('')
const exportFormat = reactive<Record<string, string>>({})
const selectedDate = ref('')
const selectedItems = reactive<Record<string, boolean>>({})

const toMessage = (value: unknown) =>
  value instanceof Error ? value.message : String(value)

const formatDate = (value?: string) => {
  if (!value) return ''
  return value.slice(0, 10)
}

const archivedMilestoneIds = computed(
  () => new Set(milestones.value.filter((milestone) => milestone.status === 'archived').map((m) => m.id)),
)

const isArchivedItem = (item: Item) =>
  Boolean(item.archived_at) ||
  Boolean(item.milestone_id && archivedMilestoneIds.value.has(item.milestone_id))

const activeItems = computed(() => items.value.filter((item) => !isArchivedItem(item)))

const groupedItems = computed(() => {
  const map: Record<string, Item[]> = {}
  activeItems.value.forEach((item) => {
    const date = formatDate(item.created_at) || '未知日期'
    if (!map[date]) map[date] = []
    map[date].push(item)
  })
  return map
})

const groupedDates = computed(() =>
  Object.keys(groupedItems.value).sort((a, b) => (a < b ? 1 : -1)),
)

const displayDates = computed(() => {
  if (!selectedDate.value) return groupedDates.value
  return groupedItems.value[selectedDate.value] ? [selectedDate.value] : []
})

const emptyText = computed(() =>
  selectedDate.value ? '该日期暂无计划。' : '暂无计划。',
)

const doneItemIds = computed(() => new Set(logs.value.map((log) => log.item_id)))

const isDone = (item: Item) => doneItemIds.value.has(item.id)

const clearSelection = () => {
  Object.keys(selectedItems).forEach((key) => {
    delete selectedItems[key]
  })
}

const selectedCount = (date: string) => {
  const itemsForDate = groupedItems.value[date] ?? []
  return itemsForDate.filter((item) => selectedItems[item.id]).length
}

const isAllSelected = (date: string) => {
  const itemsForDate = groupedItems.value[date] ?? []
  return itemsForDate.length > 0 && itemsForDate.every((item) => selectedItems[item.id])
}

const toggleAll = (date: string) => {
  const itemsForDate = groupedItems.value[date] ?? []
  const nextValue = !isAllSelected(date)
  itemsForDate.forEach((item) => {
    selectedItems[item.id] = nextValue
  })
}

const clearDate = () => {
  selectedDate.value = ''
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const [itemsData, logsData, milestonesData] = await Promise.all([
      listItems(),
      listLogs({ limit: 500 }),
      listMilestones(),
    ])
    items.value = itemsData
    logs.value = logsData
    milestones.value = milestonesData
    clearSelection()
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
  try {
    await deleteItem(item.id)
    delete selectedItems[item.id]
    await loadData()
  } catch (err) {
    error.value = toMessage(err)
  } finally {
    deletingId.value = ''
  }
}

const bulkDelete = async (date: string) => {
  const itemsForDate = groupedItems.value[date] ?? []
  const targets = itemsForDate.filter((item) => selectedItems[item.id])
  if (targets.length === 0) return
  if (!window.confirm(`确认删除选中的 ${targets.length} 项计划？`)) {
    return
  }
  deletingId.value = 'bulk'
  try {
    const results = await Promise.allSettled(
      targets.map((item) => deleteItem(item.id)),
    )
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        delete selectedItems[targets[index].id]
      }
    })
    const failed = results.filter((result) => result.status === 'rejected')
    if (failed.length > 0) {
      error.value = `有 ${failed.length} 项删除失败，请重试。`
    }
    await loadData()
  } catch (err) {
    error.value = toMessage(err)
  } finally {
    deletingId.value = ''
  }
}

const exportGroup = async (date: string) => {
  const itemsForDate = groupedItems.value[date] ?? []
  const format = exportFormat[date] || 'json'
  let logsForDate: Log[] = []
  try {
    logsForDate = await listLogs({ start: date, end: date, limit: 500 })
  } catch {
    logsForDate = []
  }

  if (format === 'csv') {
    const header = ['id', 'title', 'date', 'done']
    const rows = itemsForDate.map((item) => {
      const done = logsForDate.some((log) => log.item_id === item.id)
      return [item.id, item.title, date, done ? 'yes' : 'no']
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    downloadFile(`plans-${date}.csv`, 'text/csv', csv)
    return
  }

  const payload = {
    date,
    items: itemsForDate,
    logs: logsForDate,
  }
  downloadFile(`plans-${date}.json`, 'application/json', JSON.stringify(payload, null, 2))
}

const downloadFile = (filename: string, type: string, content: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

watch(selectedDate, () => {
  clearSelection()
})

onMounted(async () => {
  await loadData()
})
</script>
