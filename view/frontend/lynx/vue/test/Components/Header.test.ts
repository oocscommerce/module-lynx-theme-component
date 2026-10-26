import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import Header from 'OOCS_LynxThemeComponent/Components/Header.vue'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'

const categories = [
    {
        label: 'Women',
        url: 'https://shop.test/women.html',
        children: [
            {
                label: 'Tops',
                url: 'https://shop.test/women/tops-women.html',
                children: [
                    { label: 'Jackets', url: 'https://shop.test/women/tops-women/jackets-women.html', children: [] },
                ],
            },
            { label: 'Bottoms', url: 'https://shop.test/women/bottoms-women.html', children: [] },
        ],
    },
    { label: 'Sale', url: 'https://shop.test/sale.html', children: [] },
]

const props = {
    menu_style: 'dropdown',
    logo_src: 'https://shop.test/static/frontend/OOCS/LynxVue/en_US/images/logo.svg',
    logo_alt: 'Main Website Store',
    logo_href: 'https://shop.test/',
    sticky: true,
    menu_render: 'full',
    categories,
    customer_urls: {
        login: 'https://shop.test/customer/account/login/',
        create: 'https://shop.test/customer/account/create/',
        account: 'https://shop.test/customer/account/',
        logout: 'https://shop.test/customer/account/logout/',
        wishlist: 'https://shop.test/wishlist/',
    },
    labels: {
        wishlist: 'My Wish List',
        greeting: 'Hi, %1',
        myAccount: 'My Account',
        account: 'Account',
        viewAll: 'View All',
        signOut: 'Sign Out',
        signIn: 'Sign In',
        createAccount: 'Create an Account',
        close: 'Close',
        menu: 'Menu',
        compare: 'Compare Products',
    },
}

const config = {
    labels: { genericError: 'Something went wrong. Please try again.' },
    // Add Store Code to URLs on
    baseUrl: 'https://shop.test/default/',
    storeCode: 'default',
    currencyCode: 'USD',
    priceFormat: {
        pattern: '$%s',
        precision: 2,
        requiredPrecision: 2,
        decimalSymbol: '.',
        groupSymbol: ',',
        groupLength: 3,
    },
    sections: { url: '/customer/section/load', lifetime: 3600, clientSide: [] },
}

/** The visitor as the customer-data sections describe them */
const visitor = (loggedIn: boolean, cart: Record<string, unknown> | null = null) => {
    const customerData = useCustomerDataStore()
    customerData.setAuth({ isLoggedIn: loggedIn })
    customerData.sections = {
        ...(loggedIn ? { customer: { firstname: 'Ann' } } : {}),
        ...(cart ? { cart } : {}),
    }
    return flushPromises()
}

const mountHeader = async (overrides: Record<string, unknown> = {}, slots?: Record<string, () => unknown>) => {
    const wrapper = mountNode(Header, { props: { ...props, ...overrides }, config, slots, attachTo: document.body })
    await flushPromises()
    return wrapper
}

const $ = <T extends Element = HTMLElement>(selector: string) => document.body.querySelector<T>(selector)
const $$ = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)]
const byText = (selector: string, text: string) => $$(selector).find(el => el.textContent?.trim() === text)
const click = async (element: Element | null | undefined) => {
    ;(element as HTMLElement).click()
    await flushPromises()
}
const press = async (key: string, target: EventTarget = document) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    await flushPromises()
}

