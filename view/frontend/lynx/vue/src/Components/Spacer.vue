<script setup lang="ts">
defineProps<Lynx.Spacer>()
</script>

<template>
    <div :style="{ height: height + 'px' }" aria-hidden="true" />
</template>
