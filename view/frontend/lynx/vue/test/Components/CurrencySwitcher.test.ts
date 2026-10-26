import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { type VueWrapper } from '@vue/test-utils'
import CurrencySwitcher from 'OOCS_LynxThemeComponent/Components/CurrencySwitcher.vue'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const props = {
    size: 'base',
    title: '',
    options: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'XTS', name: 'XTS', symbol: 'XTS' },
    ],
    switch_url: 'https://shop.test/directory/currency/switch/',
    sections: ['*'],
    show_title: true,
    display: 'dropdown',
    format: 'code_name',
    labels: { title: 'Currency' },
}

const config = { currencyCode: 'USD' }

/** Fields of every form the switcher submitted */
const spySubmit = () => {
    const posted: { action: string; method: string; fields: Record<string, FormDataEntryValue> }[] = []
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
        posted.push({ action: this.action, method: this.method, fields: Object.fromEntries(new FormData(this)) })
    })
    return posted
}

const button = (wrapper: VueWrapper, text: string) => wrapper.findAll('button').find(b => b.text() === text)

describe('CurrencySwitcher', () => {
    it('shows the title and the current currency on the trigger', () => {
        const wrapper = mountNode(CurrencySwitcher, { props, config })
        const trigger = wrapper.find('[aria-haspopup]')

        expect(wrapper.find('p').text()).toBe('Currency')
        expect(trigger.text()).toBe('USD - US Dollar')
        expect(trigger.attributes('aria-expanded')).toBe('false')
    })

    it('opens the list and posts the chosen currency with the form key', async () => {
        document.cookie = 'form_key=CookieKey1234567; path=/'
        const posted = spySubmit()
        const wrapper = mountNode(CurrencySwitcher, { props, config })

        await wrapper.find('[aria-haspopup]').trigger('click')
        expect(wrapper.find('[aria-haspopup]').attributes('aria-expanded')).toBe('true')
        await button(wrapper, 'EUR - Euro')?.trigger('click')

        expect(posted).toEqual([
            {
                action: 'https://shop.test/directory/currency/switch/',
                method: 'post',
                fields: { form_key: 'CookieKey1234567', currency: 'EUR' },
            },
        ])
        expect(wrapper.find('[aria-haspopup]').attributes('aria-expanded')).toBe('false')
    })

    it('only closes the list when the current currency is picked', async () => {
        const posted = spySubmit()
        const wrapper = mountNode(CurrencySwitcher, { props, config })

        await wrapper.find('[aria-haspopup]').trigger('click')
        await wrapper
            .findAll('button')
            .filter(b => b.text() === 'USD - US Dollar')[1]
            .trigger('click')

        expect(posted).toEqual([])
        expect(button(wrapper, 'EUR - Euro')).toBeUndefined()
    })

    it('closes the list on a click outside', async () => {
        const wrapper = mountNode(CurrencySwitcher, { props, config })

        await wrapper.find('[aria-haspopup]').trigger('click')
        // The backdrop sits right before the trigger
        ;(wrapper.find('[aria-haspopup]').element.previousElementSibling as HTMLElement).click()
        await nextTick()

        expect(button(wrapper, 'EUR - Euro')).toBeUndefined()
    })

    it('writes each option as the format setting says', () => {
        const labels = (format: string) => {
            const wrapper = mountNode(CurrencySwitcher, { props: { ...props, display: 'links', format }, config })
            const texts = wrapper.findAll('button').map(b => b.text())
            wrapper.unmount()
            return texts
        }

        expect(labels('code_name')).toEqual(['USD - US Dollar', 'EUR - Euro', 'XTS'])
        expect(labels('code')).toEqual(['USD', 'EUR', 'XTS'])
        expect(labels('name')).toEqual(['US Dollar', 'Euro', 'XTS'])
        expect(labels('symbol_code')).toEqual(['$ USD', '€ EUR', 'XTS'])
    })

    it('lists links with the current one marked, posting on click', async () => {
        const posted = spySubmit()
        const wrapper = mountNode(CurrencySwitcher, {
            props: { ...props, display: 'links', show_title: false },
            config,
        })

        expect(wrapper.find('p').exists()).toBe(false)
        expect(wrapper.find('[aria-current="true"]').text()).toBe('USD - US Dollar')
        await button(wrapper, 'EUR - Euro')?.trigger('click')

        expect(posted.map(form => form.fields.currency)).toEqual(['EUR'])
    })

    it('renders nothing without currencies to choose from', () => {
        expect(mountNode(CurrencySwitcher, { props: { ...props, options: [] }, config }).text()).toBe('')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(CurrencySwitcher, { props, config })

        expect(html).toContain('USD - US Dollar')
        expect(warnings).toEqual([])
    })

    it('sizes the title a step above the options', () => {
        const wrapper = mountNode(CurrencySwitcher, { props: { ...props, size: 'sm' }, config })

        expect(wrapper.find('p').classes()).toContain('text-base')
        expect(wrapper.find('button[aria-haspopup="true"]').classes()).toContain('text-sm')
    })
})
