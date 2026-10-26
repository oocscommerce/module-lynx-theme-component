<script setup lang="ts">
// `content` is the HTML the editor's rich text field produces (paragraphs, bold, links, lists)
defineProps<Lynx.Paragraph>()

// Written out in full so Tailwind sees every class it has to build.
const SIZE: Record<string, string> = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
}

// Stored as left/right, drawn as start/end so an RTL store view mirrors it.
const ALIGN: Record<string, string> = {
    left: 'text-start',
    center: 'text-center',
    right: 'text-end',
}
</script>

<template>
    <div
        class="leading-relaxed [&_p+p]:mt-3 [&_a]:text-link [&_a]:underline [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_li+li]:mt-1"
        :class="[ALIGN[text_align] ?? ALIGN.left, SIZE[size] ?? SIZE.base, color ? '' : 'text-base-content']"
        :style="color ? { color } : undefined"
        v-html="content"
    ></div>
</template>
