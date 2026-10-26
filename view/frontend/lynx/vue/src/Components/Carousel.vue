<script setup lang="ts">
// Link, not <a>: an in-store URL navigates through Inertia instead of reloading the whole app
import { Link } from '@inertiajs/vue3'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// The hero slider: the slides an admin lists in the node's `slides` setting, each an image with an optional title;
// one at a time with the text over the image or beside it, or several tiles side by side

const props = withDefaults(defineProps<Lynx.Carousel>(), {
    layout: 'overlay',
    per_view: 1,
    content_x: 'center',
    content_y: 'middle',
    labels: () => ({}),
})

const split = computed(() => props.layout === 'split')
/** Tiles: several slides side by side on wide screens; one on a phone. */
const tiles = computed(() => !split.value && Number(props.per_view) > 1)

// Text position on the slide
const ALIGN_X: Record<string, string> = {
    start: 'items-start text-start',
    center: 'items-center text-center',
    end: 'items-end text-end',
}
const ALIGN_Y: Record<string, string> = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' }
// The shade under the text darkens the side it sits on
const SHADE: Record<string, string> = {
    top: 'bg-linear-to-b from-neutral/60 to-transparent',
    middle: 'bg-neutral/40',
    bottom: 'bg-linear-to-t from-neutral/60 to-transparent',
}
const textClass = computed(
    () => `${ALIGN_X[props.content_x] ?? ALIGN_X.center} ${ALIGN_Y[props.content_y] ?? ALIGN_Y.middle}`
)
const shadeClass = computed(() => SHADE[props.content_y] ?? SHADE.middle)

/** A slide with no image has nothing to show; the rest of its fields are optional. */
const slides = computed(() => props.slides.filter(slide => slide.image))

// Slides in view, from the CSS the breakpoints set; 1 until measured, as the server renders it
const visible = ref(1)
const rootRef = ref<HTMLElement | null>(null)
function measure() {
    visible.value = rootRef.value ? Number(getComputedStyle(rootRef.value).getPropertyValue('--v')) || 1 : 1
}
/** Positions the track can stop at: with tiles, the last stop shows the last slide at the end. */
const stops = computed(() => Math.max(1, slides.value.length - visible.value + 1))

const current = ref(0)
const dragOffset = ref(0)
const isDragging = ref(false)
const touchStartX = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function go(index: number) {
    const count = stops.value
    current.value = (index + count) % count
}
function next() {
    go(current.value + 1)
}
function prev() {
    go(current.value - 1)
}

// Autoplay holds while the pointer or focus is on the carousel, and stays off once paused; reduced motion starts paused
const paused = ref(false)
let hovered = false
let focused = false

function startTimer() {
    stopTimer()
    if (!props.autoplay || paused.value || hovered || focused || stops.value < 2) return
    timer = setInterval(next, Number(props.interval))
}
function stopTimer() {
    if (timer) clearInterval(timer)
    timer = null
}
function onHover(on: boolean) {
    hovered = on
    startTimer()
}
function onFocus(e: FocusEvent) {
    focused = e.type === 'focusin' || (rootRef.value?.contains(e.relatedTarget as Node | null) ?? false)
    startTimer()
}
function togglePause() {
    paused.value = !paused.value
    startTimer()
}

function onTouchStart(e: TouchEvent) {
    if (stops.value < 2) return
    touchStartX.value = e.touches[0].clientX
    isDragging.value = true
    stopTimer()
}
function onTouchMove(e: TouchEvent) {
    if (!isDragging.value) return
    dragOffset.value = e.touches[0].clientX - touchStartX.value
}
function onTouchEnd() {
    if (!isDragging.value) return
    isDragging.value = false
    if (dragOffset.value < -50) next()
    else if (dragOffset.value > 50) prev()
    dragOffset.value = 0
    startTimer()
}

onMounted(() => {
    measure()
    window.addEventListener('resize', measure)
    paused.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    startTimer()
})
onUnmounted(() => {
    window.removeEventListener('resize', measure)
    stopTimer()
})

