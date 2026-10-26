<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { useHeaderStore } from 'OOCS_LynxTheme/stores/global/headerStore'
import { formatPrice } from 'OOCS_LynxTheme/utils/price'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

// Scopes GraphQL requests to the store view being browsed.
const storeCode = config<string>('storeCode', '')
// The currency the page was rendered in, for the GraphQL Content-Currency header.
const currencyCode = config<string>('currencyCode', '')

// The autocomplete query, reduced to the fields the suggestion list renders; sent as GET so the GraphQL page cache answers
const AUTOCOMPLETE_QUERY =
    'query getAutocompleteResults($inputText:String!)' +
    '{products(search:$inputText currentPage:1 pageSize:3)' +
    '{aggregations{attribute_code options{label value}}' +
    'items{uid name small_image{url}url_key url_suffix ' +
    'price_range{minimum_price{regular_price{value}final_price{value}}}}' +
    'total_count}}'

// The search icon and the box it opens, over the header or under it: a block of the header's actions
const props = withDefaults(defineProps<Lynx.HeaderSearch>(), {
    search: () => ({
        action_url: '/catalogsearch/result/',
        suggest_url: '/graphql',
        min_length: 3,
        max_length: 128,
        suggest_enabled: false,
        placeholder: '',
    }),
    labels: () => ({}),
})

const header = useHeaderStore()
const searchOpen = computed({
    get: () => header.open === 'search',
    set: open => (header.open = open ? 'search' : null),
})
// 'below': the search hangs under the header instead of covering it; the header lifts itself over the backdrop
const searchBelow = computed(() => props.search_display === 'below')
header.searchBelow = searchBelow.value
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

watch(searchOpen, open => {
    if (open) {
        void nextTick(() => searchInputRef.value?.focus())
    } else {
        searchQuery.value = ''
        clearSuggestions()
    }
})

// Over the header it is a modal: the page behind goes inert (teleported out of #lynx); either way focus returns to
// the opener
let searchOpener: HTMLElement | null = null
watch(searchOpen, open => {
    const page = searchBelow.value ? null : document.getElementById('lynx')
    if (open) {
        searchOpener = document.activeElement as HTMLElement | null
        page?.setAttribute('inert', '')
        return
    }
    page?.removeAttribute('inert')
    searchOpener?.focus()
    searchOpener = null
})

// ── Search ───────────────────────────────────────────────────────────────────

type SuggestProduct = {
    uid: string
    name: string
    url_key: string
    url_suffix?: string | null
    small_image?: { url?: string } | null
    // The range is read at its minimum: what Magento advertises for a product spanning several prices (bundle
    price_range?: {
        minimum_price?: {
            regular_price?: { value?: number }
            final_price?: { value?: number }
        }
    }
}

type SuggestCategory = { label: string; value: string }

// Limits: three products (the query's pageSize) and four categories.
const CATEGORY_LIMIT = 4

const suggestions = ref<SuggestProduct[]>([])
const suggestCategories = ref<SuggestCategory[]>([])
const suggestTotal = ref(0)
const suggestLoading = ref(false)
const suggestError = ref(false)
const suggestDone = ref(false)
const activeSuggestion = ref(-1)
let suggestTimer: ReturnType<typeof setTimeout> | undefined
let suggestAbort: AbortController | undefined

/**
 * The one threshold the whole box obeys: autocomplete, the submit button, Enter, and the category rows
 */
const minLength = computed(() => Math.max(1, Number(props.search.min_length) || 3))
const meetsMinLength = (term: string) => term.trim().length >= minLength.value
const canSearch = computed(() => meetsMinLength(searchQuery.value))

const productUrl = (item: SuggestProduct) => `${config('baseUrl', '/')}${item.url_key}${item.url_suffix ?? ''}`

const finalPrice = (item: SuggestProduct) => item.price_range?.minimum_price?.final_price?.value ?? 0
const regularPrice = (item: SuggestProduct) => item.price_range?.minimum_price?.regular_price?.value ?? 0

