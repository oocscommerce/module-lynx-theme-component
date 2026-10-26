import { mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import { useAnalyticsStore } from 'OOCS_LynxTheme/stores/global/analyticsStore'
import CheckoutSuccess from 'OOCS_LynxThemeComponent/Components/CheckoutSuccess.vue'
import { describe, expect, it, vi } from 'vitest'

const purchase = {
    transaction_id: '000000123',
    value: 59.5,
    tax: 4.5,
    shipping: 5,
    currency: 'USD',
    items: [{ item_id: 'MJ01', item_name: 'Jacket', price: 50, quantity: 1 }],
}

const props = {
    order_increment_id: '000000123',
    email: 'ann@example.com',
    can_view_order: true,
    urls: {
        home: 'https://shop.test/',
        order: 'https://shop.test/sales/order/view/order_id/5/',
    },
    purchase,
    labels: {
        thankYou: 'Thank you for your purchase!',
        orderNumberIs: 'Your order number is: %1.',
        emailSentTo: 'A confirmation email has been sent to',
        continueShopping: 'Continue Shopping',
        viewOrder: 'View Order',
    },
}

// The provider sends the account offer, never the order view, to a guest
const guest = {
    ...props,
    can_view_order: false,
    urls: { home: 'https://shop.test/', create_account: 'https://shop.test/customer/account/create/' },
    labels: { ...props.labels, createAccount: 'Create an Account' },
}

const config = { sections: { url: '/customer/section/load', lifetime: 3600, clientSide: [] } }

const stubFetch = () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetch)
    return fetch
}

/** Every event the analytics bus carried so far */
const tracked = () => {
    const events: [string, Record<string, unknown>][] = []
    useAnalyticsStore().addTracker((event, params) => events.push([event, params]))
    return events
}

describe('CheckoutSuccess', () => {
    it('shows the order number, email and order link to a signed-in customer', () => {
        stubFetch()
        const wrapper = mountNode(CheckoutSuccess, { props, config })

        expect(wrapper.find('h1').text()).toBe('Thank you for your purchase!')
        expect(wrapper.text()).toContain('Your order number is: 000000123.')
        expect(wrapper.find('strong').text()).toBe('000000123')
        expect(wrapper.text()).toContain('A confirmation email has been sent to ann@example.com.')
        expect(wrapper.find('a[href="https://shop.test/"]').text()).toBe('Continue Shopping')
        expect(wrapper.find(`a[href="${props.urls.order}"]`).text()).toBe('View Order')
        expect(wrapper.text()).not.toContain('Create an Account')
    })

    it('offers a guest to create an account instead of the order view', () => {
        stubFetch()
        const wrapper = mountNode(CheckoutSuccess, { props: guest, config })

        expect(wrapper.find(`a[href="${props.urls.order}"]`).exists()).toBe(false)
        expect(wrapper.find(`a[href="${guest.urls.create_account}"]`).text()).toBe('Create an Account')
    })

    it('offers no account to a signed-in customer whose order is hidden', () => {
        stubFetch()
        const wrapper = mountNode(CheckoutSuccess, {
            props: { ...props, can_view_order: false, urls: { home: props.urls.home } },
            config,
        })

        expect(wrapper.findAll('a')).toHaveLength(1)
    })

    it('reports the purchase once per browser session', async () => {
        stubFetch()
        mountNode(CheckoutSuccess, { props, config }).unmount()
        expect(tracked()).toEqual([['purchase', purchase]])

        mountNode(CheckoutSuccess, { props, config })
        expect(tracked()).toEqual([])
        expect(sessionStorage.getItem('lynx_analytics_purchase_000000123')).toBe('1')
    })

    it('clears the saved checkout data and reloads the cart section', async () => {
        const fetch = stubFetch()
        localStorage.setItem('lynx-checkout-data', '{"email":"ann@example.com"}')

        mountNode(CheckoutSuccess, { props, config })
        await flushPromises()

        expect(localStorage.getItem('lynx-checkout-data')).toBeNull()
        const url = new URL(String(fetch.mock.calls[0][0]))
        expect(url.pathname).toBe('/customer/section/load')
        expect(url.searchParams.get('sections')).toBe('cart')
    })

    it('reports nothing and keeps checkout data without a placed order', async () => {
        const fetch = stubFetch()
        localStorage.setItem('lynx-checkout-data', '{}')

        const wrapper = mountNode(CheckoutSuccess, {
            props: { ...props, order_increment_id: '', email: '', purchase: null },
            config,
        })
        await flushPromises()

        expect(tracked()).toEqual([])
        expect(fetch).not.toHaveBeenCalled()
        expect(localStorage.getItem('lynx-checkout-data')).toBe('{}')
        expect(wrapper.text()).not.toContain('Your order number is')
    })
})
