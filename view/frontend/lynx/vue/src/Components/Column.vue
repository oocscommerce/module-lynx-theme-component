<script setup lang="ts">
// One cell of a Row, for layouts whose columns are not all the same width
defineProps<Lynx.Column>()

// Written out in full so Tailwind sees every class it has to build.
const SPAN: Record<number, string> = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
}
</script>

<template>
    <div class="min-w-0" :class="SPAN[span] ?? SPAN[1]">
        <slot />
    </div>
</template>
