import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import HeaderAccount from 'OOCS_LynxThemeComponent/Components/HeaderAccount.vue'
import { describe, expect, it } from 'vitest'

const props = {
    show_compare: true,
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
        signOut: 'Sign Out',
        signIn: 'Sign In',
        createAccount: 'Create an Account',
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

const mountAccount = async () => {
    const wrapper = mountNode(HeaderAccount, { props, config, attachTo: document.body })
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

describe('HeaderAccount', () => {
    it('offers a guest to sign in or create an account', async () => {
        await mountAccount()
        await visitor(false)

        await click($('button[aria-label="My Account"]'))

        expect($('button[aria-label="My Account"]')?.getAttribute('aria-expanded')).toBe('true')
        // The page being viewed rides along as the referer, encoded as core's Url\Encoder does
        expect(byText('a', 'Sign In')?.getAttribute('href')).toBe(
            'https://shop.test/customer/account/login/referer/aHR0cHM6Ly9zaG9wLnRlc3Qv/'
        )
        expect(byText('a', 'Create an Account')?.getAttribute('href')).toBe(props.customer_urls.create)
        expect($('a[aria-label="My Wish List"]')).toBeNull()
    })

    it('greets a signed-in customer with account, wish list and sign out', async () => {
        await mountAccount()
        await visitor(true)

        await click($('button[aria-label="My Account"]'))

        expect(document.body.textContent).toContain('Hi, Ann')
        expect(byText('a', 'My Account')?.getAttribute('href')).toBe(props.customer_urls.account)
        expect(byText('a', 'Sign Out')?.getAttribute('href')).toBe(props.customer_urls.logout)
        expect($('a[aria-label="My Wish List"]')?.getAttribute('href')).toBe(props.customer_urls.wishlist)

        await press('Escape')
        expect(byText('a', 'Sign Out')).toBeUndefined()
        expect(document.activeElement).toBe($('button[aria-label="My Account"]'))
    })

    it('shows the compare link with its count while the list has products, only when set to', async () => {
        await mountAccount()
        useCustomerDataStore().sections = {
            'compare-products': { count: 2, listUrl: 'https://shop.test/catalog/product_compare/' },
        }
        await flushPromises()

        expect($('a[aria-label="Compare Products (2)"]')?.getAttribute('href')).toBe(
            'https://shop.test/catalog/product_compare/'
        )
    })

    it('server-renders and hydrates the same markup', async () => {
        const { warnings } = await hydrate(HeaderAccount, { props, config })

        expect(warnings).toEqual([])
    })
})
