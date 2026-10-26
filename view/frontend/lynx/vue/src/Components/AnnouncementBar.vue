<script setup lang="ts">
// Link, not <a>: an in-store URL navigates through Inertia instead of reloading the whole app
import { Link } from '@inertiajs/vue3'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

type Item = { text?: string; link_label?: string; link_url?: string }

const props = defineProps<Lynx.AnnouncementBar>()

const dismissed = ref(false)
const idx = ref(0)
const dir = ref(1)

const list = computed<Item[]>(() => (Array.isArray(props.items) ? props.items : []).filter(i => i.text?.trim()))
const hasItems = computed(() => list.value.length > 0)
const isMultiple = computed(() => list.value.length > 1)
const current = computed(() => list.value[idx.value] ?? {})

let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
    if (!isMultiple.value) return
    const ms = (props.speed > 0 ? props.speed : 4) * 1000
    timer = setInterval(() => {
        dir.value = 1
        idx.value = (idx.value + 1) % list.value.length
    }, ms)
}
function stopTimer() {
    if (timer) clearInterval(timer)
    timer = null
}
function prev() {
    dir.value = -1
    idx.value = (idx.value - 1 + list.value.length) % list.value.length
    stopTimer()
    startTimer()
}
function next() {
    dir.value = 1
    idx.value = (idx.value + 1) % list.value.length
    stopTimer()
    startTimer()
}

onMounted(startTimer)
onUnmounted(stopTimer)

watch(
    () => list.value.length,
    len => {
        stopTimer()
        if (len === 0 || idx.value >= len) idx.value = 0
        startTimer()
    }
)
</script>

<template>
    <Transition
        enter-active-class="transition-all duration-300 ease-out overflow-hidden"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-16 opacity-100"
        leave-active-class="transition-all duration-250 ease-in overflow-hidden"
        leave-from-class="max-h-16 opacity-100"
        leave-to-class="max-h-0 opacity-0"
    >
        <div
            v-if="!dismissed && hasItems"
            :class="[
                'w-full constrained',
                props.background ? '' : 'bg-neutral',
                props.text_color ? '' : 'text-neutral-content',
            ]"
            :style="{ backgroundColor: props.background || undefined, color: props.text_color || undefined }"
        >
            <div class="h-10 flex items-center gap-2">
                <!-- Prev -->
                <button
                    v-if="isMultiple"
                    class="shrink-0 p-1.5 rounded-box bg-transparent border-none cursor-pointer transition-opacity opacity-70 hover:opacity-100"
                    :aria-label="props.labels?.previous"
                    @click="prev"
                >
                    <svg class="w-5 h-5 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fill-rule="evenodd"
                            d="M12.707 5.293a1 1 0 0 1 0 1.414L9.414 10l3.293 3.293a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>

                <!-- Text slide area -->
                <div class="relative flex-1 overflow-hidden h-5">
                    <!-- Slides the way it was paged: up when moving forward, down when back -->
                    <Transition
                        enter-active-class="transition-[transform,opacity] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                        leave-active-class="transition-[transform,opacity] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                        :enter-from-class="dir > 0 ? 'translate-y-[120%] opacity-0' : '-translate-y-[120%] opacity-0'"
                        :leave-to-class="dir > 0 ? '-translate-y-[120%] opacity-0' : 'translate-y-[120%] opacity-0'"
                    >
                        <p
                            :key="idx"
                            class="absolute top-0 inset-x-0 text-sm font-normal text-center leading-5 truncate"
                        >
                            {{ current.text }}
                            <Link
                                v-if="current.link_label && current.link_url"
                                :href="current.link_url"
                                class="ms-2 underline underline-offset-2 font-semibold hover:no-underline transition-all"
                                >{{ current.link_label }}</Link
                            >
                        </p>
                    </Transition>
                </div>

                <!-- Next -->
                <button
                    v-if="isMultiple"
                    class="shrink-0 p-1.5 rounded-box bg-transparent border-none cursor-pointer transition-opacity opacity-70 hover:opacity-100"
                    :aria-label="props.labels?.next"
                    @click="next"
                >
                    <svg class="w-5 h-5 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fill-rule="evenodd"
                            d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>

                <!-- Dismiss -->
                <button
                    v-if="props.dismissible"
                    class="shrink-0 p-1.5 rounded-box bg-transparent border-none cursor-pointer transition-opacity opacity-70 hover:opacity-100"
                    :aria-label="props.labels?.close"
                    @click="dismissed = true"
                >
                    <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"
                        />
                    </svg>
                </button>
            </div>
        </div>
    </Transition>
</template>
