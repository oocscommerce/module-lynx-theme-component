<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFormKeyStore } from 'OOCS_LynxTheme/stores/global/formKeyStore'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

// The currency the page was rendered in; the provider sends no current code.
const currencyCode = config<string>('currencyCode', '')

type Currency = Lynx.Currency

const props = withDefaults(defineProps<Lynx.CurrencySwitcher>(), {
    options: () => [],
    switch_url: '',
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

const formKeyStore = useFormKeyStore()

// A currency ICU does not know has its code as name and symbol
function label(o: Currency): string {
    switch (props.format) {
        case 'code':
            return o.code
        case 'name':
            return o.name || o.code
        case 'symbol_code':
            return o.symbol && o.symbol !== o.code ? `${o.symbol} ${o.code}` : o.code
        default:
            return o.name && o.name !== o.code ? `${o.code} - ${o.name}` : o.code
    }
}
const current = computed(() => props.options.find(o => o.code === currencyCode))

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
 * Currency changes session state, so it is posted
 */
function switchCurrency(code: string) {
    open.value = false
    if (code === currencyCode || !props.switch_url) return

    const form = document.createElement('form')
    form.method = 'post'
    form.action = props.switch_url

    for (const [name, value] of Object.entries({ form_key: formKeyStore.ensure(), currency: code })) {
        const field = document.createElement('input')
        field.type = 'hidden'
        field.name = name
        field.value = value
        form.appendChild(field)
    }

    // Nothing to invalidate: customerDataStore buckets its cache by `<storeCode>:<currencyCode>`

    document.body.appendChild(form)
    form.submit()
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
                        o.code === currencyCode ? 'font-semibold text-base-content' : 'text-base-content/70',
                    ]"
                    :aria-current="o.code === currencyCode ? 'true' : undefined"
                    @click="switchCurrency(o.code)"
                >
                    {{ label(o) }}
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
                <span class="truncate">{{ current ? label(current) : currencyCode }}</span>
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
                    :class="[text[1], o.code === currencyCode ? 'font-semibold' : '']"
                    @click="switchCurrency(o.code)"
                >
                    {{ label(o) }}
                    <!-- The tick says which one is in use: the trigger shows it too -->
                    <svg
                        v-if="o.code === currencyCode"
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
