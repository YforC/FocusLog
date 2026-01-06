<template>
  <section class="page">
    <div ref="confettiLayer" class="confetti-layer" aria-hidden="true"></div>
    <div class="DateTime">
      <span class="DateTime__Date">{{ todayLabel }}</span>
      <span class="DateTime__Time">{{ timeLabel }}</span>
    </div>
    <div v-if="reminderNotice" class="ReminderNotice">
      <span>{{ reminderNotice }}</span>
      <button class="ReminderNotice__Button" type="button" @click="dismissReminder">
        知道了
      </button>
    </div>

    <div class="InputPanel">
      <input
        v-model="newTitle"
        class="TextBox"
        type="text"
        placeholder="新增今日计划"
        @keyup.enter="addTodo"
      />
      <div class="InputPanel__Options">
        <select v-model="newMilestoneId" class="SelectBox">
          <option value="">不绑定里程碑</option>
          <option
            v-for="milestone in activeMilestones"
            :key="milestone.id"
            :value="milestone.id"
          >
            {{ milestone.title }}
          </option>
        </select>
      </div>
      <p v-if="activeMilestones.length === 0" class="InputPanel__Hint">
        暂无里程碑，请先在周期规划中创建。
      </p>
      <p v-if="actionError" class="ErrorText">{{ actionError }}</p>
    </div>

    <div class="Pomodoro">
      <div class="Pomodoro__Header">
        <span>番茄钟</span>
        <span class="Pomodoro__ModeLabel">{{ modeLabel }}</span>
      </div>
      <div class="Pomodoro__Timer">{{ timerLabel }}</div>
      <div class="Pomodoro__Controls">
        <button
          class="Pomodoro__Mode"
          :class="{ 'Pomodoro__Mode--active': selectedMode === 'focus' }"
          type="button"
          @click="setMode('focus')"
        >
          专注
        </button>
        <button
          class="Pomodoro__Mode"
          :class="{ 'Pomodoro__Mode--active': selectedMode === 'short_break' }"
          type="button"
          @click="setMode('short_break')"
        >
          短休
        </button>
        <button
          class="Pomodoro__Mode"
          :class="{ 'Pomodoro__Mode--active': selectedMode === 'long_break' }"
          type="button"
          @click="setMode('long_break')"
        >
          长休
        </button>
        <select v-model="selectedItemId" class="Pomodoro__Select">
          <option value="">不绑定计划</option>
          <option v-for="item in todayItems" :key="item.id" :value="item.id">
            {{ item.title }}
          </option>
        </select>
      </div>
      <div class="Pomodoro__Settings">
        <label class="Pomodoro__Label">时长（分钟）</label>
        <input
          v-model.number="customMinutes"
          class="Pomodoro__Minutes"
          type="number"
          min="1"
          @change="applyCustomMinutes"
        />
        <button
          v-if="isMinutesDirty"
          class="Pomodoro__Save"
          type="button"
          @click="saveDefaultMinutes"
        >
          保存时间
        </button>
      </div>
      <div class="Pomodoro__Actions">
        <button class="Pomodoro__Button" type="button" @click="toggleTimer">
          {{ isRunning ? '暂停' : '开始' }}
        </button>
        <button class="Pomodoro__Button" type="button" @click="finishTimer">
          结束
        </button>
        <button class="Pomodoro__Button ghost" type="button" @click="resetTimer">
          重置
        </button>
      </div>
    </div>

    <ul class="Todolist">
      <li v-if="showListLoading" class="Empty">加载中...</li>
      <li v-else-if="filteredItems.length === 0" class="Empty">
        暂无今日计划。
      </li>
      <li
        v-else
        v-for="item in filteredItems"
        :key="item.id"
        class="Todo"
        :class="{ 'Todo--checked': isDone(item) }"
      >
        <div class="Todo__Check">
          <span class="Todo__CheckDot"></span>
        </div>
        <div
          class="Todo__Task"
          :class="{ 'Todo__Task--editing': editingId === item.id }"
          @click="toggleDone(item)"
        >
          <template v-if="editingId === item.id">
            <input
              v-model="editingTitle"
              class="Todo__Input"
              type="text"
              @click.stop
            />
            <div class="Todo__EditActions">
              <button class="Todo__ActionButton" type="button" @click.stop="saveEdit(item)">
                保存
              </button>
              <button class="Todo__ActionButton" type="button" @click.stop="cancelEdit">
                取消
              </button>
            </div>
          </template>
          <template v-else>
            <div class="Todo__Title">{{ item.title }}</div>
            <div
              v-if="item.priority || milestoneMap[item.milestone_id ?? '']"
              class="Todo__Meta"
            >
              <span v-if="item.priority">优先级：{{ priorityLabel(item.priority) }}</span>
              <span v-if="milestoneMap[item.milestone_id ?? '']">
                里程碑：{{ milestoneMap[item.milestone_id ?? ''] }}
              </span>
            </div>
            <div v-if="item.measure !== 'check' && !isDone(item)" class="Todo__ValueRow">
              <input
                v-model="inputValues[item.id]"
                class="Todo__ValueInput"
                type="number"
                min="0"
                :placeholder="valuePlaceholder(item)"
                @click.stop
              />
              <span class="Todo__Unit">{{ valueUnit(item) }}</span>
              <button class="Todo__RecordButton" type="button" @click.stop="recordValue(item)">
                记录
              </button>
            </div>
            <div v-else-if="item.measure !== 'check' && isDone(item)" class="Todo__Result">
              已记录：{{ formatLogValue(item) }}
            </div>
          </template>
        </div>
        <div class="Todo__Actions">
          <button
            class="Todo__Edit"
            type="button"
            @click.stop="startEdit(item)"
          >
            编辑
          </button>
          <button
            class="Todo__Delete"
            type="button"
            :disabled="deletingId === item.id"
            @click.stop="removeItem(item)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { createLog, deleteLog, listLogs, type Log } from '../services/logs'
