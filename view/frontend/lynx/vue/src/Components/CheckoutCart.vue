<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Link, router } from '@inertiajs/vue3'
import { useFormKeyStore } from 'OOCS_LynxTheme/stores/global/formKeyStore'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import { useAnalyticsStore } from 'OOCS_LynxTheme/stores/global/analyticsStore'
import { useMessagesStore } from 'OOCS_LynxTheme/stores/global/messagesStore'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'
// Rate amounts arrive as raw numbers; formatted from lynxStoreConfig.priceFormat.
import { formatPrice } from 'OOCS_LynxTheme/utils/price'
import Container from 'OOCS_LynxTheme/Components/Container.vue'
import { dispatch } from 'OOCS_LynxTheme/utils/dispatch'

type CartItem = Lynx.CartItem

type TotalRow = { code: string; label: string; value_formatted: string }

const props = withDefaults(defineProps<Lynx.CheckoutCart>(), {
    items: () => [],
    total_count: 0,
    current_page: 1,
    total_pages: 1,
    has_error: false,
    error_messages: () => [],
    coupon_code: '',
    can_clear_cart: false,
    totals_url: '',
    cart_api_url: '',
    urls: () => ({}),
    sections: () => ({}),
    labels: () => ({}),
    tax_display: () => ({
        price: 1,
        subtotal: 1,
        shipping: 1,
        grand_total: false,
        full_summary: false,
        zero_tax: false,
    }),
})

// The row the express buttons sit in
const EXPRESS_COLUMNS: Record<string, string> = {
    auto: '[grid-template-columns:repeat(auto-fit,minmax(14rem,20rem))]',
    '1': 'grid-cols-1',
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}
const EXPRESS_GAP: Record<string, string> = {
    none: 'gap-0',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
}
const expressRowClass = computed(() =>
    [
        EXPRESS_COLUMNS[props.express_columns] ?? EXPRESS_COLUMNS.auto,
        EXPRESS_GAP[props.express_gap] ?? EXPRESS_GAP.sm,
    ].join(' ')
)

const cartUrls = computed(() => ({
    checkout: '/checkout/',
    multishipping: '',
    continue: '/',
    update_post: '/checkout/cart/updatePost/',
    delete: '/checkout/cart/delete/',
    ...props.urls,
}))

// ── Totals ───────────────────────────────────────────────────────────────────

type TotalSegment = {
    code: string
    title?: string | null
    value: number | null
    // The tax segment's rates, for the full tax summary
    extension_attributes?: {
        tax_grandtotal_details?: { amount: number; rates: { percent?: string; title: string }[] }[]
    }
}

const serverTotals = ref<TotalRow[] | null>(null)

// Null until the first response: the summary shows its skeleton meanwhile.
const totalsPending = computed(() => serverTotals.value === null)
const totalRows = computed(() => serverTotals.value ?? [])
const summaryRows = computed(() => totalRows.value.filter(row => row.code !== 'grand_total'))
const grandTotal = computed(() => totalRows.value.find(row => row.code === 'grand_total') ?? null)

