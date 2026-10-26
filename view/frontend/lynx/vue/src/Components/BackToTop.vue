<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<Lynx.BackToTop>(), {
    labels: () => ({}),
})

const visible = ref(false)

function onScroll() {
    visible.value = window.scrollY > 0
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const sizeClass: Record<string, string> = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }
const iconClass: Record<string, string> = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }
const colorClass: Record<string, string> = {
    dark: 'bg-base-100 hover:bg-base-200 active:bg-base-200 text-base-content/80 hover:text-primary border-(length:--border) border-base-300 shadow-menu',
    light: 'bg-base-200 hover:bg-base-100 active:bg-base-100 text-base-content/80 hover:text-primary border-(length:--border) border-base-300 shadow-menu',
}
</script>

<template>
    <div class="fixed bottom-6 z-50 pointer-events-none" :class="props.position === 'left' ? 'start-6' : 'end-6'">
        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
        >
            <button
                v-if="visible"
                class="pointer-events-auto rounded-full flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:shadow-button-focus"
                :class="[sizeClass[props.size], colorClass[props.color]]"
                :title="labels.backToTop"
                @click="scrollToTop"
            >
                <svg :class="iconClass[props.size]" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        fill-rule="evenodd"
                        d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </Transition>
    </div>
</template>
