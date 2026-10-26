<script setup lang="ts">
import { Link } from '@inertiajs/vue3'

defineProps<Lynx.Image>()

// Number(): a layout saved outside the editor (MCP) can carry the width as a string
const JUSTIFY: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
}
const ROUNDED: Record<string, string> = {
    none: '',
    md: 'rounded-box',
    lg: 'rounded-[calc(var(--radius-box)*2)]',
    full: 'rounded-full',
}
</script>

<template>
    <div class="flex" :class="JUSTIFY[justify] ?? JUSTIFY.start">
        <!-- Link for every href: another origin is handed to the browser by the router's `before` hook (main.ts) -->
        <Link v-if="href" :href="href" :target="new_tab ? '_blank' : undefined" :rel="new_tab ? 'noopener' : undefined">
            <img
                :src="src"
                :alt="alt"
                :width="Number(width) || undefined"
                loading="lazy"
                decoding="async"
                class="block max-w-full h-auto"
                :class="ROUNDED[rounded] ?? ''"
            />
        </Link>
        <img
            v-else
            :src="src"
            :alt="alt"
            :width="Number(width) || undefined"
            loading="lazy"
            decoding="async"
            class="block max-w-full h-auto"
            :class="ROUNDED[rounded] ?? ''"
        />
    </div>
</template>