const productPrice = (item: SuggestProduct) => formatPrice(finalPrice(item))
/**
 * The pre-discount price, and only when there is a discount
 */
const productOldPrice = (item: SuggestProduct) =>
    regularPrice(item) > finalPrice(item) ? formatPrice(regularPrice(item)) : ''

/**
 * The line above the results, : too short → loading → error → count → empty
 */
const suggestMessage = computed(() => {
    if (!canSearch.value) return (props.labels.searchMinLength ?? '').replace('%1', String(minLength.value))
    if (suggestError.value) return props.labels.searchError ?? ''
    if (suggestLoading.value) return props.labels.searchFetching ?? ''
    if (!suggestDone.value) return ''
    // No "{n} items" count here: it belongs to a different search definition than the results page runs
    return suggestTotal.value ? '' : (props.labels.searchNoResults ?? '')
})

function clearSuggestions() {
    clearTimeout(suggestTimer)
    suggestAbort?.abort()
    suggestions.value = []
    suggestCategories.value = []
    suggestTotal.value = 0
    suggestLoading.value = false
    suggestError.value = false
    suggestDone.value = false
    activeSuggestion.value = -1
}

function submitSearch(term = searchQuery.value) {
    const q = term.trim()
    // Same floor the results page applies; below it the page would only answer with "Minimum Search query length is N"
    if (!meetsMinLength(q)) return

    clearSuggestions()
    searchOpen.value = false
    router.get(props.search.action_url, { q })
}

/** A category row narrows the same query, through the layered-navigation param. */
function searchInCategory(category: SuggestCategory) {
    const q = searchQuery.value.trim()
    if (!meetsMinLength(q)) return

    clearSuggestions()
    searchOpen.value = false
    // The aggregation carries a base64 uid; layered navigation expects the raw id.
    router.get(props.search.action_url, { q, cat: atob(category.value) })
}

function goToProduct(item: SuggestProduct) {
    clearSuggestions()
    searchOpen.value = false
    router.get(productUrl(item))
}

function onSearchInput() {
    if (!props.search.suggest_enabled) return

    clearTimeout(suggestTimer)
    suggestAbort?.abort()
    activeSuggestion.value = -1
    suggestError.value = false

    if (!canSearch.value) {
        suggestions.value = []
        suggestCategories.value = []
        suggestTotal.value = 0
        suggestLoading.value = false
        suggestDone.value = false
        return
    }

    // Debounced: every call runs a real query against the search engine.
    suggestLoading.value = true
    suggestTimer = setTimeout(fetchSuggestions, 300)
}

async function fetchSuggestions() {
    const q = searchQuery.value.trim()
    suggestAbort = new AbortController()

    try {
        const url = new URL(props.search.suggest_url, window.location.origin)
        url.searchParams.set('query', AUTOCOMPLETE_QUERY)
        url.searchParams.set('operationName', 'getAutocompleteResults')
        url.searchParams.set('variables', JSON.stringify({ inputText: q }))

        const response = await fetch(url.toString(), {
            // The Store header is what scopes a GraphQL request; without it the default store view answers
            headers: {
                ...(storeCode ? { Store: storeCode } : {}),
                ...(currencyCode ? { 'Content-Currency': currencyCode } : {}),
            },
            signal: suggestAbort.signal,
        })

        const payload = response.ok ? await response.json() : null
        // A stale response can still land after a newer keystroke changed the box.
        if (searchQuery.value.trim() !== q) return

        const products = payload?.data?.products
        if (!products) {
            suggestError.value = true
            return
        }

        suggestions.value = products.items ?? []
        suggestTotal.value = products.total_count ?? 0
        // The categories the matches fall into; the aggregation is named category_uid and its values are base64 ids
        suggestCategories.value =
            (products.aggregations ?? [])
                .find((aggregation: { attribute_code?: string }) => aggregation.attribute_code === 'category_uid')
                ?.options?.slice(0, CATEGORY_LIMIT) ?? []
        suggestDone.value = true
    } catch (error) {
        // An aborted request was replaced by a newer one; anything else is a failure worth telling the visitor about
        if ((error as Error).name !== 'AbortError') suggestError.value = true
    } finally {
        if (searchQuery.value.trim() === q) suggestLoading.value = false
    }
}

