<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import { useHeaderStore } from 'OOCS_LynxTheme/stores/global/headerStore'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

// Absolute base of the store view, which the page url is resolved against
const baseUrl = config<string>('baseUrl', '')

// Signing in returns to the page being viewed, as core's login url carries it: referer/<Url\Encoder::encode()>/
const withReferer = (login: string, pageUrl: string, base: string) => {
    if (!base) return login
    const [path, query] = login.split('?')
    const referer = btoa(new URL(pageUrl, base).href).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~')
    return `${path.replace(/\/?$/, '/')}referer/${referer}/${query ? `?${query}` : ''}`
}

// Compare and wish list links, and the account icon with its panel: a block of the header's actions (desktop;
// on a phone the header's menu drawer carries the account)
const props = withDefaults(defineProps<Lynx.HeaderAccount>(), {
    customer_urls: () => ({}),
    labels: () => ({}),
})

const customerData = useCustomerDataStore()
const header = useHeaderStore()
const accountOpen = computed({
    get: () => header.open === 'account',
    set: open => (header.open = open ? 'account' : null),
})
const accountButton = ref<HTMLButtonElement | null>(null)
const menuId = useId()

const customerUrls = computed(() => ({
    login: '/customer/account/login/',
    create: '/customer/account/create/',
    account: '/customer/account/',
    logout: '/customer/account/logout/',
    wishlist: '/wishlist/',
    ...props.customer_urls,
}))

const page = usePage()
// The page url follows Inertia visits, so the referer is the page shown, not the first one loaded
const loginUrl = computed(() => withReferer(customerUrls.value.login, page.url, baseUrl))

// Compare Products: shown while the list has products, as core's header link
const compareSection = computed(() => customerData.section('compare-products'))
const compareCount = computed(() => (props.show_compare ? Number(compareSection.value?.count ?? 0) : 0))
const compareUrl = computed(() =>
    typeof compareSection.value?.listUrl === 'string' ? compareSection.value.listUrl : ''
)

// Escape closes the panel and hands focus back to its button
function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !accountOpen.value) return
    accountOpen.value = false
    accountButton.value?.focus()
}

// Teleports render only once mounted
const mounted = ref(false)
onMounted(() => (mounted.value = true))
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
    <div class="flex items-center">
        <Link
            v-if="compareCount && compareUrl"
            :href="compareUrl"
            :aria-label="`${labels.compare} (${compareCount})`"
            class="relative hidden lg:inline-block p-1.5 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors no-underline"
        >
            <svg class="h-6 w-6 lg:h-7 lg:w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"
                />
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
                />
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
                />
            </svg>
            <span class="l-badge l-badge-sm l-badge-primary text-sm min-w-5 px-1 absolute -top-1.5 -end-1.5">{{
                compareCount
            }}</span>
        </Link>

        <!-- Wishlist: a customer-only feature, hidden for guests -->
        <Link
            v-if="customerData.isLoggedIn"
            :href="customerUrls.wishlist"
            :aria-label="labels.wishlist"
            class="hidden lg:inline-block p-1.5 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors no-underline"
        >
            <svg class="h-6 w-6 lg:h-7 lg:w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
            </svg>
        </Link>

        <!-- Account dropdown -->
        <div class="relative hidden lg:block">
            <button
                ref="accountButton"
                type="button"
                :aria-label="labels.myAccount"
                :aria-expanded="accountOpen"
                :aria-controls="`${menuId}-account`"
                class="p-1.5 bg-transparent border-none cursor-pointer transition-colors"
                :class="accountOpen ? 'text-primary' : 'text-base-content hover:text-primary'"
                @click="accountOpen = !accountOpen"
            >
                <svg
                    class="h-6 w-6 lg:h-7 lg:w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    />
                    <circle stroke-linecap="round" stroke-linejoin="round" cx="12" cy="7" r="4" />
                </svg>
            </button>
            <Transition
                enter-active-class="transition-[opacity,transform] duration-150 ease-[ease]"
                leave-active-class="transition-[opacity,transform] duration-150 ease-[ease]"
                enter-from-class="opacity-0 -translate-y-1.5"
                leave-to-class="opacity-0 -translate-y-1.5"
            >
                <div
                    v-if="accountOpen"
                    :id="`${menuId}-account`"
                    class="absolute end-0 top-full mt-1 w-48 bg-base-100 rounded-box shadow-menu border-(length:--border) border-base-300 py-1.5 z-50"
                >
                    <template v-if="customerData.isLoggedIn">
                        <p
                            v-if="customerData.displayName"
                            class="px-4 py-3 text-base font-semibold text-base-content border-b border-base-300"
                        >
                            {{ (labels.greeting ?? '').replace('%1', customerData.displayName) }}
                        </p>
                        <Link
                            :href="customerUrls.account"
                            class="block px-4 py-3 text-base text-base-content hover:bg-base-200 transition-colors no-underline"
                            @click="accountOpen = false"
                        >
                            {{ labels.myAccount }}
                        </Link>
                        <a
                            :href="customerUrls.logout"
                            class="block px-4 py-3 text-base text-base-content hover:bg-base-200 transition-colors no-underline"
                        >
                            {{ labels.signOut }}
                        </a>
                    </template>
                    <template v-else>
                        <Link
                            :href="loginUrl"
                            class="flex items-center gap-3 px-4 py-3 text-base text-base-content hover:bg-base-200 transition-colors no-underline"
                            @click="accountOpen = false"
                        >
                            <svg
                                class="h-4 w-4 text-base-content/70 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                />
                                <circle stroke-linecap="round" stroke-linejoin="round" cx="12" cy="7" r="4" />
                            </svg>
                            {{ labels.signIn }}
                        </Link>
                        <Link
                            :href="customerUrls.create"
                            class="flex items-center gap-3 px-4 py-3 text-base text-base-content hover:bg-base-200 transition-colors no-underline"
                            @click="accountOpen = false"
                        >
                            <svg
                                class="h-4 w-4 text-base-content/70 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                />
                                <circle stroke-linecap="round" stroke-linejoin="round" cx="8.5" cy="7" r="4" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M20 8v6M23 11h-6" />
                            </svg>
                            {{ labels.createAccount }}
                        </Link>
                    </template>
                </div>
            </Transition>
        </div>

        <Teleport v-if="mounted" to="body">
            <div v-if="accountOpen" class="fixed inset-0 z-[39]" @click="accountOpen = false" />
        </Teleport>
    </div>
</template>
