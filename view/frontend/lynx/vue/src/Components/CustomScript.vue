<script lang="ts">
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const

// The page builder previews the storefront in an iframe under /lynx_pagebuilder/
const inPreview = () =>
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('/lynx_pagebuilder/') || window.parent !== window)

// Each snippet runs once per full page load, however often its node mounts
const started = new Set<string>()

// Recreated script elements run, unlike parsed ones; each external script waits for the one before it unless async
async function run(code: string, nonce: string) {
    const template = document.createElement('template')
    template.innerHTML = code
    for (const node of Array.from(template.content.childNodes)) {
        if (!(node instanceof HTMLScriptElement)) {
            document.body.appendChild(document.importNode(node, true))
            continue
        }
        const script = document.createElement('script')
        for (const attr of Array.from(node.attributes)) script.setAttribute(attr.name, attr.value)
        if (nonce) script.nonce = nonce
        if (node.src) {
            script.async = node.hasAttribute('async')
            const loaded = new Promise(resolve => {
                script.onload = script.onerror = resolve
            })
            document.body.appendChild(script)
            if (!script.async) await loaded
        } else {
            script.text = node.text
            document.body.appendChild(script)
        }
    }
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, useAttrs } from 'vue'

// Nodes carry data-lynx-id/label for the page builder; with no root element they go on the preview placeholder
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

const props = withDefaults(defineProps<Lynx.CustomScript>(), {
    code: '',
    load: 'interaction',
    delay: 10,
    consent_cookies: '',
    nonce: '',
})

let stop = () => {}

onMounted(() => {
    const { code, load, delay, consent_cookies, nonce } = props
    if (inPreview() || !code.trim() || started.has(code)) return

    const cookieNames = consent_cookies
        .split(/\r?\n/)
        .map(name => name.trim())
        .filter(Boolean)
    const consentGiven = () => {
        if (!cookieNames.length) return true
        const present = new Set(
            document.cookie
                .split(';')
                .map(part => part.trim())
                .filter(part => part.includes('=') && !part.endsWith('='))
                .map(part => part.slice(0, part.indexOf('=')))
        )
        return cookieNames.every(name => present.has(name))
    }

    let timer = 0
    const start = () => {
        if (started.has(code) || !consentGiven()) return
        started.add(code)
        stop()
        void run(code, nonce)
    }
    stop = () => {
        for (const name of INTERACTION_EVENTS) document.removeEventListener(name, start)
        window.clearTimeout(timer)
    }

    for (const name of INTERACTION_EVENTS) document.addEventListener(name, start, { passive: true })
    if (load === 'immediate') start()
    else if (load === 'idle') {
        const idle = () =>
            typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(start) : setTimeout(start, 1)
        if (document.readyState === 'complete') idle()
        else window.addEventListener('load', idle, { once: true })
    }
    // 'delay' waits this long; 'interaction' uses it as the fallback for a visitor who never interacts
    if ((load === 'delay' || load === 'interaction') && delay > 0) timer = window.setTimeout(start, delay * 1000)
})

onUnmounted(() => stop())
</script>

<template>
    <div
        v-if="inPreview()"
        :data-lynx-id="attrs['data-lynx-id']"
        :data-lynx-label="attrs['data-lynx-label']"
        class="rounded-box border-(length:--border) border-dashed border-base-300 px-3 py-2 text-sm text-base-content/70"
    >
        Custom Script · loads: {{ props.load
        }}<template v-if="props.load === 'interaction' || props.load === 'delay'"> ({{ props.delay }}s)</template>
    </div>
</template>
