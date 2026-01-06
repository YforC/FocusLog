<template>
  <section class="page PlanPage">
    <div class="PlanHeader">
      <h1>周期规划</h1>
      <p>设定周/月目标，拆解里程碑，并自动生成周报与复盘。</p>
    </div>

    <div v-if="loading" class="Empty">加载中...</div>
    <div v-else class="PlanContent">
      <div v-if="error" class="PlanError">{{ error }}</div>
      <div class="PlanTabs">
        <button
          v-for="tab in sectionTabs"
          :key="tab.key"
          class="PlanTabs__Button"
          :class="{ 'PlanTabs__Button--active': activeSection === tab.key }"
          type="button"
          @click="activeSection = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="PlanSection" v-show="activeSection === 'goals'">
        <h2>目标与周期规划</h2>
        <div class="GoalBoard">
          <div v-for="section in goalSections" :key="section.key" class="GoalSection">
            <div class="GoalSection__Header">
              <div>
                <h3>{{ section.title }}</h3>
                <span v-if="section.range" class="GoalSection__Range">{{ section.range }}</span>
              </div>
              <span class="GoalSection__Hint">按优先级排序</span>
            </div>
            <ul class="GoalList">
              <li v-if="section.goals.length === 0" class="GoalEmpty">暂无目标</li>
              <li
                v-for="goal in section.goals"
                :key="goal.id"
                class="GoalCard"
                :class="`GoalCard--${goal.status}`"
              >
                <div class="GoalCard__Title">{{ goal.title }}</div>
                <div class="GoalCard__Meta">
                  <span class="StatusPill" :class="statusPillClass(goal.status)">
                    {{ statusLabel(goal.status) }}
                  </span>
                  <span>优先级：{{ priorityLabel(goal.priority) }}</span>
                </div>
                <div class="GoalCard__Actions">
                  <button type="button" @click="setGoalStatus(goal, 'completed')">完成</button>
                  <button type="button" @click="setGoalStatus(goal, 'archived')">归档</button>
                  <button type="button" class="danger" @click="removeGoal(goal)">删除</button>
                </div>
              </li>
            </ul>
            <div class="GoalForm">
              <input
                v-model="newGoalTitle[section.key]"
                class="TextBox"
                type="text"
                :placeholder="`新增${section.title}`"
              />
              <select v-model.number="newGoalPriority[section.key]" class="SelectBox">
                <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                  优先级：{{ option.label }}
                </option>
              </select>
              <button type="button" class="PrimaryButton" @click="createGoalForPeriod(section.key)">
                添加目标
              </button>
            </div>
          </div>
        </div>
        <div v-if="completedGoals.length > 0" class="GoalArchiveBlock">
          <div class="GoalArchiveBlock__Header">已完成目标（{{ completedGoals.length }}）</div>
          <ul class="GoalList GoalList--compact">
            <li
              v-for="goal in completedGoals"
              :key="goal.id"
              class="GoalCard GoalCard--compact"
              :class="`GoalCard--${goal.status}`"
            >
              <div class="GoalCard__Title">{{ goal.title }}</div>
              <div class="GoalCard__Meta">
                <span class="StatusPill" :class="statusPillClass(goal.status)">
                  {{ statusLabel(goal.status) }}
                </span>
                <span>优先级：{{ priorityLabel(goal.priority) }}</span>
              </div>
              <div class="GoalCard__Actions">
                <button type="button" @click="setGoalStatus(goal, 'active')">恢复</button>
                <button type="button" @click="setGoalStatus(goal, 'archived')">归档</button>
              </div>
            </li>
          </ul>
        </div>
        <div v-if="archivedGoals.length > 0" class="GoalArchiveBlock">
          <div class="GoalArchiveBlock__Header">已归档目标（{{ archivedGoals.length }}）</div>
          <ul class="GoalList GoalList--compact">
            <li
              v-for="goal in archivedGoals"
              :key="goal.id"
              class="GoalCard GoalCard--compact"
              :class="`GoalCard--${goal.status}`"
            >
              <div class="GoalCard__Title">{{ goal.title }}</div>
              <div class="GoalCard__Meta">
                <span class="StatusPill" :class="statusPillClass(goal.status)">
                  {{ statusLabel(goal.status) }}
                </span>
                <span>优先级：{{ priorityLabel(goal.priority) }}</span>
              </div>
              <div class="GoalCard__Actions">
                <button type="button" @click="setGoalStatus(goal, 'active')">恢复</button>
                <button type="button" class="danger" @click="removeGoal(goal)">删除</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="PlanSection" v-show="activeSection === 'milestones'">
        <h2>里程碑与任务分层</h2>
        <div v-if="activeGoals.length === 0" class="PlanHint">
          请先在上方创建周/月/长期目标，再拆解里程碑与今日任务。
        </div>
        <div class="MilestoneBoard">
          <div v-for="goal in activeGoals" :key="goal.id" class="MilestoneGroup">
            <div class="MilestoneGroup__Header">
              <div>
                <h3>{{ goal.title }}</h3>
                <span class="MilestoneGroup__Meta">
                  {{ periodLabel(goal.period) }} · 优先级：{{ priorityLabel(goal.priority) }}
                </span>
              </div>
              <div class="MilestoneGroup__Actions">
                <button type="button" @click="setGoalStatus(goal, 'completed')">完成</button>
                <button type="button" @click="setGoalStatus(goal, 'archived')">归档</button>
              </div>
            </div>

            <div class="MilestoneList">
              <div
                v-for="milestone in activeMilestonesByGoal[goal.id] ?? []"
                :key="milestone.id"
                class="MilestoneCard"
              >
                <div class="MilestoneCard__Header">
                  <div>
                    <div class="MilestoneCard__Title">{{ milestone.title }}</div>
                    <div class="MilestoneCard__Meta">
                      优先级：{{ priorityLabel(milestone.priority) }}
                    </div>
                  </div>
                  <div class="MilestoneCard__Actions">
                    <button type="button" @click="setMilestoneStatus(milestone, 'completed')">
                      完成
                    </button>
                    <button type="button" class="danger" @click="removeMilestone(milestone)">
                      删除
                    </button>
                  </div>
                </div>

                <ul class="TaskList">
                  <li
                    v-for="item in itemsByMilestone[milestone.id] ?? []"
                    :key="item.id"
                    class="TaskItem"
                  >
                    <div>
                      <div class="TaskItem__Title">{{ item.title }}</div>
                      <div class="TaskItem__Meta">
                        <span>优先级：{{ priorityLabel(item.priority) }}</span>
                        <span v-if="item.created_at">创建：{{ item.created_at.slice(0, 10) }}</span>
                      </div>
                    </div>
                    <div class="TaskItem__Actions">
                      <button type="button" @click="openDependencyEditor(item, milestone.id)">
                        依赖
                      </button>
                      <button type="button" class="danger" @click="removeTask(item)">删除</button>
                    </div>
                    <div
                      v-if="dependencyEditingId === item.id"
                      class="DependencyEditor"
                    >
                      <div class="DependencyEditor__Title">选择依赖任务</div>
                      <div v-if="dependencyOptions.length === 0" class="DependencyEditor__Empty">
                        暂无可选任务
                      </div>
                      <label
                        v-for="option in dependencyOptions"
                        :key="option.id"
                        class="DependencyEditor__Option"
                      >
                        <input
                          type="checkbox"
                          :value="option.id"
                          v-model="dependencySelections[item.id]"
                        />
                        <span>{{ option.title }}</span>
                      </label>
                      <div class="DependencyEditor__Actions">
                        <button type="button" class="PrimaryButton" @click="saveDependencies(item)">
                          保存
                        </button>
                        <button type="button" @click="closeDependencyEditor">取消</button>
                      </div>
                    </div>
                  </li>
                </ul>

                <div class="TaskForm">
                  <input
                    v-model="newTaskTitle[milestone.id]"
                    class="TextBox"
                    type="text"
                    placeholder="新增今日任务"
                  />
                  <select v-model.number="newTaskPriority[milestone.id]" class="SelectBox">
                    <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                      优先级：{{ option.label }}
                    </option>
                  </select>
                  <div class="TaskForm__Dependencies">
                    <span class="TaskForm__Label">任务依赖</span>
                    <label
                      v-for="option in taskOptionsForMilestone(milestone.id)"
                      :key="option.id"
                      class="TaskForm__Option"
                    >
                      <input
                        type="checkbox"
                        :value="option.id"
                        v-model="newTaskDependencies[milestone.id]"
                      />
                      <span>{{ option.title }}</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    class="PrimaryButton"
                    @click="createTaskForMilestone(milestone)"
                  >
                    添加任务
                  </button>
                </div>
              </div>

              <div
                v-if="(completedMilestonesByGoal[goal.id] ?? []).length > 0"
                class="MilestoneCompact"
              >
                <div class="MilestoneCompact__Header">
                  已完成里程碑（{{ completedMilestonesByGoal[goal.id].length }}）
                </div>
                <ul class="MilestoneCompact__List">
                  <li
                    v-for="milestone in completedMilestonesByGoal[goal.id]"
                    :key="milestone.id"
                    class="MilestoneCompact__Item"
                    :class="`MilestoneCompact__Item--${milestone.status}`"
                  >
                    <span>{{ milestone.title }}</span>
                    <div class="MilestoneCompact__Actions">
                      <button type="button" @click="setMilestoneStatus(milestone, 'active')">
                        恢复
                      </button>
                      <button type="button" @click="setMilestoneStatus(milestone, 'archived')">
                        归档
                      </button>
                    </div>
                  </li>
                </ul>
              </div>

              <div
                v-if="(archivedMilestonesByGoal[goal.id] ?? []).length > 0"
                class="MilestoneCompact"
              >
                <div class="MilestoneCompact__Header">
                  已归档里程碑（{{ archivedMilestonesByGoal[goal.id].length }}）
                </div>
                <ul class="MilestoneCompact__List">
                  <li
                    v-for="milestone in archivedMilestonesByGoal[goal.id]"
                    :key="milestone.id"
                    class="MilestoneCompact__Item"
                    :class="`MilestoneCompact__Item--${milestone.status}`"
                  >
                    <span>{{ milestone.title }}</span>
                  <div class="MilestoneCompact__Actions">
                    <button type="button" @click="setMilestoneStatus(milestone, 'active')">
                      恢复
                    </button>
                    <button type="button" class="danger" @click="removeMilestone(milestone)">
                      删除
                    </button>
                  </div>
                </li>
              </ul>
            </div>

              <div class="MilestoneCreate">
                <input
                  v-model="newMilestoneTitle[goal.id]"
                  class="TextBox"
                  type="text"
                  placeholder="新增里程碑"
                />
                <select v-model.number="newMilestonePriority[goal.id]" class="SelectBox">
                  <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                    优先级：{{ option.label }}
                  </option>
                </select>
                <button type="button" class="PrimaryButton" @click="createMilestoneForGoal(goal)">
                  添加里程碑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="PlanSection" v-show="activeSection === 'report'">
        <h2>本周自动周报</h2>
        <div class="WeekReport">
          <div class="WeekReport__Header">
            <div>
              <div class="WeekReport__Title">汇总范围</div>
              <div class="WeekReport__Range">{{ weekRangeText }}</div>
            </div>
            <div class="WeekReport__Rate">{{ weekStats.completionRate }}%</div>
          </div>
          <div class="WeekReport__Stats">
            <div class="WeekReport__Stat">
              <div class="WeekReport__Label">计划数</div>
              <div class="WeekReport__Value">{{ weekStats.totalItems }}</div>
            </div>
            <div class="WeekReport__Stat">
              <div class="WeekReport__Label">完成数</div>
              <div class="WeekReport__Value">{{ weekStats.completedItems }}</div>
            </div>
            <div class="WeekReport__Stat">
              <div class="WeekReport__Label">执行次数</div>
              <div class="WeekReport__Value">{{ weekStats.executionCount }}</div>
            </div>
            <div class="WeekReport__Stat">
              <div class="WeekReport__Label">学习时长</div>
              <div class="WeekReport__Value">{{ formatMinutes(weekStats.studyMinutes) }}</div>
            </div>
          </div>
          <div class="WeekReport__Archive">
            <div class="WeekReport__Label">归档任务（本周）</div>
            <div v-if="weekStats.archived.totalItems === 0" class="WeekReport__Empty">
              本周暂无归档任务记录
            </div>
            <div v-else class="WeekReport__ArchiveGrid">
              <div class="WeekReport__Stat WeekReport__Stat--muted">
                <div class="WeekReport__Label">归档计划</div>
                <div class="WeekReport__Value">{{ weekStats.archived.totalItems }}</div>
              </div>
              <div class="WeekReport__Stat WeekReport__Stat--muted">
                <div class="WeekReport__Label">完成率</div>
                <div class="WeekReport__Value">{{ weekStats.archived.completionRate }}%</div>
              </div>
              <div class="WeekReport__Stat WeekReport__Stat--muted">
                <div class="WeekReport__Label">执行次数</div>
                <div class="WeekReport__Value">{{ weekStats.archived.executionCount }}</div>
              </div>
              <div class="WeekReport__Stat WeekReport__Stat--muted">
                <div class="WeekReport__Label">学习时长</div>
                <div class="WeekReport__Value">
                  {{ formatMinutes(weekStats.archived.studyMinutes) }}
                </div>
              </div>
            </div>
          </div>
          <div class="WeekReport__Top">
            <div class="WeekReport__Label">高频任务</div>
            <div v-if="weekStats.topItems.length === 0" class="WeekReport__Empty">
              暂无高频记录
            </div>
            <div v-else class="WeekReport__Tags">
              <span v-for="item in weekStats.topItems" :key="item.id" class="WeekReport__Tag">
                {{ item.title }}
              </span>
            </div>
          </div>
          <div class="WeekReport__Days">
            <div class="WeekReport__Label">每日完成</div>
            <div v-if="weekDailyStats.length === 0" class="WeekReport__Empty">
              本周暂无日计划
            </div>
            <ul v-else class="WeekReport__DayList">
              <li v-for="day in weekDailyStats" :key="day.date" class="WeekReport__DayItem">
                <span>{{ day.date }}</span>
                <span>{{ day.completed }}/{{ day.total }} ({{ day.rate }}%)</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="WeekMilestone">
          <div class="WeekMilestone__Header">
            <div>
              <h3>里程碑完成率</h3>
              <span>本周计划任务统计</span>
            </div>
            <span class="WeekMilestone__Hint">按完成率与学习时长排序</span>
          </div>
          <div v-if="weekMilestoneStats.length === 0" class="WeekReport__Empty">
            本周暂无里程碑任务
          </div>
          <ul v-else class="WeekMilestone__List">
            <li v-for="stat in weekMilestoneStats" :key="stat.id" class="WeekMilestone__Item">
              <div class="WeekMilestone__Row">
                <div class="WeekMilestone__Title">
                  <span>{{ stat.title }}</span>
                  <span
                    v-if="stat.id !== 'unbound'"
                    class="StatusPill"
                    :class="statusPillClass(stat.status)"
                  >
                    {{ statusLabel(stat.status) }}
                  </span>
                </div>
                <div class="WeekMilestone__Meta">
                  <span>{{ stat.completed }}/{{ stat.total }}</span>
                  <span>{{ stat.completionRate }}%</span>
                  <span>{{ formatMinutes(stat.studyMinutes) }}</span>
                </div>
              </div>
              <div class="WeekMilestone__Bar">
                <span
                  class="WeekMilestone__Fill"
                  :style="{ width: `${stat.completionRate}%` }"
                ></span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="PlanSection" v-show="activeSection === 'health'">
        <h2>目标健康度</h2>
        <div class="HealthCard">
          <div class="HealthCard__Score">
            <span class="HealthCard__Value">{{ healthStats.score }}</span>
            <span class="HealthCard__Label">可持续性评分</span>
          </div>
          <div class="HealthCard__Meta">
            <div>
              完成率：{{ healthStats.completionRate }}%
            </div>
            <div>
              稳定度：{{ healthStats.stability }}%
            </div>
            <div>
              连续打卡：{{ healthStats.streakDays }} 天
            </div>
          </div>
          <div class="HealthCard__Bars">
            <div class="HealthBar">
              <span>完成率</span>
              <span class="HealthBar__Track">
                <span class="HealthBar__Fill" :style="{ width: `${healthStats.completionRate}%` }"></span>
              </span>
            </div>
            <div class="HealthBar">
              <span>稳定度</span>
              <span class="HealthBar__Track">
                <span class="HealthBar__Fill" :style="{ width: `${healthStats.stability}%` }"></span>
              </span>
            </div>
            <div class="HealthBar">
              <span>连击</span>
              <span class="HealthBar__Track">
                <span class="HealthBar__Fill" :style="{ width: `${healthStats.streakScore}%` }"></span>
              </span>
            </div>
          </div>
          <p class="HealthCard__Hint">
            基于近 {{ healthStats.rangeDays }} 天完成率、波动性与连续打卡计算。
          </p>
        </div>
      </div>

      <div class="PlanSection" v-show="activeSection === 'review'">
        <h2>复盘与提醒</h2>
        <div class="PlanSplit">
          <div class="ReviewPanel">
            <h3>本周周报摘要</h3>
            <div class="ReviewPanel__Range">{{ weekRangeText }}</div>
            <div class="ReviewPanel__Summary">
              <div class="ReviewPanel__Item">
                完成率：{{ weekStats.completionRate }}%（{{ weekStats.completedItems }}/{{ weekStats.totalItems }}）
              </div>
              <div class="ReviewPanel__Item">学习时长：{{ formatMinutes(weekStats.studyMinutes) }}</div>
              <div class="ReviewPanel__Item">执行次数：{{ weekStats.executionCount }}</div>
              <div class="ReviewPanel__Item">健康度评分：{{ healthStats.score }}</div>
              <div v-if="weekTopItemsText" class="ReviewPanel__Item">
                高频任务：{{ weekTopItemsText }}
              </div>
            </div>
            <button type="button" class="PrimaryButton" @click="exportWeeklyReview">
              保存为文件
            </button>
            <span v-if="reviewSaved" class="ReviewPanel__Saved">已下载</span>
            <span class="ReviewPanel__Hint">导出内容仅包含本周周报摘要</span>
          </div>

          <div class="ReminderPanel">
            <h3>智能提醒设置</h3>
            <div class="ReminderPanel__Row">
              <label>
                <input type="checkbox" v-model="reminderForm.unfinishedEnabled" />
                未完成任务提醒
              </label>
              <div class="ReminderPanel__Controls">
                <input v-model="reminderForm.unfinishedTime" type="time" class="SelectBox" />
              </div>
            </div>
            <div class="ReminderPanel__Row">
              <label>
                <input type="checkbox" v-model="reminderForm.pomodoroEnabled" />
                番茄中断提醒（分钟）
              </label>
              <div class="ReminderPanel__Controls">
                <input
                  v-model.number="reminderForm.pomodoroMinutes"
                  type="number"
                  min="1"
                  class="SelectBox"
                />
              </div>
            </div>
            <div class="ReminderPanel__Row">
              <label>
                <input type="checkbox" v-model="reminderForm.studyEnabled" />
                学习时段提醒
              </label>
              <div class="ReminderPanel__Controls">
                <div class="ReminderPanel__Range">
                  <input v-model="reminderForm.studyStart" type="time" class="SelectBox" />
                  <span class="ReminderPanel__Divider">~</span>
                  <input v-model="reminderForm.studyEnd" type="time" class="SelectBox" />
                </div>
              </div>
            </div>
            <div class="ReminderPanel__Row">
              <label>
                <input type="checkbox" v-model="reminderForm.systemEnabled" />
                系统通知
              </label>
              <div class="ReminderPanel__Controls">
                <button type="button" class="MiniButton" @click="requestNotificationPermission">
                  请求授权
                </button>
                <span class="ReminderPanel__Hint">{{ notificationStatus }}</span>
              </div>
            </div>
            <button type="button" class="PrimaryButton" @click="saveReminderSettings">
              保存提醒
            </button>
            <span v-if="reminderSaved" class="ReviewPanel__Saved">已保存</span>
          </div>

        </div>
      </div>

      <div class="PlanSection" v-show="activeSection === 'archive'">
        <h2>归档与历史</h2>
        <div class="ArchiveSummary">
          <div class="ArchiveCard">
            <div class="ArchiveCard__Label">归档目标</div>
            <div class="ArchiveCard__Value">{{ archivedGoals.length }}</div>
            <div class="ArchiveCard__Hint">周/月/长期目标归档</div>
          </div>
          <div class="ArchiveCard">
            <div class="ArchiveCard__Label">归档里程碑</div>
            <div class="ArchiveCard__Value">{{ archivedMilestones.length }}</div>
            <div class="ArchiveCard__Hint">阶段性拆解已归档</div>
          </div>
          <div class="ArchiveCard">
            <div class="ArchiveCard__Label">归档任务</div>
            <div class="ArchiveCard__Value">{{ archivedItemsCount }}</div>
            <div class="ArchiveCard__Hint">来自归档里程碑</div>
          </div>
        </div>

        <div class="ArchiveStats">
          <div class="ArchiveStats__Header">
            <span>本周归档任务统计</span>
            <span class="ArchiveStats__Hint">归档任务不计入周报与健康度</span>
          </div>
          <div v-if="weekStats.archived.totalItems === 0" class="ArchiveStats__Empty">
            本周暂无归档任务记录
          </div>
          <div v-else class="ArchiveStats__Grid">
            <div class="ArchiveStats__Item">
              <div class="ArchiveStats__Label">归档计划</div>
              <div class="ArchiveStats__Value">{{ weekStats.archived.totalItems }}</div>
            </div>
            <div class="ArchiveStats__Item">
              <div class="ArchiveStats__Label">完成率</div>
              <div class="ArchiveStats__Value">{{ weekStats.archived.completionRate }}%</div>
            </div>
            <div class="ArchiveStats__Item">
              <div class="ArchiveStats__Label">执行次数</div>
              <div class="ArchiveStats__Value">{{ weekStats.archived.executionCount }}</div>
            </div>
            <div class="ArchiveStats__Item">
              <div class="ArchiveStats__Label">学习时长</div>
              <div class="ArchiveStats__Value">
                {{ formatMinutes(weekStats.archived.studyMinutes) }}
              </div>
            </div>
          </div>
        </div>

        <div class="ArchiveList">
          <div class="ArchiveBlock">
            <div class="ArchiveBlock__Header">
              <h3>已归档目标</h3>
              <span>{{ archivedGoals.length }} 个</span>
            </div>
            <div v-if="archivedGoals.length === 0" class="ArchiveEmpty">暂无归档目标</div>
            <ul v-else class="ArchiveItems">
              <li v-for="goal in archivedGoals" :key="goal.id" class="ArchiveItem">
                <div>
                  <div class="ArchiveItem__Title">{{ goal.title }}</div>
                  <div class="ArchiveItem__Meta">
                    <span>{{ periodLabel(goal.period) }}</span>
                    <span>优先级：{{ priorityLabel(goal.priority) }}</span>
                  </div>
                </div>
                <div class="ArchiveItem__Actions">
                  <span class="StatusPill StatusPill--archived">已归档</span>
                  <button type="button" @click="setGoalStatus(goal, 'active')">恢复</button>
                  <button type="button" class="danger" @click="removeGoal(goal)">删除</button>
                </div>
              </li>
            </ul>
          </div>

          <div class="ArchiveBlock">
            <div class="ArchiveBlock__Header">
              <h3>已归档里程碑</h3>
              <span>{{ archivedMilestones.length }} 个</span>
            </div>
            <div v-if="archivedMilestones.length === 0" class="ArchiveEmpty">
              暂无归档里程碑
            </div>
            <ul v-else class="ArchiveItems">
              <li v-for="milestone in archivedMilestones" :key="milestone.id" class="ArchiveItem">
                <div>
                  <div class="ArchiveItem__Title">{{ milestone.title }}</div>
                  <div class="ArchiveItem__Meta">
                    <span>目标：{{ goalTitleById[milestone.goal_id] || '未绑定目标' }}</span>
                    <span>任务数：{{ milestoneTaskCount(milestone.id) }}</span>
                  </div>
                </div>
                <div class="ArchiveItem__Actions">
                  <span class="StatusPill StatusPill--archived">已归档</span>
                  <button type="button" @click="setMilestoneStatus(milestone, 'active')">
                    恢复
                  </button>
                  <button type="button" class="danger" @click="removeMilestone(milestone)">
                    删除
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createGoal, deleteGoal, listGoals, updateGoal, type Goal } from '../services/goals'
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
  updateMilestone,
  type Milestone,
} from '../services/milestones'
import { createItem, deleteItem, listItems, type Item } from '../services/items'
import { listLogs, type Log } from '../services/logs'
import { listPomodoroSessions, type PomodoroSession } from '../services/pomodoro'
import { listItemDependencies, saveItemDependencies } from '../services/dependencies'
import { getSettings, saveSettings } from '../services/settings'