import { createItem, deleteItem, listItems, updateItem, type Item } from '../services/items'
import { listMilestones, type Milestone } from '../services/milestones'
import { createPomodoroSession } from '../services/pomodoro'
import { getSettings, saveSettings } from '../services/settings'

const todayLogs = ref<Log[]>([])
const items = ref<Item[]>([])
const milestones = ref<Milestone[]>([])
const logsByItem = ref<Record<string, Log>>({})
const loading = ref(true)
const actionError = ref('')
const newTitle = ref('')
const newMilestoneId = ref('')
const inputValues = reactive<Record<string, string>>({})
const confettiLayer = ref<HTMLDivElement | null>(null)
const deletingId = ref('')
const editingId = ref('')
const editingTitle = ref('')
const isRunning = ref(false)
const remainingSeconds = ref(25 * 60)
const selectedMode = ref<'focus' | 'short_break' | 'long_break'>('focus')
const selectedItemId = ref('')
const sessionStart = ref<Date | null>(null)
const sessionDurationSeconds = ref(25 * 60)
const customMinutes = ref(25)
let pomodoroTimer: number | undefined

const reminderNotice = ref('')
const reminderNoticeType = ref<'unfinished' | 'pomodoro' | 'study' | ''>('')
const reminderSettings = reactive({
  unfinishedEnabled: true,
  unfinishedTime: '21:00',
  pomodoroEnabled: true,
  pomodoroMinutes: 10,
  studyEnabled: false,
  studyStart: '09:00',
  studyEnd: '11:00',
  systemEnabled: false,
})
const lastUnfinishedReminderDate = ref('')
const lastStudyReminderDate = ref('')
const pomodoroPausedAt = ref<Date | null>(null)
const pomodoroInterruptNotified = ref(false)
let reminderTimer: number | undefined

const now = ref(new Date())
let timer: number | undefined

const defaultMinutes = reactive({
  focus: 25,
  short_break: 5,
  long_break: 15,
})

const formatDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const formatSeconds = (value: number) => {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const priorityOptions = [
  { value: 0, label: '普通' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
]

const priorityLabel = (value?: number | null) => {
  const match = priorityOptions.find((option) => option.value === Number(value ?? 0))
  return match ? match.label : '普通'
}

const todayLabel = computed(() => formatDate(now.value))
const timeLabel = computed(() => formatTime(now.value))

const modeLabel = computed(() => {
  if (selectedMode.value === 'focus') return '专注'
  if (selectedMode.value === 'short_break') return '短休'
  return '长休'
})

const timerLabel = computed(() => formatSeconds(remainingSeconds.value))
const isMinutesDirty = computed(
  () => customMinutes.value !== defaultMinutes[selectedMode.value],
)
const showListLoading = computed(
  () => loading.value && todayItems.value.length === 0,
)

const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const todayDate = computed(() => formatDate(now.value))
const activeMilestones = computed(() =>
  milestones.value.filter((milestone) => milestone.status === 'active'),
)

const archivedMilestoneIds = computed(
  () =>
    new Set(milestones.value.filter((milestone) => milestone.status === 'archived').map((m) => m.id)),
)

const isArchivedItem = (item: Item) =>
  Boolean(item.archived_at) ||
  Boolean(item.milestone_id && archivedMilestoneIds.value.has(item.milestone_id))

const milestoneMap = computed(() => {
  const map: Record<string, string> = {}
  milestones.value
    .filter((milestone) => milestone.status !== 'archived')
    .forEach((milestone) => {
    map[milestone.id] = milestone.title
  })
  return map
})

const isTodayItem = (item: Item) => {
  if (!item.created_at) return true
  const createdAt = new Date(item.created_at)
  return formatDate(createdAt) === todayDate.value
}

const logItemIds = computed(() => new Set(todayLogs.value.map((log) => log.item_id)))

const todayItems = computed(() =>
  items.value.filter(
    (item) =>
      !isArchivedItem(item) && (isTodayItem(item) || logItemIds.value.has(item.id)),
  ),
)

const isDone = (item: Item) => Boolean(logsByItem.value[item.id])

const filteredItems = computed(() => {
  return [...todayItems.value].sort((a, b) => {
    const doneDiff = Number(isDone(a)) - Number(isDone(b))
    if (doneDiff !== 0) return doneDiff
    const priorityDiff = Number(b.priority ?? 0) - Number(a.priority ?? 0)
    if (priorityDiff !== 0) return priorityDiff
    const createdA = a.created_at ?? ''
    const createdB = b.created_at ?? ''
    return createdB.localeCompare(createdA)
  })
})

const valueUnit = (item: Item) => (item.measure === 'time' ? '分钟' : '次数')
const valuePlaceholder = (item: Item) =>
  item.measure === 'time' ? '分钟' : '数量'

const formatLogValue = (item: Item) => {
  const log = logsByItem.value[item.id]
  if (!log) return ''
  const unit = valueUnit(item)
  return `${log.value} ${unit}`
}

const sanitizeMinutes = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback
  }
  return Math.round(value)
}

const loadCachedMinutes = () => {
  if (typeof window === 'undefined') return
  defaultMinutes.focus = sanitizeMinutes(
    Number(window.localStorage.getItem('pomodoro.focus_minutes')),
    defaultMinutes.focus,
  )
  defaultMinutes.short_break = sanitizeMinutes(
    Number(window.localStorage.getItem('pomodoro.short_break_minutes')),
    defaultMinutes.short_break,
  )
  defaultMinutes.long_break = sanitizeMinutes(
    Number(window.localStorage.getItem('pomodoro.long_break_minutes')),
    defaultMinutes.long_break,
  )
  customMinutes.value = defaultMinutes[selectedMode.value]
  remainingSeconds.value = customMinutes.value * 60
}

loadCachedMinutes()

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

