<template>
  <section class="page SummaryPage">
    <div class="SummaryHeader">
      <h1>学习汇总</h1>
      <p>自动统计今日、近 7 天、近 30 天的学习记录与完成情况。</p>
    </div>

    <div v-if="loading" class="Empty">加载中...</div>
    <div v-else-if="error" class="Empty">{{ error }}</div>
    <div v-else class="SummaryContent">
      <div class="SummaryCards">
        <article v-for="summary in summaries" :key="summary.key" class="SummaryCard">
          <div class="SummaryCard__Top">
            <div>
              <div class="SummaryCard__Label">{{ summary.label }}</div>
              <div class="SummaryCard__Range">{{ summary.rangeText }}</div>
            </div>
            <div class="SummaryRing" :style="{ '--rate': `${summary.completionRatePercent}%` }">
              <div class="SummaryRing__Center">
                <div class="SummaryRing__Value">{{ summary.completionRatePercent }}%</div>
                <div class="SummaryRing__Caption">完成率</div>
              </div>
            </div>
          </div>
          <div class="SummaryMetrics">
            <div class="SummaryMetric">
              <div class="SummaryMetric__Label">执行次数</div>
              <div class="SummaryMetric__Value">{{ summary.executionCount }} 次</div>
              <div class="SummaryMetric__Bar">
                <span
                  class="SummaryMetric__Fill"
                  :style="{ width: `${toPercent(summary.executionCount, maxExecutionCount)}%` }"
                ></span>
              </div>
            </div>
            <div class="SummaryMetric">
              <div class="SummaryMetric__Label">学习时长</div>
              <div class="SummaryMetric__Value">{{ formatMinutes(summary.studyMinutes) }}</div>
              <div class="SummaryMetric__Hint">番茄专注 + 时间记录</div>
            </div>
            <div class="SummaryMetric">
              <div class="SummaryMetric__Label">任务完成率</div>
              <div class="SummaryMetric__Value">{{ summary.completedCount }}/{{ summary.totalCount }}</div>
            </div>
          </div>
        </article>
      </div>

      <div class="SummaryChart">
        <div class="SummaryChart__Header">
          <h2>学习时长对比</h2>
          <span>分钟</span>
        </div>
        <div class="SummaryChart__Bars">
          <div v-for="summary in summaries" :key="summary.key" class="SummaryChart__Bar">
            <div class="SummaryChart__Value">{{ formatMinutesValue(summary.studyMinutes) }}</div>
            <div class="SummaryChart__Column">
              <span
                class="SummaryChart__Fill"
                :style="{ height: `${toPercent(summary.studyMinutes, maxStudyMinutes)}%` }"
              ></span>
            </div>
            <div class="SummaryChart__Label">{{ summary.label }}</div>
          </div>
        </div>
      </div>

      <p class="SummaryNote">
        执行次数=日志记录+番茄专注次数，学习时长=番茄专注分钟+时间类记录。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listItems, type Item } from '../services/items'
import { listLogs, type Log } from '../services/logs'
import { listPomodoroSessions, type PomodoroSession } from '../services/pomodoro'

type RangeSummary = {
  key: string
  label: string
  days: number
  start: string
  end: string
  rangeText: string
  executionCount: number
  studyMinutes: number
  completionRatePercent: number
  totalCount: number
  completedCount: number
}

const items = ref<Item[]>([])
const logs = ref<Log[]>([])
const sessions = ref<PomodoroSession[]>([])
const loading = ref(true)
const error = ref('')
const baseDate = ref(new Date())

const rangeDefs = [
  { key: 'today', label: '今日', days: 1 },
  { key: 'week', label: '近 7 天', days: 7 },
  { key: 'month', label: '近 30 天', days: 30 },
]

const toMessage = (value: unknown) =>
  value instanceof Error ? value.message : String(value)

const formatDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const normalizeDate = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 10)
}

const isInRange = (value: string, start: string, end: string) =>
  value >= start && value <= end

const getRange = (days: number) => {
  const end = formatDate(baseDate.value)
  const startDate = new Date(baseDate.value)
  startDate.setDate(startDate.getDate() - (days - 1))
  const start = formatDate(startDate)
  return { start, end }
}

const ranges = computed(() =>
  rangeDefs.map((range) => {
    const { start, end } = getRange(range.days)
    return {
      ...range,
      start,
      end,
      rangeText: range.days === 1 ? start : `${start} ~ ${end}`,
    }
  }),
)

const summaries = computed<RangeSummary[]>(() => {
  const itemMap = new Map(items.value.map((item) => [item.id, item]))
  return ranges.value.map((range) => {
    const logsInRange = logs.value.filter((log) => {
      const dateKey = normalizeDate(log.date)
      return dateKey && isInRange(dateKey, range.start, range.end)
    })
    const itemsInRange = items.value.filter((item) => {
      const dateKey = normalizeDate(item.created_at)
      return dateKey && isInRange(dateKey, range.start, range.end)
    })
    const itemIds = new Set(itemsInRange.map((item) => item.id))
    const completedItemIds = new Set(
      logsInRange.filter((log) => itemIds.has(log.item_id)).map((log) => log.item_id),
    )
    const focusSessions = sessions.value.filter((session) => {
      if (session.mode !== 'focus' || session.status !== 'completed') return false
      const dateKey = normalizeDate(session.started_at)
      return dateKey && isInRange(dateKey, range.start, range.end)
    })
    const timeLogMinutes = logsInRange.reduce((sum, log) => {
      const item = itemMap.get(log.item_id)
      if (item?.measure !== 'time') return sum
      return sum + Number(log.value || 0)
    }, 0)
    const focusMinutes = focusSessions.reduce(
      (sum, session) => sum + session.duration_seconds / 60,
      0,
    )
    const studyMinutes = timeLogMinutes + focusMinutes
    const executionCount = logsInRange.length + focusSessions.length
    const totalCount = itemIds.size
    const completedCount = completedItemIds.size
    const completionRatePercent = totalCount
      ? Math.round((completedCount / totalCount) * 100)
      : 0
    return {
      key: range.key,
      label: range.label,
      days: range.days,
      start: range.start,
      end: range.end,
      rangeText: range.rangeText,
      executionCount,
      studyMinutes,
      completionRatePercent,
      totalCount,
      completedCount,
    }
  })
})

const maxStudyMinutes = computed(() => {
  const values = summaries.value.map((summary) => summary.studyMinutes)
  if (values.length === 0) return 1
  return Math.max(1, ...values)
})

const maxExecutionCount = computed(() => {
  const values = summaries.value.map((summary) => summary.executionCount)
  if (values.length === 0) return 1
  return Math.max(1, ...values)
})

const toPercent = (value: number, maxValue: number) => {
  if (!maxValue || maxValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)))
}

const formatMinutes = (value: number) => {
  const rounded = Math.round(value)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
  }
  return `${minutes} 分`
}

const formatMinutesValue = (value: number) => Math.round(value)

const loadData = async () => {
  loading.value = true
  error.value = ''
  baseDate.value = new Date()
  const { start } = getRange(30)
  const { end } = getRange(1)
  try {
    const [itemsData, logsData, sessionData] = await Promise.all([
      listItems(),
      listLogs({ start, end, limit: 500 }),
      listPomodoroSessions({ start, end, limit: 500 }),
    ])
    items.value = itemsData
    logs.value = logsData
    sessions.value = sessionData
  } catch (err) {
    error.value = toMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})
</script>