type GoalPeriod = Goal['period']
type PlanSectionKey = 'goals' | 'milestones' | 'report' | 'health' | 'review' | 'archive'

const goals = ref<Goal[]>([])
const milestones = ref<Milestone[]>([])
const items = ref<Item[]>([])
const logs = ref<Log[]>([])
const sessions = ref<PomodoroSession[]>([])
const loading = ref(true)
const error = ref('')
const activeSection = ref<PlanSectionKey>('goals')

const sectionTabs: { key: PlanSectionKey; label: string }[] = [
  { key: 'goals', label: '目标' },
  { key: 'milestones', label: '里程碑' },
  { key: 'report', label: '周报' },
  { key: 'health', label: '健康度' },
  { key: 'review', label: '复盘/提醒' },
  { key: 'archive', label: '归档' },
]

const baseDate = ref(new Date())
const healthRangeDays = 14

const newGoalTitle = reactive<Record<GoalPeriod, string>>({
  longterm: '',
  weekly: '',
  monthly: '',
})
const newGoalPriority = reactive<Record<GoalPeriod, number>>({
  longterm: 0,
  weekly: 0,
  monthly: 0,
})

const newMilestoneTitle = reactive<Record<string, string>>({})
const newMilestonePriority = reactive<Record<string, number>>({})