/** Arrow keys walk the product list; Enter takes the highlighted one, or searches. */
function moveSuggestion(step: number) {
    if (!suggestions.value.length) return
    // Positions are -1 (the typed text) through count-1; shifted by one so the modulo wraps over the whole ring
    const ring = suggestions.value.length + 1
    activeSuggestion.value = ((activeSuggestion.value + 1 + step + ring) % ring) - 1
}

function onSearchEnter() {
    const picked = suggestions.value[activeSuggestion.value]
    if (picked) {
        goToProduct(picked)
        return
    }
    submitSearch()
}

// First Escape dismisses the suggestion list, a second one closes the search
function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !searchOpen.value) return
    if (suggestions.value.length || suggestDone.value) {
        clearSuggestions()
        return
    }
    searchOpen.value = false
}

// Teleports render only once mounted
const mounted = ref(false)
onMounted(() => (mounted.value = true))
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
    <div class="flex">
        <button
            type="button"
            :aria-label="labels.search"
            class="p-1.5 bg-transparent border-none cursor-pointer transition-colors"
            :class="searchOpen ? 'text-primary' : 'text-base-content hover:text-primary'"
            @click="searchOpen = !searchOpen"
        >
            <svg class="h-6 w-6 lg:h-7 lg:w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                />
            </svg>
        </button>

        <!-- ── Search: over the header, or in place under it when below ── -->
        <Teleport v-if="mounted" :to="searchBelow ? '#page-header-below' : 'body'">
            <Transition
                enter-active-class="transition-opacity duration-300 ease-[ease]"
                leave-active-class="transition-opacity duration-300 ease-[ease]"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="searchOpen"
                    class="fixed inset-0"
                    :class="searchBelow ? 'z-[39]' : 'z-[51] bg-neutral/50'"
                    @click="searchOpen = false"
                />
            </Transition>
            <Transition
                enter-active-class="transition-[transform,opacity] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                leave-active-class="transition-[transform,opacity] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                :enter-from-class="searchBelow ? '-translate-y-2 opacity-0' : '-translate-y-full opacity-0'"
                :leave-to-class="searchBelow ? '-translate-y-2 opacity-0' : '-translate-y-full opacity-0'"
            >
                <div
                    v-if="searchOpen"
                    :role="searchBelow ? undefined : 'dialog'"
                    :aria-modal="searchBelow ? undefined : 'true'"
                    :aria-label="labels.search"
                    class="inset-x-0 bg-base-100 shadow-menu border-base-300"
                    :class="searchBelow ? 'absolute top-full z-40 border-t' : 'fixed top-0 z-[52] border-b'"
                >
                    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4">
                        <!-- Anchor for the suggestion panel: it hangs off the input box as an overlay -->
                        <div class="relative">
                            <!-- l-input on the frame, not on the field: it is built to be the box around an input -->
                            <div class="l-input w-full gap-3">
                                <!-- The magnifier submits, so the box works without the keyboard -->
                                <button
                                    type="button"
                                    :aria-label="labels.search"
                                    :disabled="!canSearch"
                                    class="p-0 shrink-0 bg-transparent border-none text-base-content enabled:hover:text-primary enabled:cursor-pointer disabled:opacity-50 transition-colors"
                                    @click="submitSearch()"
                                >
                                    <svg
                                        class="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                                        />
                                    </svg>
                                </button>
                                <input
                                    ref="searchInputRef"
                                    v-model="searchQuery"
                                    type="search"
                                    role="combobox"
                                    :aria-label="labels.search"
                                    :aria-expanded="suggestions.length > 0"
                                    autocomplete="off"
                                    :placeholder="props.search.placeholder"
                                    :maxlength="props.search.max_length || undefined"
                                    @input="onSearchInput"
                                    @keydown.enter.prevent="onSearchEnter"
                                    @keydown.down.prevent="moveSuggestion(1)"
                                    @keydown.up.prevent="moveSuggestion(-1)"
                                />
                                <button
                                    type="button"
                                    :aria-label="labels.closeSearch"
                                    class="p-0.5 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors shrink-0"
                                    @click="searchOpen = false"
                                >
                                    <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <!-- Autocomplete: a message line stating what the box is doing -->
                            <div
                                v-if="props.search.suggest_enabled && searchQuery.trim()"
                                class="absolute inset-x-0 top-full z-10 mt-2 grid gap-3 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-box border-(length:--border) border-solid border-secondary bg-base-100 p-4 text-sm shadow-menu"
                                :class="suggestions.length ? 'pb-0' : ''"
                            >
                                <p v-if="suggestMessage" class="m-0 px-3 text-center text-base-content/70">
                                    {{ suggestMessage }}
                                </p>

                                <!-- "<query> in <category>", from the category_uid aggregation -->
                                <ul
                                    v-if="suggestCategories.length"
                                    class="grid gap-3 list-none m-0 p-0 border-0 border-t border-solid border-base-300 pt-3"
                                >
                                    <li v-for="category in suggestCategories" :key="category.value">
                                        <button
                                            type="button"
                                            class="w-full text-start bg-transparent border-none p-0 cursor-pointer text-base-content hover:text-primary transition-colors"
                                            @click="searchInCategory(category)"
                                        >
                                            <strong class="font-semibold">{{ searchQuery.trim() }}</strong>
                                            <span class="text-base-content/70">
                                                {{
                                                    ' ' + (labels.inCategory ?? '').replace('%1', category.label)
                                                }}</span
                                            >
                                        </button>
                                    </li>
                                </ul>

                                <ul
                                    v-if="suggestions.length"
                                    class="grid gap-3 list-none m-0 p-0 border-0 border-t border-solid border-base-300 pt-3"
                                >
                                    <li v-for="(item, index) in suggestions" :key="item.uid">
                                        <button
                                            type="button"
                                            class="w-full grid grid-cols-[75px_1fr_auto] items-center gap-4 text-start bg-transparent border-none p-0 cursor-pointer transition-colors"
                                            :class="
                                                index === activeSuggestion
                                                    ? 'text-primary'
                                                    : 'text-base-content hover:text-primary'
                                            "
                                            @click="goToProduct(item)"
                                        >
                                            <span class="inline-flex items-center justify-center">
                                                <img
                                                    v-if="item.small_image?.url"
                                                    :src="item.small_image.url"
                                                    :alt="item.name"
                                                    loading="lazy"
                                                    class="h-[75px] max-h-[75px] object-contain object-center"
                                                />
                                            </span>
                                            <span class="break-words">{{ item.name }}</span>
                                            <span class="grid justify-items-end tabular-nums">
                                                <span
                                                    class="font-semibold"
                                                    :class="productOldPrice(item) ? 'text-error' : ''"
                                                    >{{ productPrice(item) }}</span
                                                >
                                                <span
                                                    v-if="productOldPrice(item)"
                                                    class="text-base-content/70 line-through"
                                                    >{{ productOldPrice(item) }}</span
                                                >
                                            </span>
                                        </button>
                                    </li>
                                </ul>

                                <!-- No count here on purpose: GraphQL answers autocomplete through graphql_product_search -->
                                <!-- Sticky: with a long list the panel scrolls, and this is the one row that must stay reachable -->
                                <button
                                    v-if="suggestions.length"
                                    type="button"
                                    class="sticky bottom-0 w-full border-0 border-t border-solid border-base-300 bg-base-100 py-3 text-sm font-semibold text-primary cursor-pointer hover:underline underline-offset-4"
                                    @click="submitSearch()"
                                >
                                    {{ labels.viewAllResults }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