async function loadTotals() {
    if (!props.totals_url) {
        serverTotals.value = []
        return
    }

    try {
        const response = await fetch(props.totals_url, {
            credentials: 'same-origin',
            headers: {
                // Session-authenticated web API calls are only honoured for AJAX requests
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
        const data = await response.json()
        if (!response.ok) {
            serverTotals.value = []
            return
        }

        serverTotals.value = totalRowsOf(data).map(row => ({ ...row, value_formatted: formatPrice(row.value) }))
    } catch {
        serverTotals.value = []
    }
}

onMounted(loadTotals)

// The summary rows as the tax display settings lay them out, after core's cart summary
function totalRowsOf(data: Record<string, unknown>): { code: string; label: string; value: number }[] {
    const display = props.tax_display
    const labels = props.labels
    const rows: { code: string; label: string; value: number }[] = []
    for (const segment of (data.total_segments ?? []) as TotalSegment[]) {
        if (segment.value === null) continue
        const { code } = segment
        const title = segment.title ?? code
        const value = Number(segment.value)
        if (code === 'subtotal' || code === 'shipping') {
            // The segment carries one amount; the payload has both
            const excl = Number(data[code === 'subtotal' ? 'subtotal' : 'shipping_amount'] ?? value)
            const incl = Number(data[code === 'subtotal' ? 'subtotal_incl_tax' : 'shipping_incl_tax'] ?? value)
            if (display[code] === 3) {
                const subtotal = code === 'subtotal'
                rows.push({
                    code,
                    label: subtotal ? labels.subtotalExclTax : `${title} ${labels.exclTax}`,
                    value: excl,
                })
                rows.push({
                    code: `${code}_incl_tax`,
                    label: subtotal ? labels.subtotalInclTax : `${title} ${labels.inclTax}`,
                    value: incl,
                })
            } else {
                rows.push({ code, label: title, value: display[code] === 2 ? incl : excl })
            }
        } else if (code === 'tax') {
            if (!value && !display.zero_tax) continue
            rows.push({ code, label: title, value })
            if (!display.full_summary) continue
            for (const [index, detail] of (segment.extension_attributes?.tax_grandtotal_details ?? []).entries()) {
                const label = detail.rates.map(rate => (rate.percent ? `${rate.title} (${rate.percent}%)` : rate.title))
                rows.push({ code: `tax_${index}`, label: label.join(', '), value: detail.amount })
            }
        } else if (code === 'grand_total' && display.grand_total) {
            const excl = Math.max(0, value - Number(data.tax_amount ?? 0))
            rows.push({ code: 'grand_total_excl_tax', label: labels.orderTotalExclTax, value: excl })
            rows.push({ code, label: labels.orderTotalInclTax, value })
        } else {
            rows.push({ code, label: title, value })
        }
    }
    return rows
}

// Display Prices: the amounts with tax unless set to excluding; "both" adds the amount without tax underneath
const withTax = computed(() => props.tax_display.price !== 1)
const showExclTax = computed(() => props.tax_display.price === 3)

const analytics = useAnalyticsStore()

// The cart as the page shows it, for whichever tracker the design carries.
onMounted(() => {
    if (!props.items.length) return
    analytics.track('view_cart', {
        currency: config<string>('currencyCode', ''),
        value: props.items.reduce((sum, item) => sum + item.row_total, 0),
        items: props.items.map(item => ({
            item_id: item.sku,
            item_name: item.name,
            price: item.price,
            quantity: item.qty,
        })),
    })
})

/** add_to_cart / remove_from_cart for a quantity change the server accepted. */
function trackCartChange(item: CartItem, delta: number) {
    analytics.track(delta > 0 ? 'add_to_cart' : 'remove_from_cart', {
        currency: config<string>('currencyCode', ''),
        value: Math.abs(delta) * item.price,
        items: [{ item_id: item.sku, item_name: item.name, price: item.price, quantity: Math.abs(delta) }],
    })
}

const formKeyStore = useFormKeyStore()
const customerData = useCustomerDataStore()

// ── Mutations ────────────────────────────────────────────────────────────────

const busy = ref(false)

function submit(url: string, data: Record<string, unknown>, sections: string[] = [], then?: () => void) {
    if (busy.value) return
    busy.value = true

    // Whatever this changes; a failed request changed nothing, so the summary gets its rows back
    const previous = serverTotals.value
    serverTotals.value = null
    let saved = false

    router.post(
        url,
        { form_key: formKeyStore.ensure(), ...data },
        {
            // Magento reads $_POST; Inertia sends JSON unless told to use form data.
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                saved = true
                void customerData.reload(sections)
                void loadTotals()
                then?.()
            },
            // Failed or cancelled too
            onFinish: () => {
                busy.value = false
                if (!saved) serverTotals.value = previous
            },
        }
    )
}

// ── Quantity ─────────────────────────────────────────────────────────────────

/** Paging keeps every other query parameter, and drops `p` on the first page. */
function page(to: number) {
    if (to < 1 || to > props.total_pages || to === props.current_page) return

    const params = new URLSearchParams(window.location.search)
    if (to > 1) {
        params.set('p', String(to))
    } else {
        params.delete('p')
    }
    const query = params.toString()
    router.get(window.location.pathname + (query ? `?${query}` : ''), {}, { preserveScroll: false })
}

// The quantities as typed, sent together when Update Shopping Cart is pressed
const qtys = reactive<Record<number, number>>({})

watch(
    () => props.items,
    items => {
        for (const item of items) qtys[item.item_id] = item.qty
    },
    { immediate: true, deep: true }
)

const qtyOf = (item: CartItem) => qtys[item.item_id] ?? item.qty

// Above 0, decimals included (Qty Uses Decimals); anything else is 1
function setQty(item: CartItem, qty: number) {
    qtys[item.item_id] = qty > 0 ? qty : 1
}

// +/- one, rounded to the 4 decimals Magento keeps (4.35 - 1 is 3.3499999999999996 otherwise), never under 1
function stepQty(item: CartItem, by: number) {
    setQty(item, Math.max(1, Math.round((qtyOf(item) + by) * 10000) / 10000))
}

/** A typed quantity, committed when the field is left; the field shows what was kept. */
function commitQty(item: CartItem, event: Event) {
    const input = event.target as HTMLInputElement
    setQty(item, Number(input.value))
    input.value = String(qtyOf(item))
}

/** Whether any line holds a quantity other than the quote's. */
const qtyChanged = computed(() => props.items.some(item => qtyOf(item) !== item.qty))

/** Core's update_qty action: every line of the page, changed or not, as its form posts them. */
async function updateCart() {
    const changed = props.items.filter(item => qtyOf(item) !== item.qty)
    if (!changed.length) return

    const cart: Record<number, { qty: number }> = {}
    for (const item of props.items) cart[item.item_id] = { qty: qtyOf(item) }

    // Other modules may change the quantities, or refuse
    try {
        await dispatch('checkout_cart_update_items_before', { cart })
    } catch (error) {
        useMessagesStore().add('error', (error as Error).message)
        return
    }

    submit(
        cartUrls.value.update_post,
        { update_cart_action: 'update_qty', cart },
        props.sections.update_post ?? [],
        () => {
            for (const item of changed) trackCartChange(item, qtyOf(item) - item.qty)
        }
    )
}

function removeItem(item: CartItem) {
    submit(cartUrls.value.delete, { id: item.item_id }, props.sections.delete ?? [], () =>
        trackCartChange(item, -item.qty)
    )
}

/** Every line at once — core's empty_cart action, behind the confirm its JS asks. */
function clearCart() {
    if (!window.confirm(props.labels.confirmClearCart ?? '')) return
    submit(cartUrls.value.update_post, { update_cart_action: 'empty_cart' }, props.sections.update_post ?? [])
}

// ── Coupon ───────────────────────────────────────────────────────────────────

const couponInput = ref('')

// The coupon on the quote, held here rather than read from the props
const appliedCoupon = ref(props.coupon_code)
const couponError = ref('')
const couponBusy = ref(false)
// Collapsed until there is a code on the quote to show
const couponOpen = ref(Boolean(props.coupon_code))

const ROW_TRIGGER = 'l-collapse-title text-start text-lg font-semibold'

/**
 * A call on this quote's cart endpoints
 */
async function cartRest(path: string, method: string, headers: Record<string, string> = {}) {
    const response = await fetch(`${props.cart_api_url}/${path}`, {
        method,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest', ...headers },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        // Magento's own message for the code that was refused; nothing is invented here.
        throw new Error(String(data?.message ?? ''))
    }
    return data
}

/** Whatever the coupon call changed, the amounts and the cart section changed with it. */
async function afterCoupon() {
    serverTotals.value = null
    await Promise.all([loadTotals(), customerData.reload(['cart'])])
}

async function applyCoupon(event: Event) {
    const code = couponInput.value.trim()
    if (!code || couponBusy.value || !props.cart_api_url) return

    const form = event.currentTarget as HTMLFormElement
    // Filled by the reCAPTCHA widget when the form is protected (OOCS_LynxReCaptcha), absent otherwise
    const captcha = (form.elements.namedItem('g-recaptcha-response') as HTMLTextAreaElement | null)?.value

    couponBusy.value = true
    couponError.value = ''
    try {
        // Other modules may change the code, or refuse it
        const data = { code }
        await dispatch('checkout_cart_coupon_apply_before', data)
        await cartRest(`coupons/${encodeURIComponent(data.code)}`, 'PUT', captcha ? { 'X-ReCaptcha': captcha } : {})
        appliedCoupon.value = data.code
        couponInput.value = ''
        await afterCoupon()
    } catch (error) {
        couponError.value = (error as Error).message
    } finally {
        couponBusy.value = false
    }
}

async function removeCoupon() {
    if (couponBusy.value || !props.cart_api_url) return

    couponBusy.value = true
    couponError.value = ''
    try {
        await cartRest('coupons', 'DELETE')
        appliedCoupon.value = ''
        await afterCoupon()
    } catch (error) {
        couponError.value = (error as Error).message
    } finally {
        couponBusy.value = false
    }
}

// The theme's button, the same recipe Button.vue and Account/Orders.vue use
const PRIMARY_BUTTON = 'l-btn l-btn-primary min-w-[10rem] px-6 uppercase'

// Outlined, for Estimate / Apply.
const SECONDARY_BUTTON = 'l-btn l-btn-outline l-btn-secondary min-w-[10rem] px-6 uppercase'
</script>

<template>
    <!-- Centred 1024px column; the two-column switch is spelled out at 960px, not lg. -->
    <!-- Width and gutters follow the account and checkout pages so the storefront reads as one page throughout -->
    <div class="w-full">
        <!-- cartPage.heading_container -->
        <div class="grid gap-y-4 mb-4">
            <!-- h1: 1.5rem -->
            <h1 class="text-3xl font-semibold text-base-content">{{ labels.cart }}</h1>
        </div>

        <!-- The quote's validation errors, where Luma prints them too -->
        <div
            v-if="props.error_messages.length && props.items.length"
            class="mb-6 border-0 border-s-[length:calc(var(--border)*2)] border-solid border-error bg-error/5 ps-4 pe-4 py-3 grid gap-1"
        >
            <p
                v-for="message in props.error_messages"
                :key="message"
                class="text-sm font-semibold leading-normal text-error"
            >
                {{ message }}
            </p>
        </div>

        <!-- Empty cart -->
        <div v-if="!props.items.length" class="border-0 border-t border-solid border-base-300 py-12 text-center">
            <p class="text-base text-base-content/70">{{ labels.empty }}</p>
            <Link :href="cartUrls.continue" :class="PRIMARY_BUTTON" class="mt-6">{{ labels.continueShopping }}</Link>
        </div>

        <!-- cartPage.body -->
        <div
            v-else
            class="grid gap-8 min-[60rem]:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]"
            :class="busy ? 'opacity-60 pointer-events-none' : ''"
        >
            <!-- items_container -->
            <div class="min-[60rem]:col-start-1 min-[60rem]:row-start-1">
                <!-- One row per line: image | name and options | quantity | line total | remove; below sm the quantity drops under the name and remove under the total -->
                <ul class="grid border-t border-base-300">
                    <li
                        v-for="item in props.items"
                        :key="item.item_id"
                        class="grid grid-cols-[120px_minmax(0,1fr)_auto] sm:grid-cols-[120px_minmax(0,1fr)_auto_7rem_2.5rem] items-start gap-x-4 gap-y-3 py-5 border-b border-base-300"
                        :class="item.is_salable ? '' : 'opacity-50'"
                    >
                        <Link :href="item.url" class="row-span-2 sm:row-span-1 self-start">
                            <img
                                :src="item.image"
                                :alt="item.name"
                                loading="lazy"
                                width="240"
                                height="300"
                                class="w-full h-auto object-contain object-center rounded-selector bg-base-200"
                            />
                        </Link>

                        <div class="col-start-2 row-start-1 sm:self-center grid gap-2 min-w-0 leading-normal">
                            <Link
                                :href="item.url"
                                class="text-lg font-semibold leading-snug text-base-content no-underline hover:text-link break-words"
                                >{{ item.name }}</Link
                            >

                            <!-- Same rule core's minicart template applies: a list of values, or one flagged file/html -->
                            <div v-if="item.options?.length" class="grid gap-0.5 min-w-0 text-sm text-base-content/80">
                                <span v-for="option in item.options" :key="option.label" class="min-w-0 break-words">
                                    <span>{{ option.label }}:</span>
                                    <span
                                        v-if="
                                            Array.isArray(option.value) ||
                                            option.option_type === 'file' ||
                                            option.option_type === 'html'
                                        "
                                        class="ms-1"
                                        v-html="Array.isArray(option.value) ? option.value.join('<br>') : option.value"
                                    />
                                    <span v-else class="ms-1">{{ option.value }}</span>
                                </span>
                            </div>

                            <p v-if="!item.is_salable" class="text-sm font-semibold text-error">
                                {{ labels.outOfStock }}
                            </p>
                            <p
                                v-for="message in item.messages ?? []"
                                :key="message.text"
                                class="text-sm"
                                :class="message.type === 'error' ? 'font-semibold text-error' : 'text-base-content/70'"
                            >
                                {{ message.text }}
                            </p>
                        </div>

                        <div
                            class="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1 sm:self-center sm:relative flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                            <!-- quantityStepper, same control as the product page -->
                            <div class="l-input w-32 px-0 gap-0">
                                <button
                                    type="button"
                                    :aria-label="labels.decreaseQty"
                                    class="h-10 w-10 shrink-0 flex items-center justify-center bg-transparent border-none text-base-content cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                    :disabled="qtyOf(item) <= 1"
                                    @click="stepQty(item, -1)"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                    >
                                        <path d="M5 12h14" />
                                    </svg>
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    :aria-label="labels.quantity"
                                    :value="qtyOf(item)"
                                    class="h-10 w-full min-w-0 text-center text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                    @change="commitQty(item, $event)"
                                />
                                <button
                                    type="button"
                                    :aria-label="labels.increaseQty"
                                    class="h-10 w-10 shrink-0 flex items-center justify-center bg-transparent border-none text-base-content cursor-pointer"
                                    @click="stepQty(item, 1)"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                    >
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </button>
                            </div>
                            <span
                                v-if="qtyOf(item) > 1"
                                class="sm:absolute sm:top-full sm:inset-x-0 sm:mt-1 sm:text-center text-sm text-base-content/70 tabular-nums whitespace-nowrap"
                            >
                                {{
                                    (labels.each ?? '').replace(
                                        '%1',
                                        formatPrice(withTax ? item.price_incl_tax : item.price)
                                    )
                                }}
                            </span>
                        </div>

                        <div
                            class="col-start-3 row-start-1 row-span-2 self-stretch grid grid-rows-[auto_1fr] justify-items-end sm:contents"
                        >
                            <span
                                class="sm:col-start-4 sm:row-start-1 sm:self-center sm:justify-self-end grid justify-items-end font-semibold text-base-content tabular-nums"
                            >
                                <span>{{ formatPrice(withTax ? item.row_total_incl_tax : item.row_total) }}</span>
                                <span
                                    v-if="showExclTax"
                                    class="text-sm font-normal text-base-content/70 whitespace-nowrap"
                                    >{{ labels.exclTax }}: {{ formatPrice(item.row_total) }}</span
                                >
                            </span>
                            <button
                                type="button"
                                :aria-label="labels.removeFromCart"
                                :title="labels.removeFromCart"
                                class="row-start-2 self-end -mb-1.5 sm:col-start-5 sm:row-start-1 sm:self-center sm:justify-self-end sm:mb-0 p-1.5 -me-1.5 bg-transparent border-none rounded-field text-base-content/70 hover:text-error hover:bg-base-200 cursor-pointer transition-colors"
                                @click="removeItem(item)"
                            >
                                <svg
                                    class="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div class="col-span-full empty:hidden">
                            <Container name="checkout.cart.item.actions" :context="item" :parent="props" />
                        </div>
                    </li>
                </ul>

                <!-- The actions of core's cart form, under the list inside the items column -->
                <div class="mt-4 flex items-center justify-end gap-4">
                    <button
                        v-if="props.can_clear_cart"
                        type="button"
                        :disabled="busy"
                        class="text-sm font-semibold text-base-content/70 hover:text-base-content hover:underline underline-offset-4 bg-transparent border-none p-0 cursor-pointer transition-colors disabled:opacity-60"
                        @click="clearCart"
                    >
                        {{ labels.clearCart }}
                    </button>
                    <button type="button" :disabled="busy || !qtyChanged" :class="SECONDARY_BUTTON" @click="updateCart">
                        {{ labels.updateCart }}
                    </button>
                </div>

                <!-- The pager, only once the cart is longer than the configured threshold -->
                <div v-if="props.total_pages > 1" class="mt-6 flex items-center justify-between gap-4">
                    <p class="text-sm text-base-content/70">
                        {{
                            (labels.pageOf ?? '')
                                .replace('%1', String(props.current_page))
                                .replace('%2', String(props.total_pages))
                        }}
                        <span aria-hidden="true" class="text-base-content/40">·</span>
                        {{ (labels.itemsCount ?? '').replace('%1', String(props.total_count)) }}
                    </p>
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            :disabled="props.current_page <= 1"
                            :class="SECONDARY_BUTTON"
                            class="min-w-0 px-5"
                            @click="page(props.current_page - 1)"
                        >
                            {{ labels.previous }}
                        </button>
                        <button
                            type="button"
                            :disabled="props.current_page >= props.total_pages"
                            :class="SECONDARY_BUTTON"
                            class="min-w-0 px-5"
                            @click="page(props.current_page + 1)"
                        >
                            {{ labels.next }}
                        </button>
                    </div>
                </div>

                <!-- The discount code, then every block in checkout.cart.order.actions: rows of one box -->
                <div
                    class="mt-6 border-(length:--border) border-solid border-base-300 rounded-box divide-y-(length:--border) divide-base-300 empty:hidden"
                >
                    <!-- Applied, the code stays in the field and the field goes quiet -->
                    <div
                        v-if="props.cart_api_url"
                        class="l-collapse l-collapse-arrow rounded-none"
                        :class="couponOpen ? 'l-collapse-open' : ''"
                    >
                        <button
                            type="button"
                            :aria-expanded="couponOpen"
                            :class="ROW_TRIGGER"
                            @click="couponOpen = !couponOpen"
                        >
                            {{ labels.couponTitle }}
                        </button>
                        <div v-if="couponOpen" class="l-collapse-content grid gap-3">
                            <label class="sr-only" for="couponCode">{{ labels.couponCode }}</label>
                            <div v-if="appliedCoupon" class="flex gap-2 max-w-md">
                                <input
                                    id="couponCode"
                                    :value="appliedCoupon"
                                    type="text"
                                    disabled
                                    class="l-input flex-1 min-w-0"
                                />
                                <button
                                    type="button"
                                    :disabled="couponBusy"
                                    class="l-btn l-btn-outline l-btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="removeCoupon"
                                >
                                    {{ labels.remove }}
                                </button>
                            </div>
                            <form
                                v-else
                                class="flex gap-2 max-w-md"
                                data-recaptcha="coupon_code"
                                @submit.prevent="applyCoupon"
                            >
                                <input
                                    id="couponCode"
                                    v-model="couponInput"
                                    type="text"
                                    name="coupon_code"
                                    :placeholder="labels.enterCode"
                                    :aria-invalid="!!couponError"
                                    :aria-describedby="couponError ? 'couponCode-error' : undefined"
                                    class="l-input flex-1 min-w-0"
                                />
                                <button
                                    type="submit"
                                    :disabled="!couponInput.trim() || couponBusy"
                                    class="l-btn l-btn-outline l-btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {{ labels.apply }}
                                </button>
                            </form>
                            <!-- Whatever Magento said about the code it refused. -->
                            <p v-if="couponError" id="couponCode-error" role="alert" class="text-sm text-error">
                                {{ couponError }}
                            </p>
                        </div>
                    </div>
                    <Container name="checkout.cart.order.actions" :parent="props" />
                </div>

                <div v-if="$slots.after_items" class="mt-10 grid gap-6"><slot name="after_items" /></div>
            </div>

            <!-- Beside the items: the order summary with checkout -->
            <div class="h-full min-[60rem]:col-start-2 min-[60rem]:row-start-1">
                <div class="grid gap-4 min-[60rem]:sticky min-[60rem]:top-[5.5rem]">
                    <div class="l-card l-card-border border-base-300 bg-base-100 p-6 grid gap-5">
                        <h2 class="text-lg font-semibold text-base-content">{{ labels.orderSummary }}</h2>

                        <div class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 leading-normal text-base-content">
                            <!-- Waiting on the totals endpoint: rows of the same height as the real ones -->
                            <template v-if="totalsPending">
                                <template v-for="n in 3" :key="`sk-${n}`">
                                    <span class="l-skeleton justify-self-start h-4 w-24"></span>
                                    <span class="l-skeleton justify-self-end self-center h-4 w-16"></span>
                                </template>
                            </template>
                            <template v-for="row in summaryRows" v-else :key="row.code">
                                <span class="justify-self-start">{{ row.label }}</span>
                                <span class="justify-self-end self-center">{{ row.value_formatted }}</span>
                            </template>
                        </div>

                        <div
                            class="grid grid-cols-[1fr_auto] gap-x-3 border-t border-base-300 pt-4 font-semibold text-base-content"
                        >
                            <template v-if="totalsPending">
                                <span class="l-skeleton justify-self-start self-center h-4 w-28"></span>
                                <span class="l-skeleton justify-self-end self-center h-4 w-20"></span>
                            </template>
                            <template v-else-if="grandTotal">
                                <span class="justify-self-start">{{ grandTotal.label }}</span>
                                <span class="justify-self-end self-center tabular-nums">{{
                                    grandTotal.value_formatted
                                }}</span>
                            </template>
                        </div>

                        <div class="flex flex-col items-center justify-center gap-3 w-full">
                            <!-- A plain anchor, not <Link>: entering checkout has to be a full page load -->
                            <a
                                v-if="!props.has_error"
                                :href="cartUrls.checkout"
                                :class="PRIMARY_BUTTON"
                                class="w-full"
                                >{{ labels.proceedToCheckout }}</a
                            >

                            <!-- Express checkout buttons an admin put in the `express` slot -->
                            <div
                                v-if="$slots.express && !props.has_error"
                                class="w-full grid justify-items-stretch empty:hidden"
                                :class="expressRowClass"
                            >
                                <slot name="express" />
                            </div>

                            <!-- Where core puts its multishipping link: next to the checkout button -->
                            <a
                                v-if="cartUrls.multishipping && !props.has_error"
                                :href="cartUrls.multishipping"
                                class="text-sm leading-tight text-center text-link underline underline-offset-4 transition-colors"
                            >
                                {{ labels.multiAddress }}
                            </a>
                        </div>
                    </div>

                    <slot name="summary_after" />
                </div>
            </div>
        </div>
    </div>
</template>