const newTaskTitle = reactive<Record<string, string>>({})
const newTaskPriority = reactive<Record<string, number>>({})
const newTaskDependencies = reactive<Record<string, string[]>>({})

const dependencySelections = reactive<Record<string, string[]>>({})
const dependencyEditingId = ref('')
const dependencyMilestoneId = ref('')

const reviewSaved = ref(false)

const reminderForm = reactive({
  unfinishedEnabled: true,
  unfinishedTime: '21:00',
  pomodoroEnabled: true,
  pomodoroMinutes: 10,
  studyEnabled: false,
  studyStart: '09:00',
  studyEnd: '11:00',
  systemEnabled: false,
})
const reminderSaved = ref(false)

const priorityOptions = [
  { value: 0, label: '普通' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
]

const toMessage = (value: unknown) =>
  value instanceof Error ? value.message : String(value)

const formatApiError = (value: unknown) => {
  const message = toMessage(value)
  if (message.includes('no such table') || message.includes('no such column')) {
    return `${message}。请先执行 D1 迁移后再重试。`
  }
  return message
}

const setError = (value: unknown) => {
  error.value = formatApiError(value)
}

const formatDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const startOfWeek = (date: Date) => {
  const day = date.getDay() === 0 ? 7 : date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day + 1)
  return start
}

