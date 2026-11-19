import { initializeStorage } from "./utils/toolStorage"
import { createApp } from 'vue'
// 状态管理
import { createPinia } from "pinia"
import App from './App.vue'
import router from '@/router'
// UI框架
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
// Vant组件样式
import 'vant/lib/index.css';
import Vant from "vant"
// 全局样式
import "otb-toolkit/src/styles/index.scss"
import "@/style.scss"
// 路由守卫
import "@/router/routerGuards"

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router).use(ElementPlus).use(Vant)

void initializeStorage().then(() => {
  app.mount('#app')
}).catch((error) => {
  console.error("Failed to initialize tool storage", error)
  const root = document.querySelector("#app")
  if (root) root.textContent = "无法打开本地数据，请关闭其他同工具页面后刷新重试。"
})
