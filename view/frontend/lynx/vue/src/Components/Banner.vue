<script setup lang="ts">
// Link, not <a>: an in-store URL navigates through Inertia instead of reloading the whole app
import { Link } from '@inertiajs/vue3'
defineProps<Lynx.Banner>()
</script>

<template>
    <div
        class="relative flex items-center justify-center bg-cover bg-center"
        :class="image ? '' : 'bg-primary'"
        :style="{
            minHeight: min_height + 'px',
            backgroundImage: image ? `url(${image})` : undefined,
        }"
    >
        <div class="absolute inset-0 bg-neutral/40" />
        <div class="relative max-w-narrow px-6 py-8 text-center text-neutral-content">
            <h1 v-if="title" class="mb-3 text-2xl font-semibold leading-tight md:text-4xl">{{ title }}</h1>
            <div v-if="subtitle" class="mb-6 text-lg leading-relaxed opacity-90" v-html="subtitle"></div>
            <Link v-if="cta_label" :href="cta_url" class="l-btn l-btn-primary l-btn-lg px-8">{{ cta_label }}</Link>
        </div>
    </div>
</template>
