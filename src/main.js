import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import naive from 'naive-ui' // 直接导入naive-ui


const app = createApp(App)

app.use(naive)
app.mount('#app')

