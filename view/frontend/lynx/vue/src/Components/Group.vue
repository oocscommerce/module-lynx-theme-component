<script setup lang="ts">
import { computed } from 'vue'

// The one wrapper block: a band of the page whose background, border and vertical padding run edge to edge
const props = defineProps<Lynx.Group>()

// Written out in full so Tailwind sees every class it has to build
const WIDTH: Record<string, string> = {
    narrow: '[--content-size:var(--width-narrow)]',
    default: '[--content-size:var(--width-content)]',
    site: '[--content-size:var(--width-site)]',
}
const PADDING_Y: Record<string, string> = {
    none: '',
    sm: 'py-6 lg:py-8',
    md: 'py-10 lg:py-14',
    lg: 'py-16 lg:py-24',
}
// Side padding: a track of the frame grid when constrained, real padding when full
const PADDING_X: Record<string, string> = {
    none: '[--gutter:0px]',
    default: '',
}
const PADDING_X_FULL: Record<string, string> = {
    none: '',
    default: 'px-4 sm:px-6 lg:px-8',
}
const GAP: Record<string, string> = {
    none: '',
    sm: 'gap-y-4',
    md: 'gap-y-8',
    lg: 'gap-y-12',
}
const GAP_FULL: Record<string, string> = {
    none: '',
    sm: 'space-y-4',
    md: 'space-y-8',
    lg: 'space-y-12',
}
const POSITION: Record<string, string> = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
}
const BG_SIZE: Record<string, string> = {
    cover: 'bg-cover',
    contain: 'bg-contain bg-no-repeat',
    auto: 'bg-auto bg-no-repeat',
}
const BG_POSITION: Record<string, string> = {
    center: 'bg-center',
    top: 'bg-top',
    bottom: 'bg-bottom',
}
const GRADIENT: Record<string, string> = {
    none: '',
    soft: 'bg-linear-to-br from-primary/15 via-base-100 to-secondary/15',
    bold: 'bg-linear-to-br from-primary to-secondary',
}
const BORDER: Record<string, string> = {
    none: '',
    top: 'border-0 border-t border-solid border-base-300',
    bottom: 'border-0 border-b border-solid border-base-300',
    both: 'border-0 border-t border-b border-solid border-base-300',
    all: 'border-(length:--border) border-solid border-base-300',
}
const ROUNDED: Record<string, string> = {
    none: '',
    md: 'rounded-box overflow-hidden',
    lg: 'rounded-box overflow-hidden',
}

const outerClass = computed(() => [
    'relative w-full flex flex-col',
    PADDING_Y[props.padding_y] ?? PADDING_Y.md,
    POSITION[props.content_position] ?? POSITION.top,
    BG_SIZE[props.background_size] ?? BG_SIZE.cover,
    BG_POSITION[props.background_position] ?? BG_POSITION.center,
    GRADIENT[props.gradient] ?? '',
    BORDER[props.border] ?? '',
    ROUNDED[props.rounded] ?? '',
])

const outerStyle = computed(() => ({
    ...(props.color ? { color: props.color } : {}),
    ...(props.background ? { backgroundColor: props.background } : {}),
    ...(props.background_image ? { backgroundImage: `url(${props.background_image})` } : {}),
    ...(props.min_height > 0 ? { minHeight: props.min_height + 'px' } : {}),
}))

// The frame the blocks sit in: the .constrained grid at the chosen width when constrained
const innerClass = computed(() =>
    props.layout === 'full'
        ? [
              'relative w-full',
              PADDING_X_FULL[props.padding_x ?? ''] ?? PADDING_X_FULL.default,
              GAP_FULL[props.gap] ?? '',
          ]
        : [
              'relative w-full constrained [--wide-size:var(--width-site)]',
              WIDTH[props.width ?? ''] ?? WIDTH.site,
              PADDING_X[props.padding_x ?? ''] ?? PADDING_X.default,
              GAP[props.gap] ?? '',
          ]
)

const overlayStyle = computed(() =>
    props.overlay > 0 ? { backgroundColor: `rgb(0 0 0 / ${Math.min(props.overlay, 100) / 100})` } : null
)
</script>

<template>
    <component :is="tag" :id="anchor || undefined" :class="outerClass" :style="outerStyle">
        <div
            v-if="overlayStyle"
            class="absolute inset-0 pointer-events-none"
            :style="overlayStyle"
            aria-hidden="true"
        />
        <div :class="innerClass">
            <slot />
        </div>
    </component>
</template>
