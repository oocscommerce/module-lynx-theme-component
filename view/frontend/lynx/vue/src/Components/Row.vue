<script setup lang="ts">
import { computed } from 'vue'

// A grid of equal columns
const props = defineProps<Lynx.Row>()

// Written out in full so Tailwind sees every class it has to build.
const MOBILE: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
}
const TABLET: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
}
const DESKTOP: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
}
const ALIGN: Record<string, string> = {
    stretch: 'items-stretch',
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
}

const classes = computed(() => {
    const desktop = Math.min(Math.max(Math.floor(props.columns) || 1, 1), 6)
    const tablet = props.columns_tablet > 0 ? Math.min(props.columns_tablet, 4) : Math.min(desktop, 3)
    const mobile = props.columns_mobile > 0 ? Math.min(props.columns_mobile, 3) : 1
    return [MOBILE[mobile], TABLET[tablet], DESKTOP[desktop], ALIGN[props.vertical_align] ?? ALIGN.stretch]
})
</script>

<template>
    <div class="grid" :class="classes" :style="{ gap: gap + 'px' }">
        <slot />
    </div>
</template>