const parseTime = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  if (!/^\d{2}:\d{2}$/.test(value)) return fallback
  return value
}

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.round(parsed)
}

const applyReminderSettings = (settings: Record<string, string>) => {
  reminderSettings.unfinishedEnabled = parseBoolean(
    settings['reminder.unfinished.enabled'],
    reminderSettings.unfinishedEnabled,
  )
  reminderSettings.unfinishedTime = parseTime(
    settings['reminder.unfinished.time'],
    reminderSettings.unfinishedTime,
  )
  reminderSettings.pomodoroEnabled = parseBoolean(
    settings['reminder.pomodoro.enabled'],
    reminderSettings.pomodoroEnabled,
  )
  reminderSettings.pomodoroMinutes = parseNumber(
    settings['reminder.pomodoro.minutes'],
    reminderSettings.pomodoroMinutes,
  )
  reminderSettings.studyEnabled = parseBoolean(
    settings['reminder.study.enabled'],
    reminderSettings.studyEnabled,
  )
  reminderSettings.studyStart = parseTime(
    settings['reminder.study.start'],
    reminderSettings.studyStart,
  )
  reminderSettings.studyEnd = parseTime(
    settings['reminder.study.end'],
    reminderSettings.studyEnd,
  )
  reminderSettings.systemEnabled = parseBoolean(
    settings['reminder.system.enabled'],
    reminderSettings.systemEnabled,
  )
}

