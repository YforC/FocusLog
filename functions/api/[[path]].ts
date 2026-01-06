import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

const nowIso = () => new Date().toISOString()

const toItem = (row) => ({
  id: row.id,
  title: row.title,
  kind: row.kind,
  measure: row.measure,
  milestone_id: row.milestone_id ?? null,
  priority: Number(row.priority ?? 0),
  schedule_type: row.schedule_type,
  schedule_value: Number(row.schedule_value ?? 0),
  sort_order: Number(row.sort_order ?? 0),
  created_at: row.created_at,
  updated_at: row.updated_at,
  archived_at: row.archived_at ?? null,
})

const toLog = (row) => ({
  id: row.id,
  item_id: row.item_id,
  date: row.date,
  value: Number(row.value ?? 1),
  note: row.note ?? '',
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const toGoal = (row) => ({
  id: row.id,
  title: row.title,
  period: row.period,
  start_date: row.start_date ?? null,
  end_date: row.end_date ?? null,
  priority: Number(row.priority ?? 0),
  status: row.status,
  notes: row.notes ?? '',
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const toMilestone = (row) => ({
  id: row.id,
  goal_id: row.goal_id,
  title: row.title,
  start_date: row.start_date ?? null,
  end_date: row.end_date ?? null,
  priority: Number(row.priority ?? 0),
  status: row.status,
  notes: row.notes ?? '',
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const pomodoroModes = new Set(['focus', 'short_break', 'long_break'])
const pomodoroStatus = new Set(['running', 'completed', 'canceled'])

const goalPeriods = new Set(['longterm', 'weekly', 'monthly'])
const goalStatus = new Set(['active', 'completed', 'archived'])

const normalizePomodoroMode = (mode) =>
  pomodoroModes.has(mode) ? mode : 'focus'
const normalizePomodoroStatus = (status) =>
  pomodoroStatus.has(status) ? status : 'completed'
const normalizeGoalPeriod = (period) =>
  goalPeriods.has(period) ? period : 'longterm'
const normalizeGoalStatus = (status) =>
  goalStatus.has(status) ? status : 'active'

const normalizeDateBound = (value, isEnd) => {
  if (typeof value !== 'string') return null
  if (value.length === 10) {
    return isEnd ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`
  }
  return value
}

app.get('/health', (c) => c.json({ ok: true, timestamp: nowIso() }))

app.get('/items', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM items ORDER BY sort_order ASC, created_at DESC',
  ).all()
  return c.json(result.results.map(toItem))
})

app.get('/items/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()
  if (!row) {
    return c.json({ error: 'Item not found' }, 404)
  }
  return c.json(toItem(row))
})

app.post('/items', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  if (!title) {
    return c.json({ error: 'title is required' }, 400)
  }

  const id = crypto.randomUUID()
  const kind = payload.kind === 'habit' ? 'habit' : 'todo'
  const measure =
    payload.measure === 'time' || payload.measure === 'count'
      ? payload.measure
      : 'check'
  const scheduleType = payload.schedule_type ?? payload.schedule?.type ?? 'none'
  const scheduleValue = Number(payload.schedule_value ?? payload.schedule?.value ?? 0)
  const sortOrder = Number(payload.sort_order ?? 0)
  const milestoneId = typeof payload.milestone_id === 'string' ? payload.milestone_id : null
  const priority = Number(payload.priority ?? 0)
  const timestamp = nowIso()

  await c.env.DB.prepare(
    `INSERT INTO items
      (id, title, kind, measure, milestone_id, priority, schedule_type, schedule_value, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      title,
      kind,
      measure,
      milestoneId,
      priority,
      scheduleType,
      scheduleValue,
      sortOrder,
      timestamp,
      timestamp,
    )
    .run()

  return c.json({ id })
})

app.patch('/items/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ error: 'Item not found' }, 404)
  }

  const payload = await c.req.json().catch(() => ({}))
  const title =
    typeof payload.title === 'string' ? payload.title.trim() : existing.title
  const kind =
    payload.kind === 'habit' || payload.kind === 'todo'
      ? payload.kind
      : existing.kind
  const measure =
    payload.measure === 'time' || payload.measure === 'count' || payload.measure === 'check'
      ? payload.measure
      : existing.measure
  const scheduleType =
    payload.schedule_type ?? payload.schedule?.type ?? existing.schedule_type
  const scheduleValue = Number(
    payload.schedule_value ?? payload.schedule?.value ?? existing.schedule_value ?? 0,
  )
  const sortOrder = Number(payload.sort_order ?? existing.sort_order ?? 0)
  const milestoneId =
    typeof payload.milestone_id === 'string'
      ? payload.milestone_id
      : payload.milestone_id === null
        ? null
        : existing.milestone_id ?? null
  const priority = Number(payload.priority ?? existing.priority ?? 0)
  const updatedAt = nowIso()

  await c.env.DB.prepare(
    `UPDATE items
      SET title = ?, kind = ?, measure = ?,
          milestone_id = ?, priority = ?,
          schedule_type = ?, schedule_value = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      title,
      kind,
      measure,
      milestoneId,
      priority,
      scheduleType,
      scheduleValue,
      sortOrder,
      updatedAt,
      id,
    )
    .run()

  return c.json({ ok: true })
})

app.delete('/items/:id', async (c) => {
  const id = c.req.param('id')
  const deleteItemResult = await c.env.DB.prepare('DELETE FROM items WHERE id = ?')
    .bind(id)
    .run()
  if (deleteItemResult.meta.changes === 0) {
    return c.json({ error: 'Item not found' }, 404)
  }
  await c.env.DB.prepare('DELETE FROM logs WHERE item_id = ?')
    .bind(id)
    .run()
  await c.env.DB.prepare('DELETE FROM pomodoro_sessions WHERE item_id = ?')
    .bind(id)
    .run()
  return c.json({ ok: true })
})

app.get('/items/:id/dependencies', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    `SELECT items.id, items.title
     FROM item_dependencies
     JOIN items ON item_dependencies.depends_on_id = items.id
     WHERE item_dependencies.item_id = ?
     ORDER BY items.created_at DESC`,
  )
    .bind(id)
    .all()
  return c.json(
    result.results.map((row) => ({
      id: row.id,
      title: row.title,
    })),
  )
})

app.put('/items/:id/dependencies', async (c) => {
  const id = c.req.param('id')
  const payload = await c.req.json().catch(() => ({}))
  const raw = Array.isArray(payload.dependencies) ? payload.dependencies : []
  const dependencies = [...new Set(raw)]
    .filter((value) => typeof value === 'string' && value.trim())
    .filter((value) => value !== id)
  await c.env.DB.prepare('DELETE FROM item_dependencies WHERE item_id = ?')
    .bind(id)
    .run()
  if (dependencies.length > 0) {
    const timestamp = nowIso()
    const statements = dependencies.map((depId) =>
      c.env.DB.prepare(
        'INSERT INTO item_dependencies (item_id, depends_on_id, created_at) VALUES (?, ?, ?)',
      ).bind(id, depId, timestamp),
    )
    await c.env.DB.batch(statements)
  }
  return c.json({ ok: true, count: dependencies.length })
})

app.get('/goals', async (c) => {
  const period = c.req.query('period')
  const status = c.req.query('status')
  const params = []
  let sql = 'SELECT * FROM goals WHERE 1 = 1'
  if (period && goalPeriods.has(period)) {
    sql += ' AND period = ?'
    params.push(period)
  }
  if (status && goalStatus.has(status)) {
    sql += ' AND status = ?'
    params.push(status)
  }
  sql += ' ORDER BY priority DESC, created_at DESC'
  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(result.results.map(toGoal))
})

app.post('/goals', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  if (!title) {
    return c.json({ error: 'title is required' }, 400)
  }
  const id = crypto.randomUUID()
  const period = normalizeGoalPeriod(payload.period)
  const status = normalizeGoalStatus(payload.status)
  const priority = Number(payload.priority ?? 0)
  const startDate = typeof payload.start_date === 'string' ? payload.start_date : null
  const endDate = typeof payload.end_date === 'string' ? payload.end_date : null
  const notes = typeof payload.notes === 'string' ? payload.notes : ''
  const timestamp = nowIso()
  await c.env.DB.prepare(
    `INSERT INTO goals
      (id, title, period, start_date, end_date, priority, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      title,
      period,
      startDate,
      endDate,
      priority,
      status,
      notes,
      timestamp,
      timestamp,
    )
    .run()
  return c.json({ id })
})

app.patch('/goals/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ error: 'Goal not found' }, 404)
  }
  const payload = await c.req.json().catch(() => ({}))
  const title =
    typeof payload.title === 'string' ? payload.title.trim() : existing.title
  const period = payload.period ? normalizeGoalPeriod(payload.period) : existing.period
  const status = payload.status ? normalizeGoalStatus(payload.status) : existing.status
  const priority = Number(payload.priority ?? existing.priority ?? 0)
  const startDate =
    typeof payload.start_date === 'string'
      ? payload.start_date
      : payload.start_date === null
        ? null
        : existing.start_date ?? null
  const endDate =
    typeof payload.end_date === 'string'
      ? payload.end_date
      : payload.end_date === null
        ? null
        : existing.end_date ?? null
  const notes =
    typeof payload.notes === 'string' ? payload.notes : existing.notes ?? ''
  const updatedAt = nowIso()
  await c.env.DB.prepare(
    `UPDATE goals
      SET title = ?, period = ?, start_date = ?, end_date = ?,
          priority = ?, status = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(title, period, startDate, endDate, priority, status, notes, updatedAt, id)
    .run()
  return c.json({ ok: true })
})

app.delete('/goals/:id', async (c) => {
  const id = c.req.param('id')
  const milestones = await c.env.DB.prepare('SELECT id FROM milestones WHERE goal_id = ?')
    .bind(id)
    .all()
  const milestoneIds = milestones.results.map((row) => row.id)
  if (milestoneIds.length > 0) {
    const placeholders = milestoneIds.map(() => '?').join(',')
    await c.env.DB.prepare(
      `UPDATE items SET milestone_id = NULL WHERE milestone_id IN (${placeholders})`,
    )
      .bind(...milestoneIds)
      .run()
  }
  await c.env.DB.prepare('DELETE FROM milestones WHERE goal_id = ?')
    .bind(id)
    .run()
  const result = await c.env.DB.prepare('DELETE FROM goals WHERE id = ?')
    .bind(id)
    .run()
  if (result.meta.changes === 0) {
    return c.json({ error: 'Goal not found' }, 404)
  }
  return c.json({ ok: true })
})

app.get('/milestones', async (c) => {
  const goalId = c.req.query('goal_id')
  const params = []
  let sql = 'SELECT * FROM milestones WHERE 1 = 1'
  if (goalId) {
    sql += ' AND goal_id = ?'
    params.push(goalId)
  }
  sql += ' ORDER BY priority DESC, created_at DESC'
  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(result.results.map(toMilestone))
})

app.post('/milestones', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const goalId = typeof payload.goal_id === 'string' ? payload.goal_id : ''
  if (!title || !goalId) {
    return c.json({ error: 'goal_id and title are required' }, 400)
  }
  const id = crypto.randomUUID()
  const priority = Number(payload.priority ?? 0)
  const status = normalizeGoalStatus(payload.status)
  const startDate = typeof payload.start_date === 'string' ? payload.start_date : null
  const endDate = typeof payload.end_date === 'string' ? payload.end_date : null
  const notes = typeof payload.notes === 'string' ? payload.notes : ''
  const timestamp = nowIso()
  await c.env.DB.prepare(
    `INSERT INTO milestones
      (id, goal_id, title, start_date, end_date, priority, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      goalId,
      title,
      startDate,
      endDate,
      priority,
      status,
      notes,
      timestamp,
      timestamp,
    )
    .run()
  return c.json({ id })
})

app.patch('/milestones/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT * FROM milestones WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ error: 'Milestone not found' }, 404)
  }
  const payload = await c.req.json().catch(() => ({}))
  const title =
    typeof payload.title === 'string' ? payload.title.trim() : existing.title
  const priority = Number(payload.priority ?? existing.priority ?? 0)
  const status = payload.status ? normalizeGoalStatus(payload.status) : existing.status
  const startDate =
    typeof payload.start_date === 'string'
      ? payload.start_date
      : payload.start_date === null
        ? null
        : existing.start_date ?? null
  const endDate =
    typeof payload.end_date === 'string'
      ? payload.end_date
      : payload.end_date === null
        ? null
        : existing.end_date ?? null
  const notes =
    typeof payload.notes === 'string' ? payload.notes : existing.notes ?? ''
  const updatedAt = nowIso()
  await c.env.DB.prepare(
    `UPDATE milestones
      SET title = ?, start_date = ?, end_date = ?,
          priority = ?, status = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(title, startDate, endDate, priority, status, notes, updatedAt, id)
    .run()
  return c.json({ ok: true })
})

app.delete('/milestones/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE items SET milestone_id = NULL WHERE milestone_id = ?')
    .bind(id)
    .run()
  const result = await c.env.DB.prepare('DELETE FROM milestones WHERE id = ?')
    .bind(id)
    .run()
  if (result.meta.changes === 0) {
    return c.json({ error: 'Milestone not found' }, 404)
  }
  return c.json({ ok: true })
})

app.get('/logs', async (c) => {
  const itemId = c.req.query('item_id')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const limitRaw = Number(c.req.query('limit') ?? 100)
  const safeLimit = Number.isFinite(limitRaw) ? limitRaw : 100
  const limit = Math.min(Math.max(safeLimit, 1), 500)
  const params = []
  let sql = 'SELECT * FROM logs WHERE 1 = 1'

  if (itemId) {
    sql += ' AND item_id = ?'
    params.push(itemId)
  }
  if (start) {
    sql += ' AND date >= ?'
    params.push(start)
  }
  if (end) {
    sql += ' AND date <= ?'
    params.push(end)
  }

  sql += ' ORDER BY date DESC, created_at DESC LIMIT ?'
  params.push(limit)

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(result.results.map(toLog))
})

app.get('/logs/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM logs WHERE id = ?')
    .bind(id)
    .first()
  if (!row) {
    return c.json({ error: 'Log not found' }, 404)
  }
  return c.json(toLog(row))
})

app.post('/logs', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  const itemId = payload.item_id
  const date = payload.date
  if (!itemId || !date) {
    return c.json({ error: 'item_id and date are required' }, 400)
  }

  const id = crypto.randomUUID()
  const value = Number(payload.value ?? 1)
  const note = typeof payload.note === 'string' ? payload.note : ''
  const timestamp = nowIso()

  await c.env.DB.prepare(
    `INSERT INTO logs
      (id, item_id, date, value, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, itemId, date, value, note, timestamp, timestamp)
    .run()

  return c.json({ id })
})

app.delete('/logs/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare('DELETE FROM logs WHERE id = ?')
    .bind(id)
    .run()
  if (result.meta.changes === 0) {
    return c.json({ error: 'Log not found' }, 404)
  }
  return c.json({ ok: true })
})

app.get('/pomodoro', async (c) => {
  const itemId = c.req.query('item_id')
  const start = normalizeDateBound(c.req.query('start'), false)
  const end = normalizeDateBound(c.req.query('end'), true)
  const limitRaw = Number(c.req.query('limit') ?? 100)
  const safeLimit = Number.isFinite(limitRaw) ? limitRaw : 100
  const limit = Math.min(Math.max(safeLimit, 1), 500)
  const params = []
  let sql = 'SELECT * FROM pomodoro_sessions WHERE 1 = 1'

  if (itemId) {
    sql += ' AND item_id = ?'
    params.push(itemId)
  }
  if (start) {
    sql += ' AND started_at >= ?'
    params.push(start)
  }
  if (end) {
    sql += ' AND started_at <= ?'
    params.push(end)
  }

  sql += ' ORDER BY started_at DESC LIMIT ?'
  params.push(limit)

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(result.results)
})

app.post('/pomodoro', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  const duration = Number(payload.duration_seconds ?? 0)
  if (!Number.isFinite(duration) || duration <= 0) {
    return c.json({ error: 'duration_seconds is required' }, 400)
  }
  const id = crypto.randomUUID()
  const mode = normalizePomodoroMode(payload.mode)
  const status = normalizePomodoroStatus(payload.status)
  const startedAt = typeof payload.started_at === 'string' ? payload.started_at : nowIso()
  const endedAt =
    typeof payload.ended_at === 'string'
      ? payload.ended_at
      : status === 'completed' || status === 'canceled'
        ? nowIso()
        : null
  const itemId = typeof payload.item_id === 'string' ? payload.item_id : null
  const note = typeof payload.note === 'string' ? payload.note : ''
  const createdAt = nowIso()

  await c.env.DB.prepare(
    `INSERT INTO pomodoro_sessions
      (id, item_id, mode, duration_seconds, started_at, ended_at, status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      itemId,
      mode,
      duration,
      startedAt,
      endedAt,
      status,
      note,
      createdAt,
    )
    .run()

  return c.json({ id })
})

app.get('/settings', async (c) => {
  const result = await c.env.DB.prepare('SELECT key, value FROM settings').all()
  const data = {}
  result.results.forEach((row) => {
    data[row.key] = row.value
  })
  return c.json(data)
})

app.put('/settings', async (c) => {
  const payload = await c.req.json().catch(() => ({}))
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return c.json({ error: 'invalid payload' }, 400)
  }
  const entries = Object.entries(payload)
  if (entries.length === 0) {
    return c.json({ ok: true, updated: 0 })
  }
  const timestamp = nowIso()
  const statements = entries.map(([key, value]) =>
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
    ).bind(key, String(value), timestamp),
  )
  await c.env.DB.batch(statements)
  return c.json({ ok: true, updated: entries.length })
})

const rewriteApiRequest = (request: Request) => {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api')) {
    const nextPath = url.pathname.replace(/^\/api(\/|$)/, '/')
    url.pathname = nextPath || '/'
  }
  return new Request(url.toString(), request)
}

export const onRequest = (context: {
  request: Request
  env: Record<string, unknown>
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException?: () => void
}) => app.fetch(rewriteApiRequest(context.request), context.env, context)

export default app
