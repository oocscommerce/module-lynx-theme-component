<script setup lang="ts">
import {
    ref,
    computed,
    reactive,
    watch,
    nextTick,
    onMounted,
    onUnmounted,
    useId,
    defineComponent,
    h,
    type Component,
    type PropType,
    type VNode,
} from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
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

type NavCategory = Lynx.NavCategory

// Dropdown rows below the top level: a row with children opens its own flyout beside it, at any depth.
// Each row reveals only its direct flyout, so hovering a level does not open every level under it.
const FLYOUT =
    'flyout absolute top-[-1px] start-full data-[flip]:start-auto data-[flip]:end-full min-w-[180px] bg-base-100 rounded-box shadow-menu border-(length:--border) border-base-300 py-1.5 z-50 opacity-0 invisible pointer-events-none ltr:translate-x-1 rtl:-translate-x-1 transition-all duration-150'
const ROW =
    'relative [&:hover>.flyout]:opacity-100 [&:hover>.flyout]:visible [&:hover>.flyout]:pointer-events-auto [&:hover>.flyout]:translate-x-0 [&:has(:focus-visible)>.flyout]:opacity-100 [&:has(:focus-visible)>.flyout]:visible [&:has(:focus-visible)>.flyout]:pointer-events-auto [&:has(:focus-visible)>.flyout]:translate-x-0'
const ROW_LINK =
    'flex items-center justify-between px-4 py-2.5 text-base text-base-content no-underline hover:underline decoration-primary decoration-2 underline-offset-4 whitespace-nowrap transition-colors'
const CHEVRON =
    'M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z'

/** Opens a flyout toward the start when the end side has no room for it */
function placeFlyout(event: Event) {
    const row = event.currentTarget as HTMLElement
    const flyout = row.querySelector<HTMLElement>(':scope > .flyout')
    if (!flyout) return
    const box = row.getBoundingClientRect()
    const room = getComputedStyle(row).direction === 'rtl' ? box.left : window.innerWidth - box.right
    flyout.toggleAttribute('data-flip', room < flyout.offsetWidth)
}

const MenuRows: Component = defineComponent({
    name: 'MenuRows',
    props: { items: { type: Array as PropType<NavCategory[]>, required: true } },
    setup: props => (): VNode[] =>
        props.items.map(item =>
            h('div', { key: item.url, class: ROW, onMouseenter: placeFlyout, onFocusin: placeFlyout }, [
                h(Link, { href: item.url, class: ROW_LINK }, () => [
                    item.label,
                    item.children.length
                        ? h(
                              'svg',
                              {
                                  class: 'h-5 w-5 text-base-content/40 shrink-0 ms-4 rtl:scale-x-[-1]',
                                  viewBox: '0 0 20 20',
                                  fill: 'currentColor',
                              },
                              [h('path', { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: CHEVRON })]
                          )
                        : null,
                ]),
                item.children.length ? h('div', { class: FLYOUT }, h(MenuRows, { items: item.children })) : null,
            ])
        ),
})

const props = withDefaults(defineProps<Lynx.Header>(), {
    logo_src: '',
    logo_alt: '',
    logo_href: '/',
    menu_style: 'dropdown',
    categories: () => [],
    customer_urls: () => ({}),
    labels: () => ({}),
})

// menu_render = 'lazy': desktop submenus mount on first hover/focus instead of upfront
const renderedMenus = reactive(new Set<string>())
const isMenuRendered = (url: string) => props.menu_render !== 'lazy' || renderedMenus.has(url)
// A mega panel spans the header, so neither its top item nor the header row is the positioned box
const mega = computed(() => props.menu_style === 'mega')
// The mega columns span at least the top nav, so a few sit spread under it rather than bunched at the start
const navEl = ref<HTMLElement | null>(null)
const navWidth = ref(0)
let navObserver: ResizeObserver | undefined
onMounted(() => {
    if (!mega.value || !navEl.value) return
    navObserver = new ResizeObserver(([entry]) => (navWidth.value = Math.round(entry.contentRect.width)))
    navObserver.observe(navEl.value)
})
onUnmounted(() => navObserver?.disconnect())