const loadPomodoroSettings = async () => {
  try {
    const settings = await getSettings()
    defaultMinutes.focus = sanitizeMinutes(
      Number(settings['pomodoro.focus_minutes']),
      defaultMinutes.focus,
    )
    defaultMinutes.short_break = sanitizeMinutes(
      Number(settings['pomodoro.short_break_minutes']),
      defaultMinutes.short_break,
    )
    defaultMinutes.long_break = sanitizeMinutes(
      Number(settings['pomodoro.long_break_minutes']),
      defaultMinutes.long_break,
    )
    customMinutes.value = defaultMinutes[selectedMode.value]
    remainingSeconds.value = customMinutes.value * 60
    applyReminderSettings(settings)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pomodoro.focus_minutes', String(defaultMinutes.focus))
      window.localStorage.setItem(
        'pomodoro.short_break_minutes',
        String(defaultMinutes.short_break),
      )
      window.localStorage.setItem(
        'pomodoro.long_break_minutes',
        String(defaultMinutes.long_break),
      )
    }
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const applyCustomMinutes = () => {
  const sanitized = sanitizeMinutes(customMinutes.value, defaultMinutes[selectedMode.value])
  customMinutes.value = sanitized
  if (!isRunning.value) {
    remainingSeconds.value = sanitized * 60
  }
}

const saveDefaultMinutes = async () => {
  const minutes = sanitizeMinutes(customMinutes.value, defaultMinutes[selectedMode.value])
  customMinutes.value = minutes
  const keyMap = {
    focus: 'pomodoro.focus_minutes',
    short_break: 'pomodoro.short_break_minutes',
    long_break: 'pomodoro.long_break_minutes',
  } as const
  try {
    await saveSettings({ [keyMap[selectedMode.value]]: String(minutes) })
    defaultMinutes[selectedMode.value] = minutes
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(keyMap[selectedMode.value], String(minutes))
    }
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const setMode = (mode: 'focus' | 'short_break' | 'long_break') => {
  selectedMode.value = mode
}

const launchConfetti = () => {
  const layer = confettiLayer.value
  if (!layer) return
  const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7']
  const count = 20
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('span')
    piece.className = 'confetti-piece'
    const size = 6 + Math.random() * 8
    piece.style.width = `${size}px`
    piece.style.height = `${size * 0.6}px`
    piece.style.left = `${Math.random() * 100}%`
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    piece.style.animationDuration = `${1200 + Math.random() * 1000}ms`
    piece.style.animationDelay = `${Math.random() * 200}ms`
    piece.style.setProperty('--spin', `${180 + Math.random() * 360}deg`)
    piece.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 120}px`)
    fragment.appendChild(piece)
  }
  layer.appendChild(fragment)
  window.setTimeout(() => {
    if (!layer) return
    layer.querySelectorAll('.confetti-piece').forEach((node) => node.remove())
  }, 2600)
}

const loadTodayData = async () => {
  const shouldShowLoading = items.value.length === 0 && todayLogs.value.length === 0
  if (shouldShowLoading) {
    loading.value = true
  }
  actionError.value = ''
  try {
    const [itemsData, logsData] = await Promise.all([
      listItems(),
      listLogs({ start: todayDate.value, end: todayDate.value, limit: 200 }),
    ])
    items.value = itemsData
    todayLogs.value = logsData
    const map: Record<string, Log> = {}
    logsData.forEach((log) => {
      if (!map[log.item_id]) {
        map[log.item_id] = log
      }
    })
    logsByItem.value = map
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    loading.value = false
    checkReminders()
  }
}

const loadMilestones = async () => {
  try {
    milestones.value = await listMilestones()
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const setReminder = (type: 'unfinished' | 'pomodoro' | 'study', message: string) => {
  reminderNoticeType.value = type
  reminderNotice.value = message
}

const canUseSystemNotification = () =>
  reminderSettings.systemEnabled &&
  typeof Notification !== 'undefined' &&
  Notification.permission === 'granted'

const notifySystem = (title: string, body: string) => {
  if (!canUseSystemNotification()) return false
  try {
    new Notification(title, { body })
    return true
  } catch (error) {
    return false
  }
}

const pushReminder = (type: 'unfinished' | 'pomodoro' | 'study', message: string, title: string) => {
  if (notifySystem(title, message)) {
    return
  }
  setReminder(type, message)
}

const dismissReminder = () => {
  reminderNoticeType.value = ''
  reminderNotice.value = ''
}

const checkReminders = () => {
  const nowTime = formatTime(new Date())
  const today = formatDate(new Date())

  if (
    reminderSettings.unfinishedEnabled &&
    nowTime >= reminderSettings.unfinishedTime &&
    lastUnfinishedReminderDate.value !== today
  ) {
    const unfinishedCount = todayItems.value.filter((item) => !isDone(item)).length
    if (unfinishedCount > 0) {
      pushReminder(
        'unfinished',
        `今日仍有 ${unfinishedCount} 项未完成，建议收尾。`,
        '未完成任务提醒',
      )
      lastUnfinishedReminderDate.value = today
    }
  }

  if (
    reminderSettings.studyEnabled &&
    nowTime >= reminderSettings.studyStart &&
    lastStudyReminderDate.value !== today
  ) {
    pushReminder(
      'study',
      `学习时段开始：${reminderSettings.studyStart} - ${reminderSettings.studyEnd}`,
      '学习时段提醒',
    )
    lastStudyReminderDate.value = today
  }

  if (reminderSettings.pomodoroEnabled && pomodoroPausedAt.value) {
    const elapsedMinutes =
      (Date.now() - pomodoroPausedAt.value.getTime()) / 60000
    if (!pomodoroInterruptNotified.value && elapsedMinutes >= reminderSettings.pomodoroMinutes) {
      pushReminder(
        'pomodoro',
        `番茄钟已暂停 ${reminderSettings.pomodoroMinutes} 分钟，建议继续或结束。`,
        '番茄中断提醒',
      )
      pomodoroInterruptNotified.value = true
    }
  }
}

const addTodo = async () => {
  const title = newTitle.value.trim()
  if (!title) {
    actionError.value = '请输入计划名称。'
    return
  }
  actionError.value = ''
  try {
    await createItem({
      title,
      kind: 'todo',
      measure: 'check',
      milestone_id: newMilestoneId.value || undefined,
    })
    newTitle.value = ''
    await loadTodayData()
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const toggleDone = async (item: Item) => {
  if (item.measure !== 'check' || editingId.value) return
  actionError.value = ''
  try {
    if (isDone(item)) {
      await deleteLog(logsByItem.value[item.id].id)
    } else {
      await createLog({
        item_id: item.id,
        date: todayDate.value,
        value: 1,
      })
      launchConfetti()
    }
    await loadTodayData()
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const recordValue = async (item: Item) => {
  const rawValue = inputValues[item.id]
  const value = Number(rawValue)
  if (!rawValue || Number.isNaN(value) || value <= 0) {
    actionError.value = '请输入有效的数值。'
    return
  }
  actionError.value = ''
  try {
    await createLog({
      item_id: item.id,
      date: todayDate.value,
      value,
    })
    inputValues[item.id] = ''
    await loadTodayData()
  } catch (error) {
    actionError.value = toMessage(error)
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
    await loadTodayData()
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    deletingId.value = ''
  }
}

const startEdit = (item: Item) => {
  editingId.value = item.id
  editingTitle.value = item.title
}

const cancelEdit = () => {
  editingId.value = ''
  editingTitle.value = ''
}

const saveEdit = async (item: Item) => {
  const title = editingTitle.value.trim()
  if (!title) {
    actionError.value = '请输入计划名称。'
    return
  }
  actionError.value = ''
  try {
    await updateItem(item.id, { title })
    cancelEdit()
    await loadTodayData()
  } catch (error) {
    actionError.value = toMessage(error)
  }
}

const tickTimer = () => {
  if (remainingSeconds.value <= 0) {
    finishTimer()
    return
  }
  remainingSeconds.value -= 1
}

const startTimer = () => {
  if (isRunning.value) return
  if (!sessionStart.value) {
    sessionStart.value = new Date()
  }
  pomodoroPausedAt.value = null
  pomodoroInterruptNotified.value = false
  if (reminderNoticeType.value === 'pomodoro') {
    dismissReminder()
  }
  applyCustomMinutes()
  sessionDurationSeconds.value = remainingSeconds.value
  isRunning.value = true
  pomodoroTimer = window.setInterval(() => {
    tickTimer()
  }, 1000)
}

const pauseTimer = () => {
  isRunning.value = false
  if (pomodoroTimer) {
    window.clearInterval(pomodoroTimer)
    pomodoroTimer = undefined
  }
  if (sessionStart.value && remainingSeconds.value > 0) {
    pomodoroPausedAt.value = new Date()
    pomodoroInterruptNotified.value = false
  }
}

const toggleTimer = () => {
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}

const resetTimer = () => {
  pauseTimer()
  sessionStart.value = null
  remainingSeconds.value = customMinutes.value * 60
  sessionDurationSeconds.value = remainingSeconds.value
  pomodoroPausedAt.value = null
  pomodoroInterruptNotified.value = false
}

const finishTimer = async () => {
  pauseTimer()
  if (sessionStart.value) {
    const elapsed = Math.max(sessionDurationSeconds.value - remainingSeconds.value, 1)
    const endedAt = new Date()
    await createPomodoroSession({
      item_id: selectedItemId.value || undefined,
      mode: selectedMode.value,
      duration_seconds: elapsed,
      started_at: sessionStart.value.toISOString(),
      ended_at: endedAt.toISOString(),
      status: 'completed',
    })
  }
  if (reminderNoticeType.value === 'pomodoro') {
    dismissReminder()
  }
  resetTimer()
}

watch(selectedMode, () => {
  customMinutes.value = defaultMinutes[selectedMode.value]
  applyCustomMinutes()
})

onMounted(async () => {
  await loadPomodoroSettings()
  await loadMilestones()
  await loadTodayData()
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 60000)
  reminderTimer = window.setInterval(() => {
    checkReminders()
  }, 60000)
  checkReminders()
})

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer)
  }
  if (pomodoroTimer) {
    window.clearInterval(pomodoroTimer)
  }
  if (reminderTimer) {
    window.clearInterval(reminderTimer)
  }
})
</script>
