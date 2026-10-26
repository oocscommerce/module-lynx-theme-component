<script setup lang="ts">
// Link, not <a>: an in-store URL navigates through Inertia instead of reloading the whole app
import { Link } from '@inertiajs/vue3'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { config } from 'OOCS_LynxTheme/utils/storeConfig'

type CookieConfig = { path?: string; domain?: string; secure?: boolean; samesite?: string }

// A flag of this banner's own, not core's user_allowed_save_cookie
const COOKIE_NAME = 'cookie_consent'

const props = withDefaults(defineProps<Lynx.CookieConsent>(), {
    display: 'bar',
    labels: () => ({}),
})

const visible = ref(false)

function readCookie(name: string): string | null {
    const cookiePrefix = name + '='
    for (let cookie of document.cookie.split(';')) {
        cookie = cookie.trimStart()
        if (cookie.startsWith(cookiePrefix)) return decodeURIComponent(cookie.slice(cookiePrefix.length))
    }
    return null
}

// Teleports render only once mounted
const mounted = ref(false)
onMounted(() => {
    mounted.value = true
})

onMounted(() => {
    visible.value = readCookie(COOKIE_NAME) === null
})

function accept() {
    const cookie = config<CookieConfig>('cookie', {})
    const days = Number(props.lifetime) || 0
    const expires = days > 0 ? `; expires=${new Date(Date.now() + days * 86400000).toUTCString()}` : ''
    document.cookie =
        `${COOKIE_NAME}=1${expires}` +
        `; path=${cookie.path || '/'}` +
        (cookie.domain ? `; domain=${cookie.domain}` : '') +
        (cookie.secure ? '; secure' : '') +
        `; samesite=${cookie.samesite || 'Lax'}`
    visible.value = false
}

// Nothing is stored for a decline, as with core's notice, which has no decline at all
function decline() {
    visible.value = false
}

// While shown, its height goes to html's scroll padding (lynx.css), so focus scrolled into view is not left under it
const banner = ref<HTMLElement | null>(null)
let bannerObserver: ResizeObserver | undefined
function clearPadding() {
    bannerObserver?.disconnect()
    document.documentElement.style.removeProperty('--consent-top')
    document.documentElement.style.removeProperty('--consent-bottom')
}
watch(banner, el => {
    clearPadding()
    if (!el) return
    const side = props.position === 'top' ? '--consent-top' : '--consent-bottom'
    bannerObserver = new ResizeObserver(() =>
        document.documentElement.style.setProperty(side, `${Math.round(el.getBoundingClientRect().height)}px`)
    )
    bannerObserver.observe(el)
})
onUnmounted(clearPadding)

const JUSTIFY: Record<string, string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }
const enterFrom: Record<string, string> = { bottom: 'translate-y-full opacity-0', top: '-translate-y-full opacity-0' }
const leaveTo: Record<string, string> = { bottom: 'translate-y-full opacity-0', top: '-translate-y-full opacity-0' }
</script>

<template>
    <Teleport v-if="mounted" to="body">
        <Transition
            enter-active-class="transition-all duration-500 ease-out"
            :enter-from-class="enterFrom[position]"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            :leave-to-class="leaveTo[position]"
        >
            <div
                v-if="visible"
                ref="banner"
                class="fixed z-[9999] px-4 py-4 sm:px-6"
                :class="[
                    position === 'bottom' ? 'bottom-0 inset-x-0' : 'top-0 inset-x-0',
                    display === 'card' ? ['flex pointer-events-none', JUSTIFY[justify] ?? JUSTIFY.center] : '',
                ]"
            >
                <!-- Bar style -->
                <div
                    v-if="display === 'bar'"
                    class="bg-base-100 rounded-box border-(length:--border) border-base-300 shadow-dialog px-4 sm:px-6 py-3"
                >
                    <div class="max-w-site mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 py-1">
                        <!-- Message -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-base-content/70 leading-relaxed">
                                {{ message }}
                                <Link
                                    v-if="policy_url"
                                    :href="policy_url"
                                    class="text-link underline underline-offset-4 transition-colors ms-1"
                                    >{{ policy_label }}</Link
                                >
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-2 shrink-0 flex-wrap">
                            <button
                                v-if="decline_label"
                                class="l-btn l-btn-outline l-btn-secondary px-6"
                                @click="decline"
                            >
                                {{ decline_label }}
                            </button>
                            <button class="l-btn l-btn-primary px-6" @click="accept">
                                {{ accept_label }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card style -->
                <div
                    v-else
                    class="pointer-events-auto w-full max-w-md bg-base-100 rounded-box shadow-dialog border-(length:--border) border-base-300 p-5"
                    :class="position === 'bottom' ? 'mb-4' : 'mt-4'"
                >
                    <div class="mb-4">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-base-content mb-1">{{ labels.title }}</p>
                            <p class="text-sm text-base-content/70 leading-relaxed">
                                {{ message }}
                            </p>
                            <Link
                                v-if="policy_url"
                                :href="policy_url"
                                class="inline-block mt-1 text-sm text-link underline underline-offset-4 transition-colors"
                                >{{ policy_label }}</Link
                            >
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button
                            v-if="decline_label"
                            class="l-btn l-btn-outline l-btn-secondary flex-1 px-4"
                            @click="decline"
                        >
                            {{ decline_label }}
                        </button>
                        <button class="l-btn l-btn-primary flex-1 px-4" @click="accept">
                            {{ accept_label }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
