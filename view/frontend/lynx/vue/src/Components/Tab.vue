<script setup lang="ts">
// One panel of a Tabs block
defineProps<Lynx.Tab>()
</script>

<template>
    <div class="flex flex-col gap-6">
        <slot />
    </div>
</template>
