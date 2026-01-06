import { createRouter, createWebHistory } from 'vue-router'
import TodayView from '../views/TodayView.vue'
import PlanManageView from '../views/PlanManageView.vue'
import StudySummaryView from '../views/StudySummaryView.vue'
import PlanningView from '../views/PlanningView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView },
    { path: '/plans', name: 'plans', component: PlanManageView },
    { path: '/summary', name: 'summary', component: StudySummaryView },
    { path: '/planning', name: 'planning', component: PlanningView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})

export default router
