import { router } from '@inertiajs/vue3'
import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import HeaderSearch from 'OOCS_LynxThemeComponent/Components/HeaderSearch.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    search_display: 'overlay',
    search: {
        action_url: 'https://shop.test/catalogsearch/result/',
        suggest_url: 'https://shop.test/graphql',
        min_length: 3,
        max_length: 128,
        suggest_enabled: true,
        placeholder: 'Search entire store here...',
    },
    labels: {
        search: 'Search',
        closeSearch: 'Close',
        inCategory: 'in %1',
        viewAllResults: 'View All',
        searchMinLength: 'Minimum Search query length is %1',
        searchError: 'Something went wrong with your request. Please try again later.',
        searchFetching: 'Loading...',
        searchNoResults: 'Your search returned no results.',
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

// The autocomplete's GraphQL answer
const suggestPayload = {
    data: {
        products: {
            total_count: 12,
            items: [
                {
                    uid: 'MTI=',
                    name: 'Radiant Tee',
                    url_key: 'radiant-tee',
                    url_suffix: '.html',
                    small_image: { url: 'https://shop.test/media/catalog/product/ws12.jpg' },
                    price_range: { minimum_price: { regular_price: { value: 22 }, final_price: { value: 18.5 } } },
                },
                {
                    uid: 'MTM=',
                    name: 'Breathe-Easy Tank',
                    url_key: 'breathe-easy-tank',
                    url_suffix: '.html',
                    small_image: null,
                    price_range: { minimum_price: { regular_price: { value: 34 }, final_price: { value: 34 } } },
                },
            ],
            aggregations: [
                { attribute_code: 'price', options: [{ label: '0-100', value: '0_100' }] },
                {
                    attribute_code: 'category_uid',
                    options: ['Tops', 'Tees', 'Women', 'Men', 'Gear'].map((label, i) => ({
                        label,
                        value: btoa(String(21 + i)),
                    })),
                },
            ],
        },
    },
}

const mountSearch = async (overrides: Record<string, unknown> = {}) => {
    const wrapper = mountNode(HeaderSearch, { props: { ...props, ...overrides }, config, attachTo: document.body })
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

const searchBox = () => $<HTMLInputElement>('input[role="combobox"]') as HTMLInputElement
const openSearch = () => click($('button[aria-label="Search"]'))
const type = async (text: string) => {
    searchBox().value = text
    searchBox().dispatchEvent(new Event('input'))
    await flushPromises()
}

const stubSuggest = (payload: unknown = suggestPayload, ok = true) => {
    const fetch = vi.fn(async () => ({ ok, json: async () => payload }))
    vi.stubGlobal('fetch', fetch)
    return fetch
}

describe('HeaderSearch', () => {
    it('opens the search focused and searches on Enter, not below the minimum length', async () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {})
        await mountSearch({ search: { ...props.search, suggest_enabled: false } })

        await openSearch()
        expect(document.activeElement).toBe(searchBox())
        expect(searchBox().getAttribute('placeholder')).toBe('Search entire store here...')
        expect(searchBox().getAttribute('maxlength')).toBe('128')

        await type('te')
        await press('Enter', searchBox())
        expect(get).not.toHaveBeenCalled()

        await type(' tee ')
        await press('Enter', searchBox())
        expect(get).toHaveBeenCalledWith('https://shop.test/catalogsearch/result/', { q: 'tee' })
        expect($('input[role="combobox"]')).toBeNull()
    })

    it('says how long a query must be before suggesting', async () => {
        const fetch = stubSuggest()
        await mountSearch()
        await openSearch()

        await type('te')

        expect(document.body.textContent).toContain('Minimum Search query length is 3')
        expect(fetch).not.toHaveBeenCalled()
    })

    it('suggests products and categories from the store GraphQL endpoint', async () => {
        vi.useFakeTimers()
        const fetch = stubSuggest()
        await mountSearch()
        await openSearch()

        await type('tee')
        expect(document.body.textContent).toContain('Loading...')
        await vi.advanceTimersByTimeAsync(300)

        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
        const query = new URL(url).searchParams
        expect(query.get('operationName')).toBe('getAutocompleteResults')
        expect(query.get('query')).toContain('products(search:$inputText currentPage:1 pageSize:3)')
        expect(query.get('variables')).toBe('{"inputText":"tee"}')
        expect(init.headers).toEqual({ Store: 'default', 'Content-Currency': 'USD' })
        expect(searchBox().getAttribute('aria-expanded')).toBe('true')
        const radiant = byText('button', 'Radiant Tee$18.50$22.00')
        expect(radiant?.querySelector('img')?.getAttribute('src')).toBe(
            'https://shop.test/media/catalog/product/ws12.jpg'
        )
        expect(byText('button', 'Breathe-Easy Tank$34.00')).toBeDefined()
        // Four categories at most, each starting with the query
        const rows = $$('button').filter(b => b.textContent?.startsWith('tee') && b.textContent.includes('in '))
        expect(rows.map(b => b.textContent?.replace(/^tee\s*/, ''))).toEqual([
            'in Tops',
            'in Tees',
            'in Women',
            'in Men',
        ])
    })

    it('opens a suggestion from the keyboard or narrows to a category', async () => {
        vi.useFakeTimers()
        stubSuggest()
        const get = vi.spyOn(router, 'get').mockImplementation(() => {})
        await mountSearch()
        await openSearch()
        await type('tee')
        await vi.advanceTimersByTimeAsync(300)

        await press('ArrowDown', searchBox())
        await press('ArrowDown', searchBox())
        await press('Enter', searchBox())
        expect(get).toHaveBeenLastCalledWith('https://shop.test/default/breathe-easy-tank.html')

        await openSearch()
        await type('tee')
        await vi.advanceTimersByTimeAsync(300)
        await click($$('button').find(b => /\S in Tees$/.test(b.textContent ?? '')))
        expect(get).toHaveBeenLastCalledWith('https://shop.test/catalogsearch/result/', { q: 'tee', cat: '22' })
    })

    it('tells the visitor when suggestions fail or find nothing', async () => {
        vi.useFakeTimers()
        stubSuggest({ errors: [{ message: 'Internal server error' }] })
        await mountSearch()
        await openSearch()
        await type('tee')
        await vi.advanceTimersByTimeAsync(300)
        expect(document.body.textContent).toContain('Something went wrong with your request. Please try again later.')

        stubSuggest({ data: { products: { total_count: 0, items: [], aggregations: [] } } })
        await type('zzz')
        await vi.advanceTimersByTimeAsync(300)
        expect(document.body.textContent).toContain('Your search returned no results.')
    })

    it('clears the suggestions on the first Escape and closes the search on the second', async () => {
        vi.useFakeTimers()
        stubSuggest()
        await mountSearch()
        await openSearch()
        await type('tee')
        await vi.advanceTimersByTimeAsync(300)

        await press('Escape')
        expect(byText('button', 'Breathe-Easy Tank$34.00')).toBeUndefined()
        expect(searchBox()).not.toBeNull()

        await press('Escape')
        expect($('input[role="combobox"]')).toBeNull()
    })

    it('opens over an inert page and hands focus back on Escape', async () => {
        const page = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'lynx' }))
        await mountSearch()
        const trigger = $('button[aria-label="Search"]')!
        trigger.focus()

        await openSearch()
        expect($('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
        expect(page.hasAttribute('inert')).toBe(true)

        await press('Escape')
        expect(page.hasAttribute('inert')).toBe(false)
        expect(document.activeElement).toBe(trigger)
        page.remove()
    })

    it('server-renders and hydrates the same markup', async () => {
        const { warnings } = await hydrate(HeaderSearch, { props, config })

        expect(warnings).toEqual([])
    })
})
