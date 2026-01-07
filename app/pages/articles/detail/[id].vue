<template>
  <div v-if="article" class="container mx-auto p-4">
    <h1 class="mb-4 text-center text-2xl font-bold">{{ article.title }}</h1>
    <img
      v-if="article.cover"
      :src="article.cover"
      alt="cover"
      class="mb-4 w-full rounded"
    />
    <div class="prose max-w-none" v-html="article.content"></div>
    <div class="mt-4 flex justify-between text-sm text-gray-500">
      <span>{{ article.viewCount }} 次浏览</span>
      <span>{{ article.time }}</span>
    </div>
  </div>
  <div v-else class="p-4 text-center text-gray-500">文章加载中...</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getArticleDetail } from '@/api/article'

const route = useRoute()
const id = Number(route.params.id)
const { data: res } = await getArticleDetail({ id }, { ssr: true, as: 'value' })
const article = computed<ArticleInfo | null | undefined>(() => res)

</script>

<style scoped lang="scss">
.prose {
  line-height: 1.8;
}
</style>
