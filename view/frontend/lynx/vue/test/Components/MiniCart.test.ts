import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import { useMessagesStore } from 'OOCS_LynxTheme/stores/global/messagesStore'
import MiniCart from 'OOCS_LynxThemeComponent/Components/MiniCart.vue'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const props = {
    checkout_urls: {
        checkout: 'https://shop.test/checkout/',
        cart: 'https://shop.test/checkout/cart/',
        remove_item: 'https://shop.test/checkout/sidebar/removeItem/',
    },
    sections: { remove_item: ['cart'] },
    subtotal_tax_display: 1,
    labels: {
        myCart: 'My Cart',
        close: 'Close',
        qty: 'Qty',
        seeDetails: 'See Details',
        removeItem: 'Remove item',
        cartEmpty: 'You have no items in your shopping cart.',
        continueShopping: 'Continue Shopping',
        subtotal: 'Subtotal',
        subtotalInclTax: 'Subtotal (Incl. Tax)',
        subtotalExclTax: 'Subtotal (Excl. Tax)',
        exclTax: 'Excl. Tax',
        shippingNote: 'Shipping and taxes calculated at checkout.',
        checkout: 'Checkout',
        viewEditCart: 'View and Edit Cart',
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

const cartSection = {
    summary_count: 3,
    subtotal_incl_tax_value: 69.66,
    subtotal_excl_tax_value: 64.5,
    items: [
        {
            item_id: '41',
            product_name: 'Radiant Tee',
            product_url: 'https://shop.test/radiant-tee.html',
            product_price_value: 22,
            qty: 2,
            product_image: { src: 'https://shop.test/media/catalog/product/ws12.jpg', alt: 'Radiant Tee' },
            options: [
                { label: 'Size', value: 'M' },
                { label: 'Engraving', value: '<em>Ann</em>', option_type: 'html' },
            ],
            message: "We don't have as many quantity as you requested, but we'll back order the remaining 1.",
        },
        {
            item_id: '42',
            product_name: 'Fusion Backpack',
            product_url: 'https://shop.test/fusion-backpack.html',
            product_price_value: { incl_tax: 63.72, excl_tax: 59 },
            qty: 1,
        },
    ],
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

const mountCart = async (overrides: Record<string, unknown> = {}) => {
    const wrapper = mountNode(MiniCart, { props: { ...props, ...overrides }, config, attachTo: document.body })
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

// The drawer's item list is grown by an observer the test does not need
class NoObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

describe('MiniCart', () => {
    it('lists the mini cart with prices, details and the subtotal', async () => {
        vi.stubGlobal('IntersectionObserver', NoObserver)
        await mountCart()
        await visitor(true, cartSection)

        expect($('button[aria-label="My Cart"]')?.textContent?.trim()).toBe('3')
        await click($('button[aria-label="My Cart"]'))

        expect($('h2')?.textContent).toBe('My Cart (3)')
        const [tee, backpack] = $$('li').filter(li => li.querySelector('[aria-label="Remove item"]'))
        expect(tee.textContent).toContain('Qty: 2')
        expect(tee.textContent).toContain('$22.00')
        expect(tee.textContent).toContain("but we'll back order the remaining 1.")
        expect(backpack.textContent).toContain('$63.72')
        expect(backpack.textContent).toContain('Excl. Tax: $59.00')

        const details = byText('button', 'See Details') as HTMLElement
        expect(details.getAttribute('aria-expanded')).toBe('false')
        await click(details)
        expect(details.getAttribute('aria-expanded')).toBe('true')
        expect(tee.querySelector('em')?.textContent).toBe('Ann')

        expect(document.body.textContent).toContain('Subtotal$64.50')
        expect(byText('a', 'Checkout')?.getAttribute('href')).toBe('https://shop.test/checkout/')
        expect(byText('a', 'View and Edit Cart')?.getAttribute('href')).toBe('https://shop.test/checkout/cart/')
    })

    it('shows both subtotals when set to', async () => {
        vi.stubGlobal('IntersectionObserver', NoObserver)
        await mountCart({ subtotal_tax_display: 3 })
        await visitor(false, cartSection)

        await click($('button[aria-label="My Cart"]'))

        expect(document.body.textContent).toContain('Subtotal (Incl. Tax)$69.66')
        expect(document.body.textContent).toContain('Subtotal (Excl. Tax)$64.50')
    })

    it('removes a mini cart item and reloads its sections', async () => {
        vi.stubGlobal('IntersectionObserver', NoObserver)
        const fetch = vi.fn(async (url: string) => ({
            ok: true,
            json: async () => (String(url).includes('removeItem') ? { success: true } : {}),
        }))
        vi.stubGlobal('fetch', fetch)
        document.cookie = 'form_key=CookieKey1234567; path=/'
        await mountCart()
        await visitor(false, cartSection)
        await click($('button[aria-label="My Cart"]'))

        await click($('[aria-label="Remove item"]'))

        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe('https://shop.test/checkout/sidebar/removeItem/')
        expect(init.method).toBe('POST')
        expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
            item_id: '41',
            form_key: 'CookieKey1234567',
        })
        expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get('sections')).toBe('cart')
    })

    it('shows why the server kept a mini cart item, and a message when the request goes nowhere', async () => {
        vi.stubGlobal('IntersectionObserver', NoObserver)
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ success: false, error_message: "The quote item isn't found." }),
            }))
        )
        await mountCart()
        await visitor(false, cartSection)
        await click($('button[aria-label="My Cart"]'))

        await click($('[aria-label="Remove item"]'))
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))
        )
        await click($('[aria-label="Remove item"]'))

        expect(useMessagesStore().items.map(m => [m.type, m.text])).toEqual([
            ['error', "The quote item isn't found."],
            ['error', 'Something went wrong. Please try again.'],
        ])
    })

    it('opens as a modal over an inert page and hands focus back on Escape', async () => {
        const page = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'lynx' }))
        await mountCart()
        await visitor(false)
        const trigger = $('button[aria-label="My Cart"]')!
        trigger.focus()

        await click(trigger)
        expect($('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
        expect(page.hasAttribute('inert')).toBe(true)
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')

        await press('Escape')
        expect(page.hasAttribute('inert')).toBe(false)
        expect(document.activeElement).toBe(trigger)
        page.remove()
    })

    it('shows an empty mini cart with a way back', async () => {
        await mountCart()
        await visitor(false)

        await click($('button[aria-label="My Cart"]'))
        expect(document.body.textContent).toContain('You have no items in your shopping cart.')

        await click(byText('button', 'Continue Shopping'))
        expect(document.body.textContent).not.toContain('You have no items in your shopping cart.')
        await nextTick()
    })

    it('server-renders and hydrates the same markup', async () => {
        const { warnings } = await hydrate(MiniCart, { props, config })

        expect(warnings).toEqual([])
    })
})
