<script setup lang="ts">
definePageMeta({
  title: '首页',
  loginRequired: false,
  roles: ['admin', 'user']
})

import { $getExpertsList, getExpertsList } from '@/api/talents/index.js'

const loading = ref(false)

// 直接使用 useFetch 的 data
const { data: expertsData, pending, refresh } = $getExpertsList({
  pageSize: 6,
  currentPage: 1
})
// 直接用 data.value?.data?.list
const expertsList = computed(() => expertsData.value?.data?.list || [])

// 加载更多
const loadClientData = async (params: any) => {
  loading.value = true
  const res = await getExpertsList(params)
  loading.value = false

  if (res.code === 1) {
    // 直接替换 data（或用 refresh）
    expertsData.value = res
  }
}
</script>

<template>
  <div>
    <div v-for="item in expertsList" :key="item.id">
      <div>{{ item.name }}</div>
    </div>
    <el-button 
      type="primary" 
      size="default" 
      @click="loadClientData({ pageSize: 6, currentPage: 2 })"
      :loading="loading"
    >
      加载更多
    </el-button>
  </div>
</template>