<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Link } from '@inertiajs/vue3'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import { useFormKeyStore } from 'OOCS_LynxTheme/stores/global/formKeyStore'
import { useHeaderStore } from 'OOCS_LynxTheme/stores/global/headerStore'
import { useMessagesStore } from 'OOCS_LynxTheme/stores/global/messagesStore'
import { formatPrice } from 'OOCS_LynxTheme/utils/price'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

// The cart icon with its count, and the drawer it opens: a block of the header's actions
const props = withDefaults(defineProps<Lynx.MiniCart>(), {
    checkout_urls: () => ({
        checkout: '/checkout/',
        cart: '/checkout/cart/',
        remove_item: '/checkout/sidebar/removeItem/',
    }),
    sections: () => ({}),
    labels: () => ({}),
    subtotal_tax_display: 1,
})

const customerData = useCustomerDataStore()
const header = useHeaderStore()
const cartOpen = computed({
    get: () => header.open === 'cart',
    set: open => (header.open = open ? 'cart' : null),
})

// Teleports render only once mounted
const mounted = ref(false)
onMounted(() => (mounted.value = true))

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && cartOpen.value) cartOpen.value = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
onUnmounted(() => cartObserver?.disconnect())

type CartItem = {
    item_id: string
    product_name: string
    product_url: string
    // The section carries the unit price twice: product_price, formatted by the server into markup, and this raw amount,
    // a pair when the store shows prices both with and without tax
    product_price_value: number | { incl_tax: number; excl_tax: number }
    qty: number
    product_image?: { src: string; alt: string }
    // The section builds these for core's own knockout template, so some of them are markup
    options?: { label: string; value: string | string[]; option_type?: string }[]
    // The quote item's message, such as a backorder notice; core's minicart prints it as a notice
    message?: string | null
}

// Most recently added first, as the cart section lists them and the cart page shows them
const cartItems = computed(() => (customerData.cart?.items ?? []) as CartItem[])

// The subtotal rows Display Subtotal asks for, from the raw amounts Plugin\CartSubtotalTax adds to the section
const subtotalRows = computed(() => {
    const cart = customerData.cart
    const incl = { label: props.labels.subtotalInclTax, value: Number(cart?.subtotal_incl_tax_value ?? 0) }
    const excl = { label: props.labels.subtotalExclTax, value: Number(cart?.subtotal_excl_tax_value ?? 0) }
    if (props.subtotal_tax_display === 3) return [incl, excl]
    return [{ ...(props.subtotal_tax_display === 2 ? incl : excl), label: props.labels.subtotal }]
})

/**
 * How many of those items are in the DOM
 */
const CART_BATCH = 6
const cartShown = ref(CART_BATCH)
const visibleCartItems = computed(() => cartItems.value.slice(0, cartShown.value))

const cartScroller = ref<HTMLElement | null>(null)
const cartSentinel = ref<HTMLElement | null>(null)
let cartObserver: IntersectionObserver | null = null

/**
 * Grow the list while the sentinel is still in view, then ask again
 */
function onCartSentinel(entries: IntersectionObserverEntry[]) {
    if (!entries.some(e => e.isIntersecting)) return
    if (cartShown.value >= cartItems.value.length) return

    cartShown.value += CART_BATCH
    void nextTick(() => {
        if (!cartObserver || !cartSentinel.value) return
        cartObserver.unobserve(cartSentinel.value)
        cartObserver.observe(cartSentinel.value)
    })
}

// The panel is v-if, so its elements exist only while open
watch(cartOpen, async open => {
    cartObserver?.disconnect()
    cartObserver = null
    if (!open) return

    cartShown.value = CART_BATCH
    await nextTick()
    if (!cartSentinel.value) return

    cartObserver = new IntersectionObserver(onCartSentinel, { root: cartScroller.value })
    cartObserver.observe(cartSentinel.value)
})

// A modal: the page behind goes inert (the drawer is teleported out of #lynx), focus moves in and back to the opener
const cartPanel = ref<HTMLElement | null>(null)
let cartOpener: HTMLElement | null = null
watch(cartOpen, async open => {
    const page = document.getElementById('lynx')
    if (open) {
        cartOpener = document.activeElement as HTMLElement | null
        page?.setAttribute('inert', '')
        await nextTick()
        cartPanel.value?.querySelector('button')?.focus()
        return
    }
    page?.removeAttribute('inert')
    cartOpener?.focus()
    cartOpener = null
})

const formKeyStore = useFormKeyStore()
const messagesStore = useMessagesStore()
const removingItemId = ref<string | null>(null)