const getWeekRange = (date: Date) => {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: formatDate(start), end: formatDate(end) }
}

const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start: formatDate(start), end: formatDate(end) }
}

const getRangeByDays = (days: number) => {
  const end = formatDate(baseDate.value)
  const startDate = new Date(baseDate.value)
  startDate.setDate(startDate.getDate() - (days - 1))
  return { start: formatDate(startDate), end }
}

const buildDateList = (start: string, end: string) => {
  const dates: string[] = []
  const cursor = new Date(start)
  const endDate = new Date(end)
  while (cursor <= endDate) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const weekRange = computed(() => getWeekRange(baseDate.value))
const monthRange = computed(() => getMonthRange(baseDate.value))
const healthRange = computed(() => getRangeByDays(healthRangeDays))

const weekRangeText = computed(() => `${weekRange.value.start} ~ ${weekRange.value.end}`)

const priorityLabel = (value?: number | null) => {
  const option = priorityOptions.find((item) => item.value === Number(value ?? 0))
  return option ? option.label : '普通'
}

const statusLabel = (status: Goal['status']) => {
  if (status === 'completed') return '已完成'
  if (status === 'archived') return '已归档'
  return '进行中'
}

const statusPillClass = (status: Goal['status']) => ({
  'StatusPill--active': status === 'active',
  'StatusPill--completed': status === 'completed',
  'StatusPill--archived': status === 'archived',
})

const periodLabel = (period: GoalPeriod) => {
  if (period === 'weekly') return '周目标'
  if (period === 'monthly') return '月目标'
  return '长期目标'
}

const matchesRange = (goal: Goal, range: { start: string; end: string }) => {
  if (!goal.start_date || !goal.end_date) return true
  return goal.start_date === range.start && goal.end_date === range.end
}

const activeGoals = computed(() =>
  [...goals.value]
    .filter((goal) => goal.status === 'active')
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
)

const completedGoals = computed(() =>
  [...goals.value]
    .filter((goal) => goal.status === 'completed')
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
)

const archivedGoals = computed(() =>
  [...goals.value]
    .filter((goal) => goal.status === 'archived')
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
)

const goalTitleById = computed(() => {
  const map: Record<string, string> = {}
  goals.value.forEach((goal) => {
    map[goal.id] = goal.title
  })
  return map
})

const goalSections = computed(() => [
  {
    key: 'longterm' as GoalPeriod,
    title: '长期目标',
    range: '',
    goals: activeGoals.value.filter((goal) => goal.period === 'longterm'),
  },
  {
    key: 'weekly' as GoalPeriod,
    title: '本周目标',
    range: weekRangeText.value,
    goals: activeGoals.value.filter(
      (goal) => goal.period === 'weekly' && matchesRange(goal, weekRange.value),
    ),
  },
  {
    key: 'monthly' as GoalPeriod,
    title: '本月目标',
    range: `${monthRange.value.start} ~ ${monthRange.value.end}`,
    goals: activeGoals.value.filter(
      (goal) => goal.period === 'monthly' && matchesRange(goal, monthRange.value),
    ),
  },
])

const buildMilestoneMap = (filter: (milestone: Milestone) => boolean) => {
  const map: Record<string, Milestone[]> = {}
  milestones.value.filter(filter).forEach((milestone) => {
    if (!map[milestone.goal_id]) {
      map[milestone.goal_id] = []
    }
    map[milestone.goal_id].push(milestone)
  })
  Object.values(map).forEach((list) =>
    list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
  )
  return map
}

const activeMilestonesByGoal = computed(() =>
  buildMilestoneMap((milestone) => milestone.status === 'active'),
)

const completedMilestonesByGoal = computed(() =>
  buildMilestoneMap((milestone) => milestone.status === 'completed'),
)

const archivedMilestonesByGoal = computed(() =>
  buildMilestoneMap((milestone) => milestone.status === 'archived'),
)

const archivedMilestones = computed(() =>
  milestones.value.filter((milestone) => milestone.status === 'archived'),
)

const archivedMilestoneIds = computed(
  () => new Set(archivedMilestones.value.map((milestone) => milestone.id)),
)

const itemsByMilestone = computed(() => {
  const map: Record<string, Item[]> = {}
  items.value.forEach((item) => {
    const milestoneId = item.milestone_id ?? ''
    if (!milestoneId) return
    if (!map[milestoneId]) {
      map[milestoneId] = []
    }
    map[milestoneId].push(item)
  })
  Object.values(map).forEach((list) =>
    list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
  )
  return map
})

const milestoneTaskCount = (milestoneId: string) =>
  itemsByMilestone.value[milestoneId]?.length ?? 0

const isArchivedItem = (item: Item) =>
  Boolean(item.archived_at) ||
  Boolean(item.milestone_id && archivedMilestoneIds.value.has(item.milestone_id))

const archivedItems = computed(() => items.value.filter((item) => isArchivedItem(item)))

const archivedItemsCount = computed(() => archivedItems.value.length)

const weekStats = computed(() => {
  const { start, end } = weekRange.value
  const itemMap = new Map(items.value.map((item) => [item.id, item]))
  const itemsInWeekAll = items.value.filter((item) => {
    const date = item.created_at?.slice(0, 10)
    return date && date >= start && date <= end
  })
  const itemsInWeek = itemsInWeekAll.filter((item) => !isArchivedItem(item))
  const archivedItemsInWeek = itemsInWeekAll.filter((item) => isArchivedItem(item))
  const activeItemIds = new Set(itemsInWeek.map((item) => item.id))
  const archivedItemIds = new Set(archivedItemsInWeek.map((item) => item.id))
  const logsInWeek = logs.value.filter(
    (log) => log.date >= start && log.date <= end && activeItemIds.has(log.item_id),
  )
  const archivedLogsInWeek = logs.value.filter(
    (log) => log.date >= start && log.date <= end && archivedItemIds.has(log.item_id),
  )
  const completedItemIds = new Set(logsInWeek.map((log) => log.item_id))
  const archivedCompletedItemIds = new Set(archivedLogsInWeek.map((log) => log.item_id))
  const focusSessions = sessions.value.filter((session) => {
    const date = session.started_at.slice(0, 10)
    const inRange = date >= start && date <= end
    if (!inRange || session.status !== 'completed' || session.mode !== 'focus') return false
    if (!session.item_id) return true
    return activeItemIds.has(session.item_id)
  })
  const archivedFocusSessions = sessions.value.filter((session) => {
    if (!session.item_id) return false
    const date = session.started_at.slice(0, 10)
    return (
      session.status === 'completed' &&
      session.mode === 'focus' &&
      date >= start &&
      date <= end &&
      archivedItemIds.has(session.item_id)
    )
  })
  const timeLogMinutes = logsInWeek.reduce((sum, log) => {
    const item = itemMap.get(log.item_id)
    if (item?.measure !== 'time') return sum
    return sum + Number(log.value || 0)
  }, 0)
  const archivedTimeLogMinutes = archivedLogsInWeek.reduce((sum, log) => {
    const item = itemMap.get(log.item_id)
    if (item?.measure !== 'time') return sum
    return sum + Number(log.value || 0)
  }, 0)
  const focusMinutes = focusSessions.reduce(
    (sum, session) => sum + session.duration_seconds / 60,
    0,
  )
  const archivedFocusMinutes = archivedFocusSessions.reduce(
    (sum, session) => sum + session.duration_seconds / 60,
    0,
  )
  const studyMinutes = timeLogMinutes + focusMinutes
  const archivedStudyMinutes = archivedTimeLogMinutes + archivedFocusMinutes
  const totalItems = itemsInWeek.length
  const completedItems = itemsInWeek.filter((item) => completedItemIds.has(item.id)).length
  const completionRate = totalItems ? Math.round((completedItems / totalItems) * 100) : 0
  const executionCount = logsInWeek.length + focusSessions.length
  const archivedTotalItems = archivedItemsInWeek.length
  const archivedCompletedItems = archivedItemsInWeek.filter((item) =>
    archivedCompletedItemIds.has(item.id),
  ).length
  const archivedCompletionRate = archivedTotalItems
    ? Math.round((archivedCompletedItems / archivedTotalItems) * 100)
    : 0
  const archivedExecutionCount = archivedLogsInWeek.length + archivedFocusSessions.length
  const logCounts: Record<string, number> = {}
  logsInWeek.forEach((log) => {
    logCounts[log.item_id] = (logCounts[log.item_id] ?? 0) + 1
  })
  const topItems = Object.entries(logCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => itemMap.get(id))
    .filter((item): item is Item => Boolean(item))
  return {
    totalItems,
    completedItems,
    completionRate,
    executionCount,
    studyMinutes,
    topItems,
    archived: {
      totalItems: archivedTotalItems,
      completedItems: archivedCompletedItems,
      completionRate: archivedCompletionRate,
      executionCount: archivedExecutionCount,
      studyMinutes: archivedStudyMinutes,
    },
  }
})

const weekTopItemsText = computed(() =>
  weekStats.value.topItems.map((item) => item.title).join('、'),
)

const weekDailyStats = computed(() => {
  const { start, end } = weekRange.value
  const dates = buildDateList(start, end)
  const activeItemIds = new Set(
    items.value.filter((item) => !isArchivedItem(item)).map((item) => item.id),
  )
  const itemsByDate: Record<string, Item[]> = {}
  items.value.filter((item) => !isArchivedItem(item)).forEach((item) => {
    const dateKey = item.created_at?.slice(0, 10)
    if (!dateKey) return
    if (!itemsByDate[dateKey]) itemsByDate[dateKey] = []
    itemsByDate[dateKey].push(item)
  })
  const logsByDate: Record<string, Set<string>> = {}
  logs.value.filter((log) => activeItemIds.has(log.item_id)).forEach((log) => {
    if (!logsByDate[log.date]) logsByDate[log.date] = new Set()
    logsByDate[log.date].add(log.item_id)
  })
  return dates
    .map((date) => {
      const total = itemsByDate[date]?.length ?? 0
      const completed = logsByDate[date]?.size ?? 0
      if (total === 0 && completed === 0) {
        return null
      }
      const rate = total ? Math.round((completed / total) * 100) : 0
      return { date, total, completed, rate }
    })
    .filter((item): item is { date: string; total: number; completed: number; rate: number } =>
      Boolean(item),
    )
})

const weekMilestoneStats = computed(() => {
  const { start, end } = weekRange.value
  const logsInWeek = logs.value.filter((log) => log.date >= start && log.date <= end)
  const focusSessionsInWeek = sessions.value.filter((session) => {
    const date = session.started_at.slice(0, 10)
    return (
      session.status === 'completed' &&
      session.mode === 'focus' &&
      date >= start &&
      date <= end
    )
  })
  const timeMinutesByItem: Record<string, number> = {}
  const logIdsByItem: Record<string, Set<string>> = {}
  logsInWeek.forEach((log) => {
    if (!logIdsByItem[log.item_id]) {
      logIdsByItem[log.item_id] = new Set()
    }
    logIdsByItem[log.item_id].add(log.id)
    const item = items.value.find((entry) => entry.id === log.item_id)
    if (item?.measure === 'time') {
      timeMinutesByItem[log.item_id] = (timeMinutesByItem[log.item_id] ?? 0) + Number(log.value || 0)
    }
  })
  const focusMinutesByItem: Record<string, number> = {}
  focusSessionsInWeek.forEach((session) => {
    if (!session.item_id) return
    focusMinutesByItem[session.item_id] =
      (focusMinutesByItem[session.item_id] ?? 0) + session.duration_seconds / 60
  })
  const activityItemIds = new Set<string>([
    ...Object.keys(logIdsByItem),
    ...Object.keys(focusMinutesByItem),
  ])
  const hasProgress = (itemId: string) =>
    Boolean(logIdsByItem[itemId]?.size || focusMinutesByItem[itemId])
  const isItemInWeek = (item: Item) => {
    const date = item.created_at?.slice(0, 10)
    if (date && date >= start && date <= end) return true
    return activityItemIds.has(item.id)
  }

  const milestoneList = milestones.value.filter((milestone) => milestone.status !== 'archived')
  const stats = milestoneList
    .map((milestone) => {
    const milestoneItems = items.value.filter((item) => {
      if (item.milestone_id !== milestone.id) return false
      if (isArchivedItem(item)) return false
      return isItemInWeek(item)
    })
    const total = milestoneItems.length
    const completed = milestoneItems.filter((item) => hasProgress(item.id)).length
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    const studyMinutes =
      milestoneItems.reduce((sum, item) => sum + (timeMinutesByItem[item.id] ?? 0), 0) +
      milestoneItems.reduce((sum, item) => sum + (focusMinutesByItem[item.id] ?? 0), 0)
    return {
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      total,
      completed,
      completionRate,
      studyMinutes,
    }
    })
    .filter((stat) => stat.total > 0 || stat.studyMinutes > 0 || stat.completed > 0)

  const unboundItems = items.value.filter((item) => {
    if (item.milestone_id) return false
    if (isArchivedItem(item)) return false
    return isItemInWeek(item)
  })
  if (unboundItems.length > 0) {
    const completed = unboundItems.filter((item) => hasProgress(item.id)).length
    const completionRate = Math.round((completed / unboundItems.length) * 100)
    const studyMinutes =
      unboundItems.reduce((sum, item) => sum + (timeMinutesByItem[item.id] ?? 0), 0) +
      unboundItems.reduce((sum, item) => sum + (focusMinutesByItem[item.id] ?? 0), 0)
    stats.push({
      id: 'unbound',
      title: '未绑定里程碑',
      status: 'active',
      total: unboundItems.length,
      completed,
      completionRate,
      studyMinutes,
    })
  }

  return stats.sort((a, b) => {
    if (a.id === 'unbound') return 1
    if (b.id === 'unbound') return -1
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate
    }
    return b.studyMinutes - a.studyMinutes
  })
})

