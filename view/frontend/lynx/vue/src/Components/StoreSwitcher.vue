<script setup lang="ts">
import { ref, computed } from 'vue'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

// The store view being browsed; the provider sends no current code.
const storeCode = config<string>('storeCode', '')
// "Add Store Code to URLs": a path carrying a store code out-ranks the store cookie
const storeInUrl = config('storeInUrl', false)

const props = withDefaults(defineProps<Lynx.StoreSwitcher>(), {
    options: () => [],
    redirect_url: '',
    sections: () => ['*'],
    labels: () => ({}),
})

// Title, then options; written out in full so Tailwind sees every class
const SIZE: Record<string, [string, string]> = {
    sm: ['text-base', 'text-sm'],
    base: ['text-lg', 'text-base'],
    lg: ['text-xl', 'text-lg'],
}
const text = computed(() => SIZE[props.size] ?? SIZE.base)

const currentName = computed(() => props.options.find(o => o.code === storeCode)?.name ?? '')

const open = ref(false)
// The menu hangs below the trigger unless the viewport has no room there
const openUp = ref(false)
const trigger = ref<HTMLElement | null>(null)

function toggle() {
    if (!open.value && trigger.value) {
        const rect = trigger.value.getBoundingClientRect()
        // One row per option plus the menu padding.
        const menuHeight = props.options.length * 40 + 16
        openUp.value = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight
    }
    open.value = !open.value
}

/**
 * Magento's uenc: base64 with the three URL-unsafe characters swapped, matching Url\Encoder::encode()
 */
function encodeUrl(url: string): string {
    return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~')
}

/**
 * The switch reloads the page rather than patching it: prices, the price format in lynxStoreConfig
 */
function switchStore(code: string) {
    open.value = false
    if (code === storeCode || !props.redirect_url) return

    // Where the visitor lands has to carry the target store's code, not the one being left and not none at all
    const url = new URL(window.location.href)
    if (storeInUrl) {
        const prefix = `/${storeCode}`
        const hasPrefix = storeCode && (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
        const path = hasPrefix ? url.pathname.slice(prefix.length) || '/' : url.pathname
        url.pathname = `/${code}${path}`
    }

    const params = new URLSearchParams({
        ___store: code,
        ___from_store: storeCode,
        uenc: encodeUrl(url.href),
    })
    // Nothing to invalidate: customerDataStore buckets its cache by `<storeCode>:<currencyCode>`
    window.location.assign(`${props.redirect_url}?${params}`)
}
</script>

<template>
    <div v-if="options.length" class="w-full">
        <p v-if="props.show_title" class="font-semibold text-base-content mb-4" :class="text[0]">{{ labels.title }}</p>

        <!-- Links: every option in a row, the current one bold — a footer bottom bar -->
        <div v-if="props.display === 'links'" class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <template v-for="(o, i) in options" :key="o.code">
                <span v-if="i" class="text-base-content/70" aria-hidden="true">|</span>
                <button
                    type="button"
                    class="bg-transparent border-none p-0 cursor-pointer hover:text-link hover:underline underline-offset-4 transition-colors"
                    :class="[
                        text[1],
                        o.code === storeCode ? 'font-semibold text-base-content' : 'text-base-content/70',
                    ]"
                    :aria-current="o.code === storeCode ? 'true' : undefined"
                    @click="switchStore(o.code)"
                >
                    {{ o.name }}
                </button>
            </template>
        </div>

        <!-- Dropdown: a select-looking trigger that opens the list -->
        <div v-else class="relative inline-block max-w-full">
            <!-- Backdrop: catches the click that should dismiss the open menu -->
            <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>
            <button
                ref="trigger"
                type="button"
                class="l-select w-auto min-w-40 max-w-full cursor-pointer text-start"
                :class="text[1]"
                aria-haspopup="true"
                :aria-expanded="open"
                @click="toggle"
            >
                <span class="truncate">{{ currentName }}</span>
            </button>
            <div
                v-if="open"
                class="absolute start-0 z-50 min-w-full w-max max-w-[calc(100vw-2rem)] rounded-box border-(length:--border) border-solid border-base-300 bg-base-100 shadow-menu py-1"
                :class="openUp ? 'bottom-full mb-2' : 'top-full mt-2'"
            >
                <button
                    v-for="o in options"
                    :key="o.code"
                    type="button"
                    class="w-full flex items-center justify-between gap-4 px-4 py-2 text-start text-base-content bg-transparent border-none cursor-pointer whitespace-nowrap hover:bg-base-200 transition-colors"
                    :class="[text[1], o.code === storeCode ? 'font-semibold' : '']"
                    @click="switchStore(o.code)"
                >
                    {{ o.name }}
                    <!-- The tick says which one is in use: the trigger shows it too -->
                    <svg
                        v-if="o.code === storeCode"
                        class="h-4 w-4 shrink-0 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2.5"
                        stroke="currentColor"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>
