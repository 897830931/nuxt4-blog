<script setup lang="ts">
import Article from '@/pages/articles/components/Article/index.vue'
import { getArticlesList, $getArticlesList } from '@/api/article'
const list = ref<any[]>([])

// 1) SSR + 响应式
const { data: articleList, pending } = await $getArticlesList({ page: 1, pageSize: 10 })
watchEffect(() => {
    if (articleList.value?.code === 1) list.value = articleList.value.data.list
})
</script>
<template>
    <div>
        <div class="main px-2 py-1">
            <div class="atricle-list grid grid-cols-1 gap-1">
                <Article v-for="item in list" :key="item.id" :info="item" />
            </div>
        </div>
    </div>
</template>
<style lang="scss" scoped></style>