const healthStats = computed(() => {
  const { start, end } = healthRange.value
  const dates = buildDateList(start, end)
  const activeItemIds = new Set(
    items.value.filter((item) => !isArchivedItem(item)).map((item) => item.id),
  )
  const itemsByDate: Record<string, Item[]> = {}
  items.value.forEach((item) => {
    const dateKey = item.created_at?.slice(0, 10)
    if (!dateKey) return
    if (!activeItemIds.has(item.id)) return
    if (!itemsByDate[dateKey]) itemsByDate[dateKey] = []
    itemsByDate[dateKey].push(item)
  })
  const logsByDate: Record<string, Set<string>> = {}
  logs.value.forEach((log) => {
    if (!activeItemIds.has(log.item_id)) return
    if (!logsByDate[log.date]) logsByDate[log.date] = new Set()
    logsByDate[log.date].add(log.item_id)
  })
  const focusSessionsByDate: Record<string, number> = {}
  sessions.value.forEach((session) => {
    if (session.status !== 'completed' || session.mode !== 'focus') return
    if (session.item_id && !activeItemIds.has(session.item_id)) return
    const dateKey = session.started_at.slice(0, 10)
    focusSessionsByDate[dateKey] = (focusSessionsByDate[dateKey] ?? 0) + 1
  })

  let totalItems = 0
  let completedItems = 0
  const rates: number[] = []
  const checkInMap: Record<string, boolean> = {}

  dates.forEach((date) => {
    const itemsForDay = itemsByDate[date] ?? []
    const itemIds = new Set(itemsForDay.map((item) => item.id))
    const completedIds = logsByDate[date] ?? new Set()
    const completedForDay = [...completedIds].filter((id) => itemIds.has(id)).length
    const totalForDay = itemsForDay.length
    totalItems += totalForDay
    completedItems += completedForDay
    if (totalForDay > 0) {
      rates.push(completedForDay / totalForDay)
    }
    checkInMap[date] =
      completedIds.size > 0 || (focusSessionsByDate[date] ?? 0) > 0
  })

  const completionRate = totalItems ? Math.round((completedItems / totalItems) * 100) : 0
  const averageRate = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0
  const variance =
    rates.length > 0
      ? rates.reduce((sum, rate) => sum + (rate - averageRate) ** 2, 0) / rates.length
      : 0
  const stdDev = Math.sqrt(variance)
  const stability = Math.round((1 - Math.min(1, stdDev * 2)) * 100)

  let streakDays = 0
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const date = dates[i]
    if (checkInMap[date]) {
      streakDays += 1
    } else {
      break
    }
  }
  const streakScore = Math.round(Math.min(1, streakDays / 7) * 100)
  const score = Math.round(completionRate * 0.5 + stability * 0.2 + streakScore * 0.3)

  return {
    rangeDays: healthRangeDays,
    completionRate,
    stability,
    streakDays,
    streakScore,
    score,
  }
})