// The editor changes these live; a slide removed from under the current index has to snap back into range
watch([() => props.autoplay, () => props.interval, stops], startTimer)
watch(stops, count => {
    if (current.value >= count) go(0)
})
watch(
    () => props.per_view,
    () => requestAnimationFrame(measure)
)

/** One stop is a slide's width plus the gap after it. */
const trackTransform = computed(() =>
    tiles.value
        ? `translateX(calc(-${current.value} * (100% + 1rem) / var(--v) + ${dragOffset.value}px))`
        : `translateX(calc(-${current.value * 100}% + ${dragOffset.value}px))`
)
// Images that have arrived: until then each shows a skeleton
const loadedImages = ref(new Set<string>())
function markLoaded(src: string) {
    if (!loadedImages.value.has(src)) loadedImages.value.add(src)
}
// A server-rendered image may be in before hydration attaches the listener; checked once mounted, as a class
// changed while hydrating would leave the server's in place
onMounted(() => {
    for (const img of Array.from(document.querySelectorAll('img')))
        if (img.complete) markLoaded(img.getAttribute('src') ?? '')
})
</script>

<template>
    <div
        v-if="slides.length"
        ref="rootRef"
        class="group relative overflow-hidden select-none"
        :class="tiles ? '[--v:1] sm:[--v:min(var(--pv),2)] lg:[--v:var(--pv)]' : 'bg-base-200'"
        :style="tiles ? { '--pv': props.per_view } : undefined"
        @mouseenter="onHover(true)"
        @mouseleave="onHover(false)"
        @focusin="onFocus"
        @focusout="onFocus"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
    >
        <!-- Track -->
        <div
            dir="ltr"
            class="flex"
            :class="[tiles ? 'gap-4' : '', isDragging ? '' : 'transition-transform duration-500 ease-in-out']"
            :style="{ transform: trackTransform }"
        >
            <!-- Split: the image on one half, the text on the other; stacked on a phone -->
            <template v-if="split">
                <div v-for="(slide, i) in slides" :key="i" class="w-full shrink-0 grid md:grid-cols-2">
                    <div
                        class="relative aspect-[4/3] md:aspect-auto md:min-h-[440px]"
                        :class="props.content_x === 'end' ? '' : 'md:order-last'"
                    >
                        <img
                            :src="slide.image"
                            :alt="slide.title ?? ''"
                            :loading="i === 0 ? 'eager' : 'lazy'"
                            :fetchpriority="i === 0 ? 'high' : undefined"
                            class="absolute inset-0 w-full h-full object-cover"
                            :class="loadedImages.has(slide.image ?? '') ? '' : 'l-skeleton'"
                            @load="markLoaded(slide.image ?? '')"
                            @error="markLoaded(slide.image ?? '')"
                        />
                    </div>
                    <div
                        class="flex flex-col px-8 pt-10 md:px-12 lg:px-16"
                        :class="[textClass, stops > 1 && props.show_dots ? 'pb-16' : 'pb-10']"
                    >
                        <h2 v-if="slide.title" class="text-3xl lg:text-4xl font-semibold text-base-content mb-3">
                            {{ slide.title }}
                        </h2>
                        <p v-if="slide.subtitle" class="text-base sm:text-lg text-base-content/70 mb-7 max-w-xl">
                            {{ slide.subtitle }}
                        </p>
                        <Link
                            v-if="slide.cta_label && slide.cta_url"
                            :href="slide.cta_url"
                            class="l-btn l-btn-primary l-btn-lg px-8 no-underline"
                        >
                            {{ slide.cta_label }}
                        </Link>
                    </div>
                </div>
            </template>

            <!-- Overlay: the text over the image; tiles when several slides share the row -->
            <template v-else>
                <div
                    v-for="(slide, i) in slides"
                    :key="i"
                    class="shrink-0 relative flex flex-col"
                    :class="
                        tiles
                            ? 'w-[calc((100%_-_(var(--v)_-_1)_*_1rem)_/_var(--v))] aspect-4/5 rounded-box overflow-hidden bg-base-200'
                            : 'w-full aspect-[16/7]'
                    "
                >
                    <!-- The first slides are above the fold; the others wait. -->
                    <img
                        :src="slide.image"
                        :alt="slide.title ?? ''"
                        :loading="i === 0 || (tiles && i < props.per_view) ? 'eager' : 'lazy'"
                        :fetchpriority="i === 0 ? 'high' : undefined"
                        class="absolute inset-0 w-full h-full object-cover"
                        :class="loadedImages.has(slide.image ?? '') ? '' : 'l-skeleton'"
                        @load="markLoaded(slide.image ?? '')"
                        @error="markLoaded(slide.image ?? '')"
                    />
                    <template v-if="slide.title || slide.subtitle || (slide.cta_label && slide.cta_url)">
                        <div class="absolute inset-0" :class="shadeClass" />
                        <!-- In the flow, so a long caption grows the slide; the bottom clears the dots -->
                        <div
                            class="relative flex-auto flex flex-col pt-10"
                            :class="[
                                textClass,
                                tiles ? 'px-6' : 'min-h-[300px] px-6 sm:px-12 lg:px-16',
                                stops > 1 && props.show_dots ? 'pb-16' : 'pb-10',
                            ]"
                        >
                            <h2
                                v-if="slide.title"
                                class="font-semibold text-neutral-content mb-3"
                                :class="tiles ? 'text-2xl' : 'text-3xl sm:text-4xl lg:text-5xl'"
                            >
                                {{ slide.title }}
                            </h2>
                            <p
                                v-if="slide.subtitle"
                                class="text-base text-neutral-content/80 mb-7 max-w-xl"
                                :class="tiles ? '' : 'sm:text-lg'"
                            >
                                {{ slide.subtitle }}
                            </p>
                            <Link
                                v-if="slide.cta_label && slide.cta_url"
                                :href="slide.cta_url"
                                class="l-btn l-btn-primary px-8 no-underline"
                                :class="tiles ? '' : 'l-btn-lg'"
                            >
                                {{ slide.cta_label }}
                            </Link>
                        </div>
                    </template>
                    <div v-else :class="tiles ? '' : 'min-h-[300px]'" />
                </div>
            </template>
        </div>

        <!-- Arrows -->
        <template v-if="stops > 1 && props.show_arrows">
            <button
                type="button"
                :aria-label="labels.previous"
                class="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-button border-none bg-neutral/50 text-neutral-content hover:bg-neutral/60 flex items-center justify-center cursor-pointer transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:shadow-button-focus"
                @click="prev"
            >
                <svg
                    class="w-5 h-5 rtl:scale-x-[-1]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
            </button>
            <button
                type="button"
                :aria-label="labels.next"
                class="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-button border-none bg-neutral/50 text-neutral-content hover:bg-neutral/60 flex items-center justify-center cursor-pointer transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:shadow-button-focus"
                @click="next"
            >
                <svg
                    class="w-5 h-5 rtl:scale-x-[-1]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </button>
        </template>

        <!-- Dots: each a 24px target around the visible dot -->
        <div v-if="stops > 1 && props.show_dots" class="absolute bottom-4 inset-x-0 flex justify-center">
            <div class="flex items-center rounded-button bg-neutral/50 px-1">
                <button
                    v-for="(_, i) in stops"
                    :key="i"
                    type="button"
                    :aria-label="(labels.goToSlide ?? '').replace('%1', String(i + 1))"
                    :aria-current="i === current ? 'true' : undefined"
                    class="group/dot flex items-center justify-center min-w-6 h-6 border-none cursor-pointer p-0 bg-transparent"
                    @click="go(i)"
                >
                    <span
                        class="block h-2 rounded-button transition-all duration-300"
                        :class="i === current ? 'w-6 bg-base-100' : 'w-2 bg-base-100/50 group-hover/dot:bg-base-100/80'"
                    />
                </button>
            </div>
        </div>

        <!-- Autoplay pause, as moving content must offer one -->
        <button
            v-if="props.autoplay && stops > 1"
            type="button"
            :aria-label="paused ? labels.play : labels.pause"
            class="absolute end-4 bottom-4 w-10 h-10 rounded-button border-none bg-neutral/50 text-neutral-content hover:bg-neutral/60 flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:shadow-button-focus"
            @click="togglePause"
        >
            <svg v-if="paused" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
            </svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
            </svg>
        </button>
    </div>
</template>
