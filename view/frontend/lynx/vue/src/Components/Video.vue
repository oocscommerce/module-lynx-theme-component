<script setup lang="ts">
import { ref } from 'vue'

// A poster with a play button; the player's iframe only loads once it is pressed
withDefaults(defineProps<Lynx.Video>(), {
    labels: () => ({}),
})

// Written out in full so Tailwind sees every class it has to build.
const ASPECT: Record<string, string> = {
    '16_9': 'aspect-video',
    '4_3': 'aspect-4/3',
    '1_1': 'aspect-square',
    '9_16': 'aspect-9/16',
}
const ROUNDED: Record<string, string> = {
    none: '',
    md: 'rounded-box overflow-hidden',
    lg: 'rounded-[calc(var(--radius-box)*2)] overflow-hidden',
}

const JUSTIFY: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
}

const playing = ref(false)
</script>

<template>
    <div class="flex" :class="JUSTIFY[justify] ?? JUSTIFY.center">
        <!-- Number(): a layout saved outside the editor (MCP) can carry the width as a string -->
        <div
            class="relative w-full bg-neutral"
            :class="[ASPECT[aspect] ?? ASPECT['16_9'], ROUNDED[rounded] ?? '']"
            :style="Number(width) ? { maxWidth: Number(width) + 'px' } : undefined"
        >
            <template v-if="embed">
                <iframe
                    v-if="playing"
                    :src="embed"
                    :title="title"
                    class="absolute inset-0 w-full h-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowfullscreen
                ></iframe>
                <button
                    v-else
                    type="button"
                    :aria-label="labels.play"
                    @click="playing = true"
                    class="group absolute inset-0 w-full h-full p-0 border-0 bg-transparent cursor-pointer"
                >
                    <img
                        v-if="poster"
                        :src="poster"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        class="absolute inset-0 w-full h-full object-cover"
                    />
                    <span
                        class="absolute inset-0 m-auto flex items-center justify-center w-16 h-16 rounded-full bg-neutral/70 text-neutral-content transition-colors group-hover:bg-primary group-hover:text-primary-content"
                    >
                        <svg class="w-7 h-7 ms-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path
                                d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"
                            />
                        </svg>
                    </span>
                </button>
            </template>
        </div>
    </div>
</template>