describe('Header', () => {
    it('shows the logo and the category menu with its submenus', async () => {
        await mountHeader()

        expect($('header img')?.getAttribute('src')).toBe(props.logo_src)
        expect($('header img')?.getAttribute('alt')).toBe('Main Website Store')
        expect($('header img')?.closest('a')?.getAttribute('href')).toBe('https://shop.test/')
        expect($$('nav a').map(a => a.textContent?.trim())).toEqual(['Women', 'Tops', 'Jackets', 'Bottoms', 'Sale'])
        const toggle = $('nav button') as HTMLElement
        expect(toggle.getAttribute('aria-label')).toBe('Women')
        expect(toggle.getAttribute('aria-expanded')).toBe('false')
        expect($(`#${toggle.getAttribute('aria-controls')}`)?.textContent).toContain('Bottoms')
        // Only a category with children has a submenu toggle
        expect($$('nav button')).toHaveLength(1)
    })

    it('opens a submenu from its button and closes it on Escape, focus back on the button', async () => {
        await mountHeader()
        const toggle = $('nav button') as HTMLElement

        await click(toggle)
        expect(toggle.getAttribute('aria-expanded')).toBe('true')

        await press('Escape')
        expect(toggle.getAttribute('aria-expanded')).toBe('false')
        expect(document.activeElement).toBe(toggle)
    })

    it('mounts a lazy submenu only on first hover', async () => {
        await mountHeader({ menu_render: 'lazy' })
        expect($$('nav a').map(a => a.textContent?.trim())).toEqual(['Women', 'Sale'])

        ;($('nav a') as HTMLElement).parentElement?.dispatchEvent(new Event('mouseenter'))
        await flushPromises()

        expect($$('nav a').map(a => a.textContent?.trim())).toContain('Bottoms')
    })

    it('opens a dropdown flyout beside each level, as deep as the tree goes, toward the start near the edge', async () => {
        const deep = [
            {
                label: 'Women',
                url: '/women.html',
                children: [
                    {
                        label: 'Tops',
                        url: '/women/tops.html',
                        children: [
                            {
                                label: 'Jackets',
                                url: '/women/tops/jackets.html',
                                children: [
                                    { label: 'Rain Jackets', url: '/women/tops/jackets/rain.html', children: [] },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]
        await mountHeader({ categories: deep })
        const jackets = byText('nav a', 'Jackets')!.parentElement as HTMLElement
        // Rows nest: Tops' flyout holds Jackets, whose own flyout holds Rain Jackets
        expect(jackets.parentElement?.closest('.flyout')?.parentElement?.querySelector(':scope > a')?.textContent).toBe(
            'Tops'
        )
        const flyout = jackets.querySelector(':scope > .flyout') as HTMLElement
        expect(flyout.textContent?.trim()).toBe('Rain Jackets')

        jackets.getBoundingClientRect = () => ({ left: 900, right: window.innerWidth - 50 }) as DOMRect
        Object.defineProperty(flyout, 'offsetWidth', { value: 180 })
        jackets.dispatchEvent(new MouseEvent('mouseenter'))
        expect(flyout.hasAttribute('data-flip')).toBe(true)
    })

    it('shows a mega menu as one column per subcategory, spread at least across the top nav', async () => {
        let resize: ResizeObserverCallback = () => {}
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: ResizeObserverCallback) {
                    resize = callback
                }
                observe() {}
                disconnect() {}
            }
        )
        // Not sticky: the stub keeps the nav's observer
        await mountHeader({ menu_style: 'mega', sticky: false })
        const toggle = $('nav button') as HTMLElement
        const panel = $(`#${toggle.getAttribute('aria-controls')}`) as HTMLElement
        // Spans the header, not the top item
        expect(panel.className).toContain('inset-x-0')
        expect(toggle.parentElement?.className).not.toContain('relative')
        const row = panel.querySelector('.flex-wrap') as HTMLElement
        const columns = [...row.children].map(column =>
            [...column.querySelectorAll('a')].map(a => a.textContent?.trim())
        )
        expect(columns).toEqual([['Tops', 'Jackets'], ['Bottoms']])

        resize([{ contentRect: { width: 640 } } as ResizeObserverEntry], {} as ResizeObserver)
        await nextTick()
        expect(row.style.minWidth).toBe('640px')

        await click(toggle)
        expect(toggle.getAttribute('aria-expanded')).toBe('true')
        expect(panel.className).toContain('visible')
        expect(panel.className).not.toContain('invisible')
    })

    it('steps through categories in the menu drawer and back', async () => {
        await mountHeader()
        await visitor(false)

        await click($('header button[aria-label="Menu"]'))
        await click(byText('button', 'Women'))

        expect(byText('a', 'View All')?.getAttribute('href')).toBe('https://shop.test/women.html')
        expect(byText('a', 'Bottoms')).toBeDefined()
        await click(byText('button', 'Tops'))
        expect(byText('a', 'Jackets')?.getAttribute('href')).toBe(
            'https://shop.test/women/tops-women/jackets-women.html'
        )

        // The back button carries the level's name
        await click(byText('button', 'Tops'))
        await click(byText('button', 'Women'))
        expect(byText('button', 'Women')).toBeDefined()
        expect(byText('a', 'View All')).toBeUndefined()
        expect(document.body.style.overflow).toBe('hidden')

        await click($('button[aria-label="Close"]'))
        expect(document.body.style.overflow).toBe('')
    })

    it('opens the menu drawer as a modal over an inert page and hands focus back on Escape', async () => {
        const page = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'lynx' }))
        await mountHeader()
        const trigger = $('header button[aria-label="Menu"]')!
        trigger.focus()

        await click(trigger)
        expect($('[role="dialog"]')?.getAttribute('aria-label')).toBe('Menu')
        expect(page.hasAttribute('inert')).toBe(true)
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')

        await press('Escape')
        expect(page.hasAttribute('inert')).toBe(false)
        expect(document.activeElement).toBe(trigger)
        page.remove()
    })

    it('keeps scrolled-to focus clear of the bar while sticky', async () => {
        // Observes by calling back at once, the bar 72px tall
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(private callback: ResizeObserverCallback) {}
                observe() {
                    this.callback([{ contentRect: { height: 72 } } as ResizeObserverEntry], this as never)
                }
                disconnect() {}
            }
        )
        const wrapper = await mountHeader()
        const html = document.documentElement.style
        expect(html.getPropertyValue('--sticky-header-height')).toBe('72px')

        wrapper.unmount()
        expect(html.getPropertyValue('--sticky-header-height')).toBe('')
        vi.unstubAllGlobals()
    })

    it('places the blocks of its actions slot at the end of the bar', async () => {
        await mountHeader({}, { actions: () => h('button', { 'aria-label': 'Cart block' }) })

        expect($('header button[aria-label="Cart block"]')).not.toBeNull()
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Header, { props, config })

        expect(html).toContain('Main Website Store')
        expect(warnings).toEqual([])
    })
})
