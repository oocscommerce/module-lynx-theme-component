import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { type VueWrapper } from '@vue/test-utils'
import ContactForm from 'OOCS_LynxThemeComponent/Components/ContactForm.vue'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

const props = {
    urls: { post: 'https://shop.test/contact/index/post/' },
    labels: {
        enterName: 'This is a required field.',
        invalidEmail: 'Please enter a valid email address.',
        enterMessage: 'This is a required field.',
        name: 'Name',
        email: 'Email',
        emailPlaceholder: 'abc@xyz.com',
        phone: 'Phone Number',
        message: 'Message',
        messagePlaceholder: 'What’s on your mind?',
        sending: 'Sending…',
        send: 'Submit',
    },
}

/** Submit the form; true when the browser would go on and post it */
const submit = async (wrapper: VueWrapper) => {
    const event = new Event('submit', { cancelable: true })
    wrapper.find('form').element.dispatchEvent(event)
    await nextTick()
    return !event.defaultPrevented
}

const fill = async (wrapper: VueWrapper, email = 'ann@example.com') => {
    await wrapper.find('#contact-name').setValue('Ann')
    await wrapper.find('#contact-email').setValue(email)
    await wrapper.find('#contact-telephone').setValue('555-0100')
    await wrapper.find('#contact-comment').setValue('Do you ship abroad?')
}

const formKey = (wrapper: VueWrapper) => (wrapper.find('input[name="form_key"]').element as HTMLInputElement).value

describe('ContactForm', () => {
    it('posts to the contact URL with the labelled fields and a honeypot', () => {
        const wrapper = mountNode(ContactForm, { props })
        const form = wrapper.find('form')

        expect(form.attributes('action')).toBe('https://shop.test/contact/index/post/')
        expect(form.attributes('method')).toBe('post')
        expect(form.attributes('data-recaptcha')).toBe('contact')
        expect(wrapper.find('label[for="contact-name"]').text()).toContain('Name')
        expect(wrapper.find('#contact-email').attributes('placeholder')).toBe('abc@xyz.com')
        expect(wrapper.find('input[name="hideit"]').element.getAttribute('value')).toBe('')
        expect(wrapper.find('button[type="submit"]').text()).toBe('Submit')
    })

    it('blocks an empty submit and shows each field error', async () => {
        const wrapper = mountNode(ContactForm, { props })

        expect(await submit(wrapper)).toBe(false)

        expect(wrapper.text()).toContain('Please enter a valid email address.')
        expect(wrapper.findAll('p').filter(p => p.text() === 'This is a required field.')).toHaveLength(2)
        expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })

    it('rejects a malformed email and clears the error on typing', async () => {
        const wrapper = mountNode(ContactForm, { props })
        await fill(wrapper, 'ann@example')

        expect(await submit(wrapper)).toBe(false)
        expect(wrapper.text()).toContain('Please enter a valid email address.')

        await wrapper.find('#contact-email').setValue('ann@example.com')
        expect(wrapper.text()).not.toContain('Please enter a valid email address.')
    })

    it('lets a valid form post with the form key from the cookie', async () => {
        document.cookie = 'form_key=CookieKey1234567; path=/'
        const wrapper = mountNode(ContactForm, { props })
        await fill(wrapper)

        expect(await submit(wrapper)).toBe(true)

        expect(formKey(wrapper)).toBe('CookieKey1234567')
        expect(wrapper.find('button').attributes('disabled')).toBeDefined()
        expect(wrapper.find('button').text()).toBe('Sending…')
        const data = new FormData(wrapper.find('form').element)
        expect(Object.fromEntries(data)).toEqual({
            form_key: 'CookieKey1234567',
            hideit: '',
            name: 'Ann',
            email: 'ann@example.com',
            telephone: '555-0100',
            comment: 'Do you ship abroad?',
        })
    })

    it('mints a form key cookie when it has gone', async () => {
        const wrapper = mountNode(ContactForm, { props, config: { cookie: { path: '/', lifetime: 3600 } } })
        await fill(wrapper)

        await submit(wrapper)

        expect(formKey(wrapper)).toMatch(/^[0-9a-zA-Z]{16}$/)
        expect(document.cookie).toContain(`form_key=${formKey(wrapper)}`)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(ContactForm, { props })

        expect(html).toContain('https://shop.test/contact/index/post/')
        expect(warnings).toEqual([])
    })
})