const formatMinutes = (value: number) => {
  const rounded = Math.round(value)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
  }
  return `${minutes} 分`
}

const taskOptionsForMilestone = (milestoneId: string, excludeId?: string) =>
  (itemsByMilestone.value[milestoneId] ?? []).filter((item) => item.id !== excludeId)

const dependencyOptions = computed(() =>
  dependencyEditingId.value
    ? taskOptionsForMilestone(dependencyMilestoneId.value, dependencyEditingId.value)
    : [],
)

const createGoalForPeriod = async (period: GoalPeriod) => {
  const title = newGoalTitle[period].trim()
  if (!title) return
  const payload: {
    title: string
    period: GoalPeriod
    start_date?: string
    end_date?: string
    priority?: number
  } = {
    title,
    period,
    priority: newGoalPriority[period],
  }
  if (period === 'weekly') {
    payload.start_date = weekRange.value.start
    payload.end_date = weekRange.value.end
  }
  if (period === 'monthly') {
    payload.start_date = monthRange.value.start
    payload.end_date = monthRange.value.end
  }
  try {
    await createGoal(payload)
    newGoalTitle[period] = ''
    await loadGoals()
  } catch (err) {
    setError(err)
  }
}

const setGoalStatus = async (goal: Goal, status: Goal['status']) => {
  try {
    await updateGoal(goal.id, { status })
    await loadGoals()
  } catch (err) {
    setError(err)
  }
}