// Sticky: its height goes to html's scroll padding (lynx.css), so focus scrolled into view is not left under it
const stickyEl = ref<HTMLElement | null>(null)
let stickyObserver: ResizeObserver | undefined
function observeSticky() {
    stickyObserver?.disconnect()
    document.documentElement.style.removeProperty('--sticky-header-height')
    if (!props.sticky || !stickyEl.value) return
    stickyObserver = new ResizeObserver(([entry]) =>
        document.documentElement.style.setProperty(
            '--sticky-header-height',
            `${Math.round(entry.contentRect.height)}px`
        )
    )
    stickyObserver.observe(stickyEl.value)
}
onMounted(observeSticky)
watch(() => props.sticky, observeSticky)
onUnmounted(() => {
    stickyObserver?.disconnect()
    document.documentElement.style.removeProperty('--sticky-header-height')
})
const submenuState = (i: number) =>
    openMenu.value === i
        ? 'visible'
        : 'opacity-0 invisible pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0'

const customerData = useCustomerDataStore()

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
const compareCount = computed(() => Number(compareSection.value?.count ?? 0))
const compareUrl = computed(() =>
    typeof compareSection.value?.listUrl === 'string' ? compareSection.value.listUrl : ''
)

// The menu drawer is one of the header's panels; the search, account and cart are blocks in its actions slot
const header = useHeaderStore()
const menuOpen = computed({
    get: () => header.open === 'menu',
    set: open => (header.open = open ? 'menu' : null),
})
const drawerTab = ref<'menu' | 'account'>('menu')
// The categories the shopper has stepped into in the drawer, outermost first
const navStack = ref<NavCategory[]>([])
const navLevel = computed(() => navStack.value.at(-1) ?? null)
// Inside a category, its own page comes first as "View All"
const navItems = computed(() =>
    navLevel.value
        ? [{ label: props.labels.viewAll ?? '', url: navLevel.value.url, children: [] }, ...navLevel.value.children]
        : props.categories
)
// Desktop submenu opened from its button (hover opens them too): the category's index, or null
const openMenu = ref<number | null>(null)
const menuId = useId()

/**
 * Close the submenu once focus has left its category
 */
function onMenuFocusout(e: FocusEvent, index: number) {
    if (openMenu.value === index && !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
        openMenu.value = null
    }
}

// A drawer, the menu or the cart, holds the page still behind it
watch(
    () => header.open,
    open => {
        document.body.style.overflow = open === 'menu' || open === 'cart' ? 'hidden' : ''
    }
)
watch(menuOpen, open => {
    if (open) return
    navStack.value = []
})

// A modal: the page behind goes inert (the drawer is teleported out of #lynx), focus moves in and back to the opener
const menuPanel = ref<HTMLElement | null>(null)
let menuOpener: HTMLElement | null = null
watch(menuOpen, async open => {
    const page = document.getElementById('lynx')
    if (open) {
        menuOpener = document.activeElement as HTMLElement | null
        page?.setAttribute('inert', '')
        await nextTick()
        menuPanel.value?.querySelector('button')?.focus()
        return
    }
    page?.removeAttribute('inert')
    menuOpener?.focus()
    menuOpener = null
})

