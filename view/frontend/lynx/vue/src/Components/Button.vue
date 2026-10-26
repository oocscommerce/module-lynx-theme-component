<script setup lang="ts">
import { Link } from '@inertiajs/vue3'

defineProps<Lynx.Button>()

// l-btn carries the theme settings: the corner radius, the border width
const BASE = 'l-btn'
const VARIANT: Record<string, string> = {
    primary: 'l-btn-primary',
    secondary: 'l-btn-outline l-btn-secondary',
    outline: 'l-btn-outline l-btn-primary',
    light: '[--l-btn-color:var(--color-base-100)] [--l-btn-fg:var(--color-base-content)]',
}
const SIZE: Record<string, string> = {
    sm: 'l-btn-sm',
    md: '',
    lg: 'l-btn-lg',
}
const JUSTIFY: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
}
</script>

<template>
    <div class="flex" :class="JUSTIFY[justify] ?? JUSTIFY.start">
        <!-- Link for every href: a URL of another origin is handed to the browser by the router's `before` hook -->
        <Link
            :href="href"
            :target="new_tab ? '_blank' : undefined"
            :rel="new_tab ? 'noopener' : undefined"
            :class="[BASE, VARIANT[variant] ?? VARIANT.primary, SIZE[size] ?? SIZE.md]"
            >{{ label }}</Link
        >
    </div>
</template>