const removeGoal = async (goal: Goal) => {
  if (!window.confirm('确认删除该目标？')) return
  try {
    await deleteGoal(goal.id)
    await loadGoals()
    await loadMilestones()
    await loadItems()
  } catch (err) {
    setError(err)
  }
}

const createMilestoneForGoal = async (goal: Goal) => {
  const title = (newMilestoneTitle[goal.id] ?? '').trim()
  if (!title) return
  try {
    await createMilestone({
      goal_id: goal.id,
      title,
      priority: newMilestonePriority[goal.id] ?? 0,
    })
    newMilestoneTitle[goal.id] = ''
    await loadMilestones()
  } catch (err) {
    setError(err)
  }
}

const setMilestoneStatus = async (milestone: Milestone, status: Milestone['status']) => {
  try {
    await updateMilestone(milestone.id, { status })
    await loadMilestones()
  } catch (err) {
    setError(err)
  }
}

const removeMilestone = async (milestone: Milestone) => {
  if (!window.confirm('确认删除该里程碑？')) return
  try {
    await deleteMilestone(milestone.id)
    await loadMilestones()
    await loadItems()
  } catch (err) {
    setError(err)
  }
}

const createTaskForMilestone = async (milestone: Milestone) => {
  const title = (newTaskTitle[milestone.id] ?? '').trim()
  if (!title) return
  try {
    const response = await createItem({
      title,
      kind: 'todo',
      measure: 'check',
      milestone_id: milestone.id,
      priority: newTaskPriority[milestone.id] ?? 0,
    })
    const dependencies = newTaskDependencies[milestone.id] ?? []
    if (dependencies.length > 0) {
      await saveItemDependencies(response.id, dependencies)
    }
    newTaskTitle[milestone.id] = ''
    newTaskDependencies[milestone.id] = []
    await loadItems()
  } catch (err) {
    setError(err)
  }
}

const removeTask = async (item: Item) => {
  if (!window.confirm('确认删除该任务？')) return
  try {
    await deleteItem(item.id)
    await loadItems()
  } catch (err) {
    setError(err)
  }
}

const openDependencyEditor = async (item: Item, milestoneId: string) => {
  dependencyEditingId.value = item.id
  dependencyMilestoneId.value = milestoneId
  if (!dependencySelections[item.id]) {
    try {
      const deps = await listItemDependencies(item.id)
      dependencySelections[item.id] = deps.map((dep) => dep.id)
    } catch (err) {
      setError(err)
    }
  }
}