function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    // An open submenu closes first, handing focus back to its button
    if (openMenu.value !== null) {
        document.getElementById(`${menuId}-toggle-${openMenu.value}`)?.focus()
        openMenu.value = null
        return
    }
    if (menuOpen.value) menuOpen.value = false
}
// Teleports render only once mounted
const mounted = ref(false)
onMounted(() => {
    mounted.value = true
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
// The header outlives a visit, and focus stays on the submenu link that started it
const offNavigate = router.on('navigate', () => {
    openMenu.value = null
})
onUnmounted(offNavigate)
</script>

<template>
    <!-- display:contents -->
    <div class="contents">
        <div ref="stickyEl" :class="props.sticky ? 'sticky top-0 z-40' : 'relative'">
            <!-- Header bar; lifted over the below-search backdrop so the menu and icons stay usable -->
            <header class="bg-base-100 shadow-thin" :class="header.searchBelow ? 'relative z-[41]' : ''">
                <div class="constrained">
                    <!-- Static on desktop for a mega menu, whose panel then spans the whole header -->
                    <div
                        class="relative flex items-center justify-between min-h-14 lg:min-h-header gap-4"
                        :class="mega ? 'lg:static' : ''"
                    >
                        <!-- Left: hamburger + logo -->
                        <div class="flex items-center gap-3">
                            <button
                                type="button"
                                :aria-label="labels.menu"
                                class="lg:hidden p-2 -ms-2 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
                                @click="
                                    () => {
                                        menuOpen = true
                                        drawerTab = 'menu'
                                    }
                                "
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
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                            </button>
                            <Link
                                :href="props.logo_href"
                                class="absolute start-1/2 -translate-x-1/2 rtl:translate-x-1/2 lg:static lg:translate-x-0 flex items-center shrink-0"
                            >
                                <img :src="props.logo_src" :alt="props.logo_alt" class="h-8 sm:h-9 w-auto" />
                            </Link>
                        </div>

                        <!-- Desktop nav -->
                        <nav ref="navEl" class="hidden lg:flex items-stretch self-stretch gap-0">
                            <div
                                v-for="(cat, i) in categories"
                                :key="cat.url"
                                class="group flex items-center gap-1 px-4"
                                :class="mega ? '' : 'relative'"
                                @mouseenter="renderedMenus.add(cat.url)"
                                @focusin="renderedMenus.add(cat.url)"
                                @focusout="onMenuFocusout($event, i)"
                            >
                                <Link
                                    :href="cat.url"
                                    class="text-base text-base-content border-b-(length:--border) border-transparent group-hover:border-primary transition-colors whitespace-nowrap"
                                >
                                    {{ cat.label }}
                                </Link>
                                <!-- The link goes to the category; this button opens its submenu for keyboard and screen readers -->
                                <button
                                    v-if="cat.children.length"
                                    :id="`${menuId}-toggle-${i}`"
                                    type="button"
                                    :aria-label="cat.label"
                                    :aria-expanded="openMenu === i"
                                    :aria-controls="`${menuId}-menu-${i}`"
                                    class="p-0 bg-transparent border-none cursor-pointer text-base-content/50"
                                    @click="openMenu = openMenu === i ? null : i"
                                >
                                    <svg
                                        class="h-5 w-5 transition-transform duration-200 group-hover:rotate-180"
                                        :class="openMenu === i ? 'rotate-180' : ''"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fill-rule="evenodd"
                                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                            clip-rule="evenodd"
                                        />
                                    </svg>
                                </button>

                                <!-- Mega menu: full-width panel under the header, a column per level 2 and its level 3 below -->
                                <div
                                    v-if="mega && cat.children.length && isMenuRendered(cat.url)"
                                    :id="`${menuId}-menu-${i}`"
                                    class="absolute inset-x-0 top-full z-50 bg-base-100 border-t-(length:--border) border-base-300 shadow-menu transition-all duration-150"
                                    :class="submenuState(i)"
                                >
                                    <div class="constrained">
                                        <!-- Shrinks to its columns, centred: spread across the nav when few, wrapping when many -->
                                        <div class="flex py-8">
                                            <div
                                                class="flex flex-wrap justify-between gap-x-10 gap-y-8 mx-auto max-w-full"
                                                :style="navWidth ? { minWidth: `${navWidth}px` } : undefined"
                                            >
                                                <div
                                                    v-for="item in cat.children"
                                                    :key="item.url"
                                                    class="grid content-start gap-2 max-w-60"
                                                >
                                                    <Link
                                                        :href="item.url"
                                                        class="mb-1 text-base font-semibold text-base-content no-underline hover:underline decoration-primary decoration-2 underline-offset-4"
                                                    >
                                                        {{ item.label }}
                                                    </Link>
                                                    <Link
                                                        v-for="child in item.children"
                                                        :key="child.url"
                                                        :href="child.url"
                                                        class="text-sm text-base-content/70 no-underline hover:text-base-content transition-colors"
                                                    >
                                                        {{ child.label }}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Level 2 dropdown -->
                                <div
                                    v-else-if="cat.children.length && isMenuRendered(cat.url)"
                                    :id="`${menuId}-menu-${i}`"
                                    class="absolute top-full start-0 min-w-[200px] bg-base-100 rounded-box shadow-menu border-(length:--border) border-base-300 py-1.5 z-50 transition-all duration-150"
                                    :class="submenuState(i)"
                                >
                                    <MenuRows :items="cat.children" />
                                </div>
                            </div>
                        </nav>

                        <!-- Right icons -->
                        <div class="flex items-center gap-0">
                            <slot name="actions" />
                        </div>
                    </div>
                </div>
            </header>

            <!-- Where a search set to show below the header hangs its panel, so it spans the page under the header -->
            <div id="page-header-below" class="contents" />
        </div>

        <!-- ── Drawers ── -->
        <Teleport v-if="mounted" to="body">
            <!-- Backdrop -->
            <Transition
                enter-active-class="transition-opacity duration-300 ease-[ease]"
                leave-active-class="transition-opacity duration-300 ease-[ease]"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
            >
                <div v-if="menuOpen" class="fixed inset-0 z-50 bg-neutral/50" @click="menuOpen = false" />
            </Transition>

            <!-- Left panel: menu -->
            <Transition
                enter-active-class="transition-transform duration-[350ms] ease-in-out"
                enter-from-class="ltr:-translate-x-full rtl:translate-x-full"
                enter-to-class="translate-x-0"
                leave-active-class="transition-transform duration-[350ms] ease-in-out"
                leave-from-class="translate-x-0"
                leave-to-class="ltr:-translate-x-full rtl:translate-x-full"
            >
                <!-- A strip of the backdrop stays in view on a phone, and tapping it closes the menu; capped from the sm breakpoint up -->
                <div
                    v-if="menuOpen"
                    ref="menuPanel"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="labels.menu"
                    class="fixed inset-y-0 start-0 z-[51] flex flex-col w-[calc(100%-2.75rem)] sm:max-w-md bg-base-100 shadow-dialog overflow-hidden"
                >
                    <!-- Header: close (or back, in the account view) first, then the title, on its own shade -->
                    <div class="flex items-center gap-2 px-4 py-4 bg-base-200 border-b border-base-300">
                        <button
                            v-if="drawerTab === 'account' || navLevel"
                            type="button"
                            class="flex flex-1 min-w-0 items-center gap-4 -m-4 p-4 text-lg font-semibold text-start text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
                            @click="drawerTab === 'account' ? (drawerTab = 'menu') : navStack.pop()"
                        >
                            <svg
                                class="h-6 w-6 shrink-0 rtl:scale-x-[-1]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                                />
                            </svg>
                            <span class="truncate">{{
                                drawerTab === 'account' ? labels.myAccount : navLevel?.label
                            }}</span>
                        </button>
                        <template v-else>
                            <button
                                type="button"
                                :aria-label="labels.close"
                                class="p-2 -ms-2 text-base-content hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
                                @click="menuOpen = false"
                            >
                                <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"
                                    />
                                </svg>
                            </button>
                            <span class="text-lg font-semibold text-base-content">{{ labels.menu }}</span>
                        </template>
                    </div>

                    <!-- Category list: a category with children opens them in place -->
                    <div v-if="drawerTab === 'menu'" class="flex-1 overflow-y-auto px-4 pb-4">
                        <div
                            v-for="cat in navItems"
                            :key="cat.url"
                            class="flex -mx-2 border-b border-base-300 last:border-0"
                        >
                            <button
                                v-if="cat.children.length"
                                type="button"
                                class="flex flex-1 items-center justify-between gap-2 py-4 px-2 text-base text-start text-base-content bg-transparent border-none cursor-pointer transition-colors no-underline"
                                @click="navStack.push(cat)"
                            >
                                {{ cat.label }}
                                <svg
                                    class="h-5 w-5 shrink-0 text-base-content/70 rtl:scale-x-[-1]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                                    />
                                </svg>
                            </button>
                            <Link
                                v-else
                                :href="cat.url"
                                class="flex flex-1 items-center justify-between gap-2 py-4 px-2 text-base text-start text-base-content bg-transparent border-none cursor-pointer transition-colors no-underline"
                                @click="menuOpen = false"
                                >{{ cat.label }}</Link
                            >
                        </div>
                    </div>

                    <!-- Account at the foot of the menu: a guest signs in straight away, a customer opens the account view -->
                    <template v-if="drawerTab === 'menu'">
                        <button
                            v-if="customerData.isLoggedIn"
                            type="button"
                            class="flex items-center gap-3 w-full px-4 py-4 border-0 border-t border-solid border-base-300 bg-transparent text-base text-start text-base-content cursor-pointer"
                            @click="drawerTab = 'account'"
                        >
                            <svg
                                class="h-6 w-6 shrink-0"
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
                            <span class="flex-1 min-w-0 truncate">{{
                                customerData.displayName
                                    ? (labels.greeting ?? '').replace('%1', customerData.displayName)
                                    : labels.myAccount
                            }}</span>
                            <svg
                                class="h-5 w-5 shrink-0 text-base-content/70 rtl:scale-x-[-1]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2"
                                stroke="currentColor"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                        <div v-else class="flex items-center gap-3 px-4 py-4 border-t border-base-300">
                            <svg
                                class="h-6 w-6 shrink-0 text-base-content"
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
                            <span class="flex-1 text-base text-base-content">{{ labels.account }}</span>
                            <Link
                                :href="loginUrl"
                                class="text-base text-link underline underline-offset-4"
                                @click="menuOpen = false"
                                >{{ labels.signIn }}</Link
                            >
                        </div>
                    </template>

                    <div v-else class="flex-1 overflow-y-auto px-4 pb-4 divide-y divide-base-300">
                        <template v-if="customerData.isLoggedIn">
                            <Link
                                :href="customerUrls.account"
                                class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                                @click="menuOpen = false"
                                >{{ labels.myAccount }}</Link
                            >
                            <Link
                                :href="customerUrls.wishlist"
                                class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                                @click="menuOpen = false"
                                >{{ labels.wishlist }}</Link
                            >
                            <a
                                :href="customerUrls.logout"
                                class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                                >{{ labels.signOut }}</a
                            >
                        </template>
                        <template v-else>
                            <Link
                                :href="loginUrl"
                                class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                                @click="menuOpen = false"
                                >{{ labels.signIn }}</Link
                            >
                            <Link
                                :href="customerUrls.create"
                                class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                                @click="menuOpen = false"
                                >{{ labels.createAccount }}</Link
                            >
                        </template>
                        <Link
                            v-if="compareCount && compareUrl"
                            :href="compareUrl"
                            class="flex items-center justify-between py-4 text-base font-semibold text-base-content hover:text-primary transition-colors no-underline"
                            @click="menuOpen = false"
                            >{{ `${labels.compare} (${compareCount})` }}</Link
                        >
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
