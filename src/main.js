import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { initTheme } from './composables/useTheme'

// 初始化主题
initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')

