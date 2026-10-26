import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { useMessagesStore } from 'OOCS_LynxTheme/stores/global/messagesStore'
import NewsletterForm from 'OOCS_LynxThemeComponent/Components/NewsletterForm.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    size: 'base',
    title: 'Join our newsletter',
    note: 'News and offers, once a month.',
    placeholder: 'Your email',
    urls: { subscribe: 'https://shop.test/newsletter/subscriber/new/' },
    sections: { subscribe: ['customer'] },
    labels: {
        emailAddress: 'Email Address',
        subscribe: 'Subscribe',
        subscribing: 'Subscribing…',
        subscribeError: 'Something went wrong with the subscription.',
    },
}

const config = { sections: { url: '/customer/section/load', lifetime: 3600, clientSide: [] } }

/** The endpoint answering with a flash message cookie, as the native controller does */
const stubFetch = () => {
    const fetch = vi.fn(async (url: string) => {
        if (String(url).includes('newsletter')) {
            document.cookie = `mage-messages=${encodeURIComponent('[{"type":"success","text":"Thank you for your subscription."}]')}; path=/`
        }
        return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
}

const submit = async (wrapper: VueWrapper) => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
}

describe('NewsletterForm', () => {
    it('shows the title, note and labelled email field', () => {
        const wrapper = mountNode(NewsletterForm, { props })
        const input = wrapper.find('input[type="email"]')

        expect(wrapper.text()).toContain('Join our newsletter')
        expect(wrapper.text()).toContain('News and offers, once a month.')
        expect(input.attributes('placeholder')).toBe('Your email')
        expect(input.attributes('aria-label')).toBe('Email Address')
        expect(wrapper.find('form').attributes('data-recaptcha')).toBe('newsletter')
        expect(wrapper.find('button').text()).toBe('Subscribe')
    })

    it('leaves out the heading without a title or note', () => {
        const wrapper = mountNode(NewsletterForm, { props: { ...props, title: '', note: '' } })

        expect(wrapper.findAll('p')).toHaveLength(0)
    })

    it('posts the email with the form key and captcha, then shows the result and reloads sections', async () => {
        const fetch = stubFetch()
        document.cookie = 'form_key=CookieKey1234567; path=/'
        const wrapper = mountNode(NewsletterForm, { props, config })
        const captcha = document.createElement('textarea')
        captcha.name = 'g-recaptcha-response'
        captcha.value = 'captcha-token'
        wrapper.find('form').element.append(captcha)

        await wrapper.find('input').setValue('ann@example.com')
        await submit(wrapper)

        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe('https://shop.test/newsletter/subscriber/new/')
        expect(init.method).toBe('POST')
        expect(init.redirect).toBe('manual')
        expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
            form_key: 'CookieKey1234567',
            email: 'ann@example.com',
            'g-recaptcha-response': 'captcha-token',
        })
        expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get('sections')).toBe('customer')
        expect(useMessagesStore().items).toMatchObject([{ type: 'success', text: 'Thank you for your subscription.' }])
        expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
        expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })

    it('reports a failed request and keeps the email', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
        const wrapper = mountNode(NewsletterForm, { props, config })

        await wrapper.find('input').setValue('ann@example.com')
        await submit(wrapper)

        expect(useMessagesStore().items).toMatchObject([
            { type: 'error', text: 'Something went wrong with the subscription.' },
        ])
        expect((wrapper.find('input').element as HTMLInputElement).value).toBe('ann@example.com')
    })

    it('sends nothing without an email', async () => {
        const fetch = stubFetch()
        const wrapper = mountNode(NewsletterForm, { props, config })

        await submit(wrapper)

        expect(fetch).not.toHaveBeenCalled()
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(NewsletterForm, { props })

        expect(html).toContain('Join our newsletter')
        expect(warnings).toEqual([])
    })

    it('sizes the title and the note', () => {
        const wrapper = mountNode(NewsletterForm, { props: { ...props, size: 'lg' } })
        const [title, note] = wrapper.findAll('p')

        expect(title.classes()).toContain('text-xl')
        expect(note.classes()).toContain('text-base')
    })
})