const closeDependencyEditor = () => {
  dependencyEditingId.value = ''
  dependencyMilestoneId.value = ''
}

const saveDependencies = async (item: Item) => {
  try {
    const deps = dependencySelections[item.id] ?? []
    await saveItemDependencies(item.id, deps)
    closeDependencyEditor()
  } catch (err) {
    setError(err)
  }
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

const buildReviewMarkdown = () => {
  const { completionRate, totalItems, completedItems, executionCount, studyMinutes, topItems } =
    weekStats.value
  const topTitles = topItems.map((item) => item.title).join('\u3001') || '\u6682\u65e0'
  const dailyLines =
    weekDailyStats.value.length > 0
      ? weekDailyStats.value
          .map((day) => `- ${day.date}: ${day.completed}/${day.total} (${day.rate}%)`)
          .join('\n')
      : '- \u672c\u5468\u6682\u65e0\u65e5\u8ba1\u5212\u8bb0\u5f55'
  const milestoneLines =
    weekMilestoneStats.value.length > 0
      ? weekMilestoneStats.value
          .map(
            (stat) =>
              '- ' +
              stat.title +
              ': ' +
              stat.completed +
              '/' +
              stat.total +
              ' (' +
              stat.completionRate +
              '%) \u00b7 \u5b66\u4e60\u65f6\u957f ' +
              formatMinutes(stat.studyMinutes),
          )
          .join('\n')
      : '- \u672c\u5468\u6682\u65e0\u91cc\u7a0b\u7891\u4efb\u52a1'
  const lines = [
    `# \u5468\u62a5 ${weekRangeText.value}`,
    '',
    '## \u6570\u636e\u603b\u89c8',
    `- \u5b8c\u6210\u7387\uff1a${completionRate}%\uff08${completedItems}/${totalItems}\uff09`,
    `- \u6267\u884c\u6b21\u6570\uff1a${executionCount}`,
    `- \u5b66\u4e60\u65f6\u957f\uff1a${formatMinutes(studyMinutes)}`,
    `- \u9ad8\u9891\u4efb\u52a1\uff1a${topTitles}`,
    `- \u5065\u5eb7\u5ea6\u8bc4\u5206\uff1a${healthStats.value.score}`,
    `- \u7a33\u5b9a\u5ea6\uff1a${healthStats.value.stability}%`,
    `- \u8fde\u7eed\u6253\u5361\uff1a${healthStats.value.streakDays} \u5929`,
    '',
    '## \u6bcf\u65e5\u5b8c\u6210',
    dailyLines,
    '',
    '## \u91cc\u7a0b\u7891\u5b8c\u6210\u7387',
    milestoneLines,
    '',
  ]
  return lines.join('\n')
}

const exportWeeklyReview = () => {
  reviewSaved.value = false
  const filename = `weekly-review-${weekRange.value.start}-to-${weekRange.value.end}.md`
  downloadFile(filename, 'text/markdown', buildReviewMarkdown())
  reviewSaved.value = true
  setTimeout(() => {
    reviewSaved.value = false
  }, 2000)
}

const loadGoals = async () => {
  goals.value = await listGoals()
}

const loadMilestones = async () => {
  milestones.value = await listMilestones()
}

const loadItems = async () => {
  items.value = await listItems()
}

const loadRecentLogs = async () => {
  logs.value = await listLogs({
    start: healthRange.value.start,
    end: healthRange.value.end,
    limit: 500,
  })
}

const loadRecentSessions = async () => {
  sessions.value = await listPomodoroSessions({
    start: healthRange.value.start,
    end: healthRange.value.end,
    limit: 500,
  })
}

const applyReminderSettings = (settings: Record<string, string>) => {
  if (settings['reminder.unfinished.enabled']) {
    reminderForm.unfinishedEnabled = settings['reminder.unfinished.enabled'] === 'true'
  }
  if (settings['reminder.unfinished.time']) {
    reminderForm.unfinishedTime = settings['reminder.unfinished.time']
  }
  if (settings['reminder.pomodoro.enabled']) {
    reminderForm.pomodoroEnabled = settings['reminder.pomodoro.enabled'] === 'true'
  }
  if (settings['reminder.pomodoro.minutes']) {
    reminderForm.pomodoroMinutes = Number(settings['reminder.pomodoro.minutes']) || 10
  }
  if (settings['reminder.study.enabled']) {
    reminderForm.studyEnabled = settings['reminder.study.enabled'] === 'true'
  }
  if (settings['reminder.study.start']) {
    reminderForm.studyStart = settings['reminder.study.start']
  }
  if (settings['reminder.study.end']) {
    reminderForm.studyEnd = settings['reminder.study.end']
  }
  if (settings['reminder.system.enabled']) {
    reminderForm.systemEnabled = settings['reminder.system.enabled'] === 'true'
  }
}

const notificationPermission = ref<'default' | 'granted' | 'denied' | 'unsupported'>(
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
)

const notificationStatus = computed(() => {
  if (notificationPermission.value === 'unsupported') return '当前浏览器不支持通知'
  if (notificationPermission.value === 'granted') return '已授权'
  if (notificationPermission.value === 'denied') return '已拒绝'
  return '未请求'
})

const requestNotificationPermission = async () => {
  if (typeof Notification === 'undefined') {
    setError('当前浏览器不支持系统通知')
    return
  }
  try {
    await Notification.requestPermission()
    notificationPermission.value =
      typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  } catch (err) {
    setError(err)
  }
}

const saveReminderSettings = async () => {
  reminderSaved.value = false
  try {
    await saveSettings({
      'reminder.unfinished.enabled': String(reminderForm.unfinishedEnabled),
      'reminder.unfinished.time': reminderForm.unfinishedTime,
      'reminder.pomodoro.enabled': String(reminderForm.pomodoroEnabled),
      'reminder.pomodoro.minutes': String(reminderForm.pomodoroMinutes),
      'reminder.study.enabled': String(reminderForm.studyEnabled),
      'reminder.study.start': reminderForm.studyStart,
      'reminder.study.end': reminderForm.studyEnd,
      'reminder.system.enabled': String(reminderForm.systemEnabled),
    })
    reminderSaved.value = true
    setTimeout(() => {
      reminderSaved.value = false
    }, 2000)
  } catch (err) {
    setError(err)
  }
}

const loadSettings = async () => {
  const settings = await getSettings()
  applyReminderSettings(settings)
}

const loadAll = async () => {
  loading.value = true
  error.value = ''
  baseDate.value = new Date()
  try {
    const results = await Promise.allSettled([
      loadGoals(),
      loadMilestones(),
      loadItems(),
      loadRecentLogs(),
      loadRecentSessions(),
      loadSettings(),
    ])
    const failed = results.find((result) => result.status === 'rejected') as
      | PromiseRejectedResult
      | undefined
    if (failed) {
      setError(failed.reason)
    }
  } catch (err) {
    setError(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAll()
})
</script>
