<script setup lang="ts">
defineProps<Lynx.Heading>()

const sizes: Record<string, string> = {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    h4: 'text-lg',
    h5: 'text-base',
    h6: 'text-sm',
}

// Stored as left/right, drawn as start/end so an RTL store view mirrors it.
const ALIGN: Record<string, string> = {
    left: 'text-start',
    center: 'text-center',
    right: 'text-end',
}
</script>

<template>
    <component
        :is="level"
        class="font-semibold"
        :class="[sizes[level], ALIGN[text_align] ?? ALIGN.left, color ? '' : 'text-base-content']"
        :style="color ? { color } : undefined"
        >{{ text }}</component
    >
</template>