// Mini cart items whose options are expanded under "See Details"
const openCartDetails = ref(new Set<string>())
function toggleCartDetails(itemId: string) {
    const next = new Set(openCartDetails.value)
    if (!next.delete(itemId)) next.add(itemId)
    openCartDetails.value = next
}

const genericError = () => config<Record<string, string>>('labels', {}).genericError

async function removeCartItem(itemId: string) {
    removingItemId.value = itemId
    try {
        const response = await fetch(props.checkout_urls.remove_item, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ item_id: itemId, form_key: formKeyStore.ensure() }),
        })
        // Core answers { success } or { success: false, error_message }; anything else is no answer at all
        const result = (await response.json().catch(() => ({}))) as { success?: boolean; error_message?: string }
        if (result.success) {
            // Nothing server-side bumps the section versions, so refresh exactly the sections this endpoint invalidates
            await customerData.reload(props.sections.remove_item ?? [])
        } else {
            messagesStore.addServerMessage('error', result.error_message || genericError())
        }
    } catch {
        // The request never reached the server
        messagesStore.addServerMessage('error', genericError())
    } finally {
        removingItemId.value = null
    }
}
</script>

<template>
    <div class="flex">
        <button
            type="button"
            :aria-label="labels.myCart"
            class="relative p-1.5 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
            @click="cartOpen = true"
        >
            <svg class="h-6 w-6 lg:h-7 lg:w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span
                v-if="customerData.cartCount"
                class="l-badge l-badge-sm l-badge-primary text-sm min-w-5 px-1 absolute -top-1.5 -end-1.5"
                >{{ customerData.cartCount }}</span
            >
        </button>

        <Teleport v-if="mounted" to="body">
            <Transition
                enter-active-class="transition-opacity duration-300 ease-[ease]"
                leave-active-class="transition-opacity duration-300 ease-[ease]"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
            >
                <div v-if="cartOpen" class="fixed inset-0 z-50 bg-neutral/50" @click="cartOpen = false" />
            </Transition>

            <!-- Right panel: cart -->
            <Transition
                enter-active-class="transition-transform duration-[350ms] ease-in-out"
                enter-from-class="ltr:translate-x-full rtl:-translate-x-full"
                enter-to-class="translate-x-0"
                leave-active-class="transition-transform duration-[350ms] ease-in-out"
                leave-from-class="translate-x-0"
                leave-to-class="ltr:translate-x-full rtl:-translate-x-full"
            >
                <div
                    v-if="cartOpen"
                    ref="cartPanel"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="labels.myCart"
                    class="fixed inset-y-0 end-0 z-[51] flex flex-col w-full max-w-md bg-base-100 shadow-dialog"
                >
                    <!-- Header -->
                    <div
                        class="flex items-center justify-between px-4 py-4 sm:px-6 bg-base-200 border-b border-base-300"
                    >
                        <h2 class="text-lg font-semibold text-base-content">
                            {{ labels.myCart
                            }}<template v-if="customerData.cartCount"> ({{ customerData.cartCount }})</template>
                        </h2>
                        <button
                            type="button"
                            :aria-label="labels.close"
                            class="p-2 -me-2 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
                            @click="cartOpen = false"
                        >
                            <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"
                                />
                            </svg>
                        </button>
                    </div>

                    <!-- Items -->
                    <div ref="cartScroller" class="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                        <!-- Item layout: image column + stacked name / options / qty / price -->
                        <ul v-if="cartItems.length" class="space-y-6">
                            <li
                                v-for="item in visibleCartItems"
                                :key="item.item_id"
                                class="grid grid-cols-[auto_1fr_auto] gap-x-4"
                                :class="removingItemId === item.item_id ? 'opacity-50' : ''"
                            >
                                <Link
                                    v-if="item.product_image"
                                    :href="item.product_url"
                                    class="col-start-1 row-span-full self-start"
                                    @click="cartOpen = false"
                                >
                                    <img
                                        :src="item.product_image.src"
                                        :alt="item.product_image.alt"
                                        width="156"
                                        height="156"
                                        loading="lazy"
                                        decoding="async"
                                        class="w-[120px] h-auto"
                                    />
                                </Link>
                                <div
                                    v-else
                                    class="w-[120px] h-[120px] border-(length:--border) border-base-300 col-start-1 row-span-full self-start"
                                ></div>
                                <div class="col-start-2 flex flex-col items-start gap-2">
                                    <Link
                                        :href="item.product_url"
                                        class="text-sm font-semibold text-base-content hover:text-link no-underline"
                                        @click="cartOpen = false"
                                        >{{ item.product_name }}</Link
                                    >
                                    <span class="text-sm text-base-content">{{ labels.qty }}: {{ item.qty }}</span>
                                    <!-- Both prices: the one with tax, then the one without underneath -->
                                    <span v-if="typeof item.product_price_value === 'object'" class="grid">
                                        <span class="text-sm text-base-content">{{
                                            formatPrice(item.product_price_value.incl_tax)
                                        }}</span>
                                        <span class="text-sm text-base-content/70"
                                            >{{ labels.exclTax }}:
                                            {{ formatPrice(item.product_price_value.excl_tax) }}</span
                                        >
                                    </span>
                                    <span v-else class="text-sm text-base-content">{{
                                        formatPrice(item.product_price_value)
                                    }}</span>
                                    <!-- Options behind See Details, as on the checkout summary -->
                                    <template v-if="item.options?.length">
                                        <button
                                            type="button"
                                            :aria-expanded="openCartDetails.has(item.item_id)"
                                            class="inline-flex items-center gap-1 p-0 bg-transparent border-none text-sm text-link cursor-pointer"
                                            @click="toggleCartDetails(item.item_id)"
                                        >
                                            {{ labels.seeDetails }}
                                            <svg
                                                class="w-4 h-4 transition-transform"
                                                :class="openCartDetails.has(item.item_id) ? 'rotate-180' : ''"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </button>
                                        <!-- Same rule core's minicart template applies: a list of values, or one flagged file/html -->
                                        <dl v-if="openCartDetails.has(item.item_id)" class="grid gap-1.5 text-sm">
                                            <div v-for="opt in item.options" :key="opt.label">
                                                <dt class="font-semibold text-base-content/80">{{ opt.label }}</dt>
                                                <dd
                                                    v-if="
                                                        Array.isArray(opt.value) ||
                                                        opt.option_type === 'file' ||
                                                        opt.option_type === 'html'
                                                    "
                                                    class="text-base-content/70"
                                                    v-html="
                                                        Array.isArray(opt.value) ? opt.value.join('<br>') : opt.value
                                                    "
                                                />
                                                <dd v-else class="text-base-content/70">{{ opt.value }}</dd>
                                            </div>
                                        </dl>
                                    </template>
                                    <p v-if="item.message" class="text-sm text-base-content/70">{{ item.message }}</p>
                                </div>
                                <button
                                    type="button"
                                    :aria-label="labels.removeItem"
                                    :title="labels.removeItem"
                                    class="col-start-3 row-span-full self-start p-1.5 -m-1.5 text-base-content hover:text-error bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                    :disabled="removingItemId === item.item_id"
                                    @click="removeCartItem(item.item_id)"
                                >
                                    <svg
                                        class="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke-width="2"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                                        />
                                    </svg>
                                </button>
                            </li>
                            <!-- Sentinel the observer watches -->
                            <li ref="cartSentinel" aria-hidden="true" class="h-px -mt-6"></li>
                        </ul>

                        <!-- Empty state -->
                        <div v-else class="flex h-full flex-col items-center justify-center text-center">
                            <svg
                                class="h-12 w-12"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
                                />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            <p class="mt-4 text-lg font-semibold text-base-content">{{ labels.cartEmpty }}</p>
                            <button
                                type="button"
                                class="mt-2 text-base text-link underline underline-offset-4 bg-transparent border-none cursor-pointer transition-colors"
                                @click="cartOpen = false"
                            >
                                {{ labels.continueShopping }}
                            </button>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div v-if="cartItems.length" class="border-t border-base-300 px-4 py-6 sm:px-6">
                        <div
                            v-for="row in subtotalRows"
                            :key="row.label"
                            class="flex items-baseline justify-between text-base-content mb-1"
                        >
                            <span class="text-base font-semibold">{{ row.label }}</span>
                            <span class="text-lg font-semibold">{{ formatPrice(row.value) }}</span>
                        </div>
                        <p class="text-sm text-base-content/70 mb-5">{{ labels.shippingNote }}</p>
                        <!-- A plain anchor, not <Link>: entering checkout has to be a full page load -->
                        <a
                            :href="checkout_urls.checkout"
                            class="l-btn l-btn-primary w-full gap-2 px-6 uppercase no-underline"
                            @click="cartOpen = false"
                        >
                            <!-- Lock icon, 16px -->
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <rect
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                    ry="2"
                                />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            {{ labels.checkout }}
                        </a>
                        <p class="mt-4 text-center text-sm">
                            <Link
                                :href="checkout_urls.cart"
                                class="text-link underline underline-offset-4 transition-colors"
                                @click="cartOpen = false"
                                >{{ labels.viewEditCart }}</Link
                            >
                        </p>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
