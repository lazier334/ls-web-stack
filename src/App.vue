<template>
  <!-- 添加配置提供者和消息提供者组件 -->
  <n-config-provider>
    <n-message-provider>
      <n-layout>
        <n-layout-content class="content">
          <ListPage />
        </n-layout-content>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import ListPage from './views/ListPage.vue'
// 导入所需的提供者组件
import { NMessageProvider, NConfigProvider } from 'naive-ui'
</script>

<style scoped>
.content {
  padding: 20px;
}
</style>