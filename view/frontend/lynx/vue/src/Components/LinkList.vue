<script setup lang="ts">
import { Link } from '@inertiajs/vue3'

// A titled list of links: one footer column, a "quick links" block in a sidebar
defineProps<Lynx.LinkList>()

// Title, then links; written out in full so Tailwind sees every class
const SIZE: Record<string, [string, string]> = {
    sm: ['text-base', 'text-sm'],
    base: ['text-lg', 'text-base'],
    lg: ['text-xl', 'text-lg'],
}
</script>

<template>
    <div class="space-y-4">
        <p v-if="title" class="font-semibold text-base-content" :class="(SIZE[size] ?? SIZE.base)[0]">{{ title }}</p>
        <ul class="space-y-2.5 list-none m-0 p-0">
            <li v-for="(link, i) in links" :key="i">
                <Link
                    :href="link.url || '#'"
                    class="text-base-content/70 hover:text-link hover:underline underline-offset-4 transition-colors no-underline"
                    :class="(SIZE[size] ?? SIZE.base)[1]"
                    >{{ link.label }}</Link
                >
            </li>
        </ul>
    </div>
</template>
