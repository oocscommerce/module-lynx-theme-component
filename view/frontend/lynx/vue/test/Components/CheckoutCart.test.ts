import { router } from '@inertiajs/vue3'
import { mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { useAnalyticsStore } from 'OOCS_LynxTheme/stores/global/analyticsStore'
import CheckoutCart from 'OOCS_LynxThemeComponent/Components/CheckoutCart.vue'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

const tee = {
    item_id: 11,
    name: 'Radiant Tee',
    sku: 'WS12-M-Orange',
    url: 'https://shop.test/radiant-tee.html',
    image: 'https://shop.test/media/catalog/product/cache/ws12.jpg',
    qty: 2,
    price: 22,
    row_total: 44,
    price_incl_tax: 23.76,
    row_total_incl_tax: 47.52,
    is_salable: true,
    messages: [
        {
            type: 'notice',
            text: "We don't have as many quantity as you requested, but we'll back order the remaining 1.",
        },
    ],
    options: [
        { label: 'Size', value: '<b>M</b>', option_type: '' },
        { label: 'Engraving', value: '<em>Ann</em>', option_type: 'html' },
        { label: 'Extras', value: ['1 x Strap', '1 x Case'], option_type: '' },
    ],
}

const backpack = {
    item_id: 12,
    name: 'Fusion Backpack',
    sku: '24-MB02',
    url: 'https://shop.test/fusion-backpack.html',
    image: 'https://shop.test/media/catalog/product/cache/mb02.jpg',
    qty: 1,
    price: 59,
    row_total: 59,
    price_incl_tax: 63.72,
    row_total_incl_tax: 63.72,
    is_salable: false,
    messages: [{ type: 'error', text: 'The requested qty is not available' }],
    options: [],
}

const taxDisplay = { price: 1, subtotal: 1, shipping: 1, grand_total: false, full_summary: false, zero_tax: false }

const props = {
    items: [tee, backpack],
    total_count: 2,
    current_page: 1,
    total_pages: 1,
    has_error: false,
    error_messages: [],
    coupon_code: '',
    can_clear_cart: true,
    totals_url: 'https://shop.test/rest/default/V1/guest-carts/abc123/totals',
    cart_api_url: 'https://shop.test/rest/default/V1/guest-carts/abc123',
    urls: {
        checkout: 'https://shop.test/checkout/',
        continue: 'https://shop.test/',
        update_post: 'https://shop.test/checkout/cart/updatePost/',
        delete: 'https://shop.test/checkout/cart/delete/',
        multishipping: '',
    },
    sections: { update_post: ['cart'], delete: ['cart'] },
    labels: {
        cart: 'Shopping Cart',
        empty: 'You have no items in your shopping cart.',
        continueShopping: 'Continue Shopping',
        each: '%1 each',
        outOfStock: 'Out of stock',
        decreaseQty: 'Decrease quantity',
        quantity: 'Quantity',
        increaseQty: 'Increase quantity',
        removeFromCart: 'Remove item',
        remove: 'Remove',
        couponCode: 'Coupon Code',
        couponTitle: 'Apply Discount Code',
        enterCode: 'Enter discount code',
        apply: 'Apply',
        orderSummary: 'Summary',
        proceedToCheckout: 'Proceed to Checkout',
        multiAddress: 'Check Out with Multiple Addresses',
        clearCart: 'Clear Shopping Cart',
        updateCart: 'Update Cart',
        confirmClearCart: 'Are you sure you want to remove all items from your shopping cart?',
        pageOf: 'Page %1 of %2',
        itemsCount: '%1 items',
        previous: 'Previous',
        next: 'Next',
        inclTax: 'Incl. Tax',
        exclTax: 'Excl. Tax',
        subtotalInclTax: 'Subtotal (Incl. Tax)',
        subtotalExclTax: 'Subtotal (Excl. Tax)',
        orderTotalInclTax: 'Order Total Incl. Tax',
        orderTotalExclTax: 'Order Total Excl. Tax',
    },
    tax_display: taxDisplay,
    express_columns: 'auto',
    express_gap: 'sm',
}

const config = {
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

// The quote's totals as the web API returns them
const totals = {
    subtotal: 103,
    subtotal_incl_tax: 111.24,
    shipping_amount: 10,
    shipping_incl_tax: 10.8,
    tax_amount: 9.04,
    total_segments: [
        { code: 'subtotal', title: 'Subtotal', value: 103 },
        { code: 'shipping', title: 'Shipping & Handling', value: 10 },
        { code: 'discount', title: 'Discount (SAVE10)', value: -10.3 },
        { code: 'giftwrapping', title: 'Gift Wrapping', value: null },
        {
            code: 'tax',
            title: 'Tax',
            value: 9.04,
            extension_attributes: {
                tax_grandtotal_details: [{ amount: 9.04, rates: [{ percent: '8', title: 'US-CA' }, { title: 'Eco' }] }],
            },
        },
        { code: 'grand_total', title: 'Grand Total', value: 111.74 },
    ],
}

type Reply = { ok?: boolean; body?: unknown }

/** fetch answering totals, sections and the coupon endpoints; replies are keyed by a URL fragment */
const stubFetch = (replies: Record<string, Reply> = {}) => {
    const fetch = vi.fn(async (url: string) => {
        const key = Object.keys(replies).find(fragment => String(url).includes(fragment))
        const reply = key ? replies[key] : String(url).endsWith('/totals') ? { body: totals } : { body: {} }
        return { ok: reply.ok ?? true, json: async () => reply.body }
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
}

type VisitOptions = { onSuccess?: () => void; onError?: () => void; onFinish?: () => void }

/** router.post answering as Inertia would, without sending anything */
const stubPost = (outcome: 'success' | 'error' = 'success') =>
    vi.spyOn(router, 'post').mockImplementation(((_url: string, _data: unknown, options: VisitOptions = {}) => {
        if (outcome === 'success') options.onSuccess?.()
        else options.onError?.()
        options.onFinish?.()
    }) as typeof router.post)

/** Every event the analytics bus carried */
const tracked = () => {
    const events: [string, Record<string, unknown>][] = []
    useAnalyticsStore().addTracker((event, params) => events.push([event, params]))
    return events
}

const mountCart = async (overrides: Record<string, unknown> = {}, options = {}) => {
    const wrapper = mountNode(CheckoutCart, { props: { ...props, ...overrides }, config, ...options })
    await flushPromises()
    return wrapper
}

const line = (wrapper: VueWrapper, index: number) => wrapper.findAll('li')[index]
const button = (wrapper: VueWrapper, text: string) => wrapper.findAll('button').find(b => b.text() === text)

/** The summary's [label, amount] rows, the grand total last */
const summary = (wrapper: VueWrapper) => {
    const rows = wrapper.findAll('h2').find(h2 => h2.text() === 'Summary')?.element.parentElement
    const spans = [...(rows?.children[1].children ?? []), ...(rows?.children[2].children ?? [])]
    const pairs: string[][] = []
    for (let i = 0; i < spans.length; i += 2) pairs.push([spans[i].textContent ?? '', spans[i + 1].textContent ?? ''])
    return pairs
}

describe('CheckoutCart', () => {
    it('lists each line with its link, image, options and messages', async () => {
        stubFetch()
        const wrapper = await mountCart()
        const first = line(wrapper, 0)

        expect(wrapper.find('h1').text()).toBe('Shopping Cart')
        expect(first.find('img').attributes('src')).toBe(tee.image)
        expect(first.find('img').attributes('alt')).toBe('Radiant Tee')
        expect(first.findAll(`a[href="${tee.url}"]`).at(1)?.text()).toBe('Radiant Tee')
        // Plain values stay text; html, file and list values are markup
        expect(first.text()).toContain('Size:<b>M</b>')
        expect(first.find('em').text()).toBe('Ann')
        expect(first.html()).toContain('1 x Strap<br>1 x Case')
        expect(first.text()).toContain("but we'll back order the remaining 1.")
        expect(first.text()).not.toContain('Out of stock')
        expect(line(wrapper, 1).text()).toContain('Out of stock')
        expect(line(wrapper, 1).text()).toContain('The requested qty is not available')
    })

    it('shows prices excluding tax by default', async () => {
        stubFetch()
        const wrapper = await mountCart()

        expect(line(wrapper, 0).text()).toContain('$22.00 each')
        expect(line(wrapper, 0).text()).toContain('$44.00')
        expect(line(wrapper, 0).text()).not.toContain('$47.52')
        // One of a line: no unit price
        expect(line(wrapper, 1).text()).not.toContain('each')
        expect(line(wrapper, 1).text()).toContain('$59.00')
    })

    it('shows prices including tax when set to', async () => {
        stubFetch()
        const wrapper = await mountCart({ tax_display: { ...taxDisplay, price: 2 } })

        expect(line(wrapper, 0).text()).toContain('$23.76 each')
        expect(line(wrapper, 0).text()).toContain('$47.52')
        expect(line(wrapper, 0).text()).not.toContain('Excl. Tax')
    })

    it('shows both prices, the one without tax underneath', async () => {
        stubFetch()
        const wrapper = await mountCart({ tax_display: { ...taxDisplay, price: 3 } })

        expect(line(wrapper, 0).text()).toContain('$47.52')
        expect(line(wrapper, 0).text()).toContain('Excl. Tax: $44.00')
    })

    it('builds the summary from the totals endpoint', async () => {
        const fetch = stubFetch()
        const wrapper = mountNode(CheckoutCart, { props, config })
        // The skeleton holds the place until the amounts arrive
        expect(summary(wrapper).flat().join('')).toBe('')

        await flushPromises()

        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe(props.totals_url)
        expect(init.headers).toEqual({ 'X-Requested-With': 'XMLHttpRequest' })
        expect(summary(wrapper)).toEqual([
            ['Subtotal', '$103.00'],
            ['Shipping & Handling', '$10.00'],
            ['Discount (SAVE10)', '-$10.30'],
            ['Tax', '$9.04'],
            ['Grand Total', '$111.74'],
        ])
    })

    it('lays the summary out as the tax display settings ask', async () => {
        stubFetch()
        const wrapper = await mountCart({
            tax_display: { price: 1, subtotal: 3, shipping: 2, grand_total: true, full_summary: true, zero_tax: false },
        })

        expect(summary(wrapper)).toEqual([
            ['Subtotal (Excl. Tax)', '$103.00'],
            ['Subtotal (Incl. Tax)', '$111.24'],
            ['Shipping & Handling', '$10.80'],
            ['Discount (SAVE10)', '-$10.30'],
            ['Tax', '$9.04'],
            ['US-CA (8%), Eco', '$9.04'],
            ['Order Total Excl. Tax', '$102.70'],
            ['Order Total Incl. Tax', '$111.74'],
        ])
    })

    it('leaves out a zero tax unless set to show it', async () => {
        const zeroTax = {
            ...totals,
            tax_amount: 0,
            total_segments: [
                { code: 'subtotal', title: 'Subtotal', value: 103 },
                { code: 'tax', title: 'Tax', value: 0 },
                { code: 'grand_total', title: 'Grand Total', value: 103 },
            ],
        }
        stubFetch({ '/totals': { body: zeroTax } })
        const hidden = await mountCart()
        expect(summary(hidden).map(([label]) => label)).toEqual(['Subtotal', 'Grand Total'])
        hidden.unmount()

        const shown = await mountCart({ tax_display: { ...taxDisplay, zero_tax: true } })
        expect(summary(shown).map(([label]) => label)).toEqual(['Subtotal', 'Tax', 'Grand Total'])
    })

    it('shows an empty summary when the totals cannot be read', async () => {
        stubFetch({ '/totals': { ok: false, body: { message: 'No such entity' } } })
        const wrapper = await mountCart()

        expect(summary(wrapper)).toEqual([])
        expect(button(wrapper, 'Update Cart')).toBeDefined()
    })

    it('reports the cart as view_cart on load', async () => {
        stubFetch()
        await mountCart()

        expect(tracked()).toEqual([
            [
                'view_cart',
                {
                    currency: 'USD',
                    value: 103,
                    items: [
                        { item_id: 'WS12-M-Orange', item_name: 'Radiant Tee', price: 22, quantity: 2 },
                        { item_id: '24-MB02', item_name: 'Fusion Backpack', price: 59, quantity: 1 },
                    ],
                },
            ],
        ])
    })

    it('steps the quantity, never below one, and commits a typed one above 0', async () => {
        stubFetch()
        const wrapper = await mountCart()
        const input = () => line(wrapper, 1).find('input[aria-label="Quantity"]')

        expect(line(wrapper, 1).find('[aria-label="Decrease quantity"]').attributes('disabled')).toBeDefined()
        expect(button(wrapper, 'Update Cart')?.attributes('disabled')).toBeDefined()

        await line(wrapper, 1).find('[aria-label="Increase quantity"]').trigger('click')
        expect((input().element as HTMLInputElement).value).toBe('2')
        expect(button(wrapper, 'Update Cart')?.attributes('disabled')).toBeUndefined()

        ;(input().element as HTMLInputElement).value = '0'
        await input().trigger('change')
        expect((input().element as HTMLInputElement).value).toBe('1')

        ;(input().element as HTMLInputElement).value = '0.5'
        await input().trigger('change')
        expect((input().element as HTMLInputElement).value).toBe('0.5')

        ;(input().element as HTMLInputElement).value = '4.35'
        await input().trigger('change')
        await line(wrapper, 1).find('[aria-label="Decrease quantity"]').trigger('click')
        expect((input().element as HTMLInputElement).value).toBe('3.35')

        ;(input().element as HTMLInputElement).value = '1.5'
        await input().trigger('change')
        await line(wrapper, 1).find('[aria-label="Decrease quantity"]').trigger('click')
        expect((input().element as HTMLInputElement).value).toBe('1')
    })

    it('posts every line quantity on update, then refreshes and reports the change', async () => {
        const fetch = stubFetch()
        const post = stubPost()
        document.cookie = 'form_key=CookieKey1234567; path=/'
        const wrapper = await mountCart()
        const events = tracked()

        await line(wrapper, 0).find('[aria-label="Increase quantity"]').trigger('click')
        await button(wrapper, 'Update Cart')?.trigger('click')
        await flushPromises()

        const [url, data, options] = post.mock.calls[0]
        expect(url).toBe('https://shop.test/checkout/cart/updatePost/')
        expect(data).toEqual({
            form_key: 'CookieKey1234567',
            update_cart_action: 'update_qty',
            cart: { 11: { qty: 3 }, 12: { qty: 1 } },
        })
        expect(options).toMatchObject({ forceFormData: true, preserveScroll: true })
        const urls = fetch.mock.calls.map(([called]) => String(called))
        expect(urls.filter(called => called.endsWith('/totals'))).toHaveLength(2)
        expect(urls.some(called => called.includes('sections=cart'))).toBe(true)
        expect(events.slice(1)).toEqual([
            [
                'add_to_cart',
                {
                    currency: 'USD',
                    value: 22,
                    items: [{ item_id: 'WS12-M-Orange', item_name: 'Radiant Tee', price: 22, quantity: 1 }],
                },
            ],
        ])
    })

    it('removes a line and reports it', async () => {
        stubFetch()
        const post = stubPost()
        document.cookie = 'form_key=CookieKey1234567; path=/'
        const wrapper = await mountCart()
        const events = tracked()

        await line(wrapper, 0).find('[aria-label="Remove item"]').trigger('click')

        expect(post.mock.calls[0].slice(0, 2)).toEqual([
            'https://shop.test/checkout/cart/delete/',
            { form_key: 'CookieKey1234567', id: 11 },
        ])
        expect(events.slice(1)).toEqual([
            [
                'remove_from_cart',
                {
                    currency: 'USD',
                    value: 44,
                    items: [{ item_id: 'WS12-M-Orange', item_name: 'Radiant Tee', price: 22, quantity: 2 }],
                },
            ],
        ])
    })

    it('unlocks the cart and shows the totals again after a failed request', async () => {
        const fetch = stubFetch()
        const post = stubPost('error')
        const wrapper = await mountCart()
        const events = tracked()

        await line(wrapper, 0).find('[aria-label="Increase quantity"]').trigger('click')
        await button(wrapper, 'Update Cart')?.trigger('click')
        await flushPromises()
        await line(wrapper, 0).find('[aria-label="Remove item"]').trigger('click')
        await flushPromises()

        expect(post).toHaveBeenCalledTimes(2)
        const urls = fetch.mock.calls.map(([called]) => String(called))
        expect(urls.filter(called => called.endsWith('/totals'))).toHaveLength(1)
        expect(urls.some(called => called.includes('section/load'))).toBe(false)
        expect(summary(wrapper).at(-1)).toEqual(['Grand Total', '$111.74'])
        expect(events.slice(1)).toEqual([])
    })

    it('empties the cart only once the visitor confirms', async () => {
        stubFetch()
        const post = stubPost()
        const confirm = vi.fn(() => false)
        vi.stubGlobal('confirm', confirm)
        const wrapper = await mountCart()

        await button(wrapper, 'Clear Shopping Cart')?.trigger('click')
        expect(confirm).toHaveBeenCalledWith('Are you sure you want to remove all items from your shopping cart?')
        expect(post).not.toHaveBeenCalled()

        confirm.mockReturnValue(true)
        await button(wrapper, 'Clear Shopping Cart')?.trigger('click')
        expect(post.mock.calls[0][0]).toBe('https://shop.test/checkout/cart/updatePost/')
        expect(post.mock.calls[0][1]).toMatchObject({ update_cart_action: 'empty_cart' })
    })

    it('has no clear button unless the store allows it', async () => {
        stubFetch()
        const wrapper = await mountCart({ can_clear_cart: false })

        expect(button(wrapper, 'Clear Shopping Cart')).toBeUndefined()
    })

    it('pages through a long cart, keeping the other query parameters', async () => {
        stubFetch()
        const get = vi.spyOn(router, 'get').mockImplementation(() => {})
        const wrapper = await mountCart({ total_count: 45, current_page: 2, total_pages: 3 })
        // Set once Inertia has written its own page URL after booting
        await new Promise(resolve => setTimeout(resolve))
        history.replaceState(null, '', '/checkout/cart/?p=2&utm_source=mail')

        expect(wrapper.text()).toContain('Page 2 of 3')
        expect(wrapper.text()).toContain('45 items')
        await button(wrapper, 'Next')?.trigger('click')
        await button(wrapper, 'Previous')?.trigger('click')

        expect(get.mock.calls.map(([url]) => url)).toEqual([
            '/checkout/cart/?p=3&utm_source=mail',
            '/checkout/cart/?utm_source=mail',
        ])
        history.replaceState(null, '', '/')
    })

    it('applies a coupon over the web API and offers to remove it', async () => {
        const fetch = stubFetch({ '/coupons': { body: true } })
        const wrapper = await mountCart()
        await button(wrapper, 'Apply Discount Code')?.trigger('click')
        const captcha = document.createElement('textarea')
        captcha.name = 'g-recaptcha-response'
        captcha.value = 'captcha-token'
        wrapper.find('form').element.append(captcha)

        await wrapper.find('#couponCode').setValue(' SAVE10 ')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        const apply = fetch.mock.calls.find(([url]) => String(url).includes('/coupons')) as unknown as [
            string,
            RequestInit,
        ]
        expect(apply[0]).toBe('https://shop.test/rest/default/V1/guest-carts/abc123/coupons/SAVE10')
        expect(apply[1]).toMatchObject({
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-ReCaptcha': 'captcha-token' },
        })
        expect((wrapper.find('#couponCode').element as HTMLInputElement).value).toBe('SAVE10')
        expect(wrapper.find('#couponCode').attributes('disabled')).toBeDefined()

        await button(wrapper, 'Remove')?.trigger('click')
        await flushPromises()

        const remove = fetch.mock.calls.filter(([url]) => String(url).includes('/coupons')).at(-1) as unknown as [
            string,
            RequestInit,
        ]
        expect(remove[0]).toBe('https://shop.test/rest/default/V1/guest-carts/abc123/coupons')
        expect(remove[1].method).toBe('DELETE')
        expect(wrapper.find('form').exists()).toBe(true)
    })

    it('shows the message Magento gives for a refused coupon', async () => {
        const refused = 'The coupon code "BAD" is not valid. Verify the code and try again.'
        stubFetch({ '/coupons': { ok: false, body: { message: refused } } })
        const wrapper = await mountCart()
        await button(wrapper, 'Apply Discount Code')?.trigger('click')

        await wrapper.find('#couponCode').setValue('BAD')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.text()).toContain(refused)
        expect(wrapper.find('form').exists()).toBe(true)
    })

    it('starts with the coupon already on the quote', async () => {
        stubFetch()
        const wrapper = await mountCart({ coupon_code: 'WELCOME' })

        expect((wrapper.find('#couponCode').element as HTMLInputElement).value).toBe('WELCOME')
        expect(button(wrapper, 'Remove')).toBeDefined()
    })

    it('shows the quote errors and holds back checkout', async () => {
        stubFetch()
        const wrapper = await mountCart({
            has_error: true,
            error_messages: ['Some of the products below do not have all the required options.'],
            urls: { ...props.urls, multishipping: 'https://shop.test/multishipping/checkout/' },
        })

        expect(wrapper.text()).toContain('Some of the products below do not have all the required options.')
        expect(wrapper.find('a[href="https://shop.test/checkout/"]').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('Check Out with Multiple Addresses')
    })

    it('shows no error box for an error the quote gives no message for, and still holds back checkout', async () => {
        stubFetch()
        const wrapper = await mountCart({ has_error: true, error_messages: [] })

        expect(wrapper.find('[class*="bg-error/5"]').exists()).toBe(false)
        expect(wrapper.find('a[href="https://shop.test/checkout/"]').exists()).toBe(false)
    })

    it('links to checkout, multiple addresses and the express buttons when allowed', async () => {
        stubFetch()
        const wrapper = await mountCart(
            { urls: { ...props.urls, multishipping: 'https://shop.test/multishipping/checkout/' } },
            { slots: { express: () => h('button', { type: 'button' }, 'Pay Express') } }
        )

        expect(wrapper.find('a[href="https://shop.test/checkout/"]').text()).toBe('Proceed to Checkout')
        expect(wrapper.find('a[href="https://shop.test/multishipping/checkout/"]').text()).toBe(
            'Check Out with Multiple Addresses'
        )
        expect(button(wrapper, 'Pay Express')).toBeDefined()
    })

    it('shows the empty cart with a way back to shopping', async () => {
        const fetch = stubFetch()
        const wrapper = await mountCart({ items: [], total_count: 0, totals_url: '', cart_api_url: '' })

        expect(wrapper.text()).toContain('You have no items in your shopping cart.')
        expect(wrapper.find('a[href="https://shop.test/"]').text()).toBe('Continue Shopping')
        expect(wrapper.text()).not.toContain('Summary')
        expect(fetch).not.toHaveBeenCalled()
        expect(tracked()).toEqual([])
    })
})
