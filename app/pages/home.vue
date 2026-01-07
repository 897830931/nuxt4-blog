<script setup lang="ts">
import Article from '@/components/Article/index.vue';
import { getArticlesList ,$getArticlesList} from '@/api/article';
const list = ref<any[]>([])

// 1) SSR + 响应式
const { data, pending } = await $getArticlesList({ page: 1, pageSize: 10 })
watchEffect(() => {
  if (data.value?.code === 1) list.value = data.value.data.list
})

// 2) SSR + 直接要值
// const body = await getArticlesList({ page: 1, pageSize: 10 }, { ssr: true, as: 'value' })
// if (body.code === 1) list.value = body.data.list

// 3) CSR/点击
const more = async () => {
  const res = await getArticlesList({ page: 1, pageSize: 10 }) // or { ssr:false }
  console.log(res,111)
}
onMounted(() => {
  more()
})

</script>
<template>
  <ClientOnly>
    <div class="main px-2 py-1">
      <div class="atricle-list grid grid-cols-1 gap-1">
        <Article :info="item" v-for="item in list" :key="item.id" />
      </div>
    </div>
  </ClientOnly>
</template>
<style lang="scss" scoped></style>