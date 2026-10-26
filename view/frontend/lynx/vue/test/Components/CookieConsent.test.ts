import { router } from '@inertiajs/vue3'
import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import CookieConsent from 'OOCS_LynxThemeComponent/Components/CookieConsent.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    message: 'We use cookies to improve your experience on our site.',
    policy_url: '/privacy-policy-cookie-restriction-mode',
    policy_label: 'Cookie Policy',
    accept_label: 'Accept All',
    decline_label: 'Decline',
    position: 'bottom',
    display: 'bar',
    justify: 'center',
    lifetime: 365,
    labels: { title: 'Cookie Notice' },
}

const config = { cookie: { path: '/shop', domain: '.shop.test', secure: true, samesite: 'Strict' } }

/** The banner is teleported to the body once mounted */
const mountBanner = async (overrides = {}) => {
    const wrapper = mountNode(CookieConsent, { props: { ...props, ...overrides }, config })
    await flushPromises()
    return wrapper
}

const button = (text: string) => [...document.body.querySelectorAll('button')].find(b => b.textContent?.trim() === text)

/** Every cookie string written, read through the real setter */
const spyCookie = () => vi.spyOn(document, 'cookie', 'set')

describe('CookieConsent', () => {
    it('shows the notice with its policy link while no choice is stored', async () => {
        await mountBanner()

        expect(document.body.textContent).toContain(props.message)
        expect(document.body.querySelector('a')?.getAttribute('href')).toBe('/privacy-policy-cookie-restriction-mode')
        expect(document.body.querySelector('a')?.textContent?.trim()).toBe('Cookie Policy')
        expect(button('Decline')).toBeDefined()
        expect(button('Accept All')).toBeDefined()
    })

    it('stays hidden once a choice was accepted', async () => {
        document.cookie = 'cookie_consent=1; path=/'

        await mountBanner()

        expect(document.body.textContent).not.toContain(props.message)
    })

    it('stores the acceptance for the set days with the store cookie settings', async () => {
        vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z'), toFake: ['Date'] })
        await mountBanner()
        const cookie = spyCookie()

        button('Accept All')?.click()
        await flushPromises()

        expect(cookie).toHaveBeenCalledWith(
            'cookie_consent=1; expires=Fri, 01 Jan 2027 00:00:00 GMT; path=/shop; domain=.shop.test; secure; samesite=Strict'
        )
        expect(document.body.textContent).not.toContain(props.message)
    })

    it('stores a session cookie when the lifetime is 0', async () => {
        await mountBanner({ lifetime: 0 })
        const cookie = spyCookie()

        button('Accept All')?.click()

        expect(cookie).toHaveBeenCalledWith('cookie_consent=1; path=/shop; domain=.shop.test; secure; samesite=Strict')
    })

    it('keeps scrolled-to focus clear of the banner while it shows', async () => {
        // Observes by calling back at once, the element 72px tall
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(private callback: () => void) {}
                observe() {
                    this.callback()
                }
                disconnect() {}
            }
        )
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
        await mountBanner()
        const html = document.documentElement.style
        expect(html.getPropertyValue('--consent-bottom')).toBe('72px')

        button('Decline')?.click()
        await flushPromises()
        expect(html.getPropertyValue('--consent-bottom')).toBe('')
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('hides on decline without storing anything', async () => {
        await mountBanner()
        const cookie = spyCookie()

        button('Decline')?.click()
        await flushPromises()

        expect(cookie).not.toHaveBeenCalled()
        expect(document.body.textContent).not.toContain(props.message)
    })

    it('shows the card with its title, and no decline without a label', async () => {
        await mountBanner({ display: 'card', decline_label: '' })

        expect(document.body.textContent).toContain('Cookie Notice')
        expect(button('Decline')).toBeUndefined()
        expect(button('Accept All')).toBeDefined()
    })

    it('opens the policy page through Inertia', async () => {
        const visit = vi.spyOn(router, 'visit').mockImplementation(() => {})
        await mountBanner()

        document.body.querySelector('a')?.click()

        expect(visit).toHaveBeenCalledWith('/privacy-policy-cookie-restriction-mode', expect.anything())
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(CookieConsent, { props })

        // Only the browser knows whether a choice is stored
        expect(html).not.toContain(props.message)
        expect(warnings).toEqual([])
    })
})
