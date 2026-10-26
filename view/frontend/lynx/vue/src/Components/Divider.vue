<script setup lang="ts">
// A horizontal rule between two blocks, with the vertical room around it as a preset
defineProps<Lynx.Divider>()

// Written out in full so Tailwind sees every class it has to build.
const SPACING: Record<string, string> = {
    none: 'my-0',
    sm: 'my-4',
    md: 'my-8',
    lg: 'my-12',
}
</script>

<template>
    <hr class="border-0 border-t border-solid border-base-300" :class="SPACING[spacing] ?? SPACING.md" />
</template>
