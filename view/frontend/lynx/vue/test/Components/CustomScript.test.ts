import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import CustomScript from 'OOCS_LynxThemeComponent/Components/CustomScript.vue'
import { describe, expect, it, vi } from 'vitest'

// Each snippet runs once per page load, so every case uses a snippet of its own
let count = 0
const snippet = () => {
    count++
    return `<div id="widget-${count}"></div><script data-snippet="${count}">window.lynxSnippet = ${count}</script>`
}

const props = (code: string, extra = {}) => ({
    code,
    load: 'interaction',
    delay: 10,
    consent_cookies: '',
    nonce: '',
    ...extra,
})

/** The script element the snippet injected, if it ran */
const injected = () => document.body.querySelector<HTMLScriptElement>(`script[data-snippet="${count}"]`)

describe('CustomScript', () => {
    it('waits for the first interaction, then injects the snippet with the nonce', async () => {
        const wrapper = mountNode(CustomScript, { props: props(snippet(), { nonce: 'abc123' }) })
        await flushPromises()
        expect(injected()).toBeNull()

        document.dispatchEvent(new Event('pointerdown'))
        await flushPromises()

        expect(document.getElementById(`widget-${count}`)).not.toBeNull()
        expect(injected()?.text).toBe(`window.lynxSnippet = ${count}`)
        expect(injected()?.nonce).toBe('abc123')
        expect(wrapper.text()).toBe('')
    })

    it('runs after the delay for a visitor who never interacts', async () => {
        vi.useFakeTimers()
        mountNode(CustomScript, { props: props(snippet(), { delay: 5 }) })

        await vi.advanceTimersByTimeAsync(4999)
        expect(injected()).toBeNull()
        await vi.advanceTimersByTimeAsync(1)
        expect(injected()).not.toBeNull()
    })

    it('runs at once when set to immediate, and only once per page load', async () => {
        const code = snippet()
        mountNode(CustomScript, { props: props(code, { load: 'immediate' }) }).unmount()
        mountNode(CustomScript, { props: props(code, { load: 'immediate' }) })
        await flushPromises()

        expect(document.body.querySelectorAll(`script[data-snippet="${count}"]`)).toHaveLength(1)
    })

    it('runs when the browser is idle', async () => {
        const idle = vi.fn((callback: () => void) => callback())
        vi.stubGlobal('requestIdleCallback', idle)

        mountNode(CustomScript, { props: props(snippet(), { load: 'idle' }) })
        await flushPromises()

        expect(idle).toHaveBeenCalled()
        expect(injected()).not.toBeNull()
    })

    it('holds back until every consent cookie is set', async () => {
        mountNode(CustomScript, { props: props(snippet(), { consent_cookies: 'cookie_consent\nanalytics_ok\n' }) })

        document.cookie = 'cookie_consent=1; path=/'
        document.cookie = 'analytics_ok=; path=/'
        document.dispatchEvent(new Event('keydown'))
        await flushPromises()
        expect(injected()).toBeNull()

        document.cookie = 'analytics_ok=yes; path=/'
        document.dispatchEvent(new Event('keydown'))
        await flushPromises()
        expect(injected()).not.toBeNull()
    })

    it('stops waiting once removed', async () => {
        mountNode(CustomScript, { props: props(snippet()) }).unmount()

        document.dispatchEvent(new Event('scroll'))
        await flushPromises()

        expect(injected()).toBeNull()
    })

    it('does nothing for an empty snippet', async () => {
        mountNode(CustomScript, { props: props('  ', { load: 'immediate' }) })
        await flushPromises()

        expect(document.body.querySelectorAll('script')).toHaveLength(0)
    })

    it('shows a placeholder instead of running in the page builder preview', async () => {
        history.replaceState(null, '', '/lynx_pagebuilder/preview/index/')
        const wrapper = mountNode(CustomScript, { props: props(snippet(), { load: 'immediate', delay: 3 }) })
        await flushPromises()

        expect(injected()).toBeNull()
        expect(wrapper.text()).toContain('immediate')
        expect(wrapper.text()).not.toContain('3s')
        history.replaceState(null, '', '/')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(CustomScript, { props: props(snippet()) })

        expect(html).not.toContain('lynxSnippet')
        expect(warnings).toEqual([])
    })
})
