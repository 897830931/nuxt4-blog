<template>
  <div class="component-class">

  </div>
</template>

<script setup lang='ts'>
import { onMounted } from 'vue';
import { login, ceshi } from '@/api/user';

const a = ref(1)
const ceshiData = await ceshi({
  name: a
})
console.log(ceshiData, 2)
onMounted(async () => {
  let res = await login({
    account: 'wunan', //账号
    password: '123456'  //密码
  })
  console.log(res, 1)
  setTimeout(() => {
    a.value = 2
  }, 2000);
})

</script>

<style lang="scss" scoped></style>