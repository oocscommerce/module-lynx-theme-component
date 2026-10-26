import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { type VueWrapper } from '@vue/test-utils'
import StoreSwitcher from 'OOCS_LynxThemeComponent/Components/StoreSwitcher.vue'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const props = {
    title: '',
    options: [
        { code: 'default', name: 'English' },
        { code: 'french', name: 'Français' },
    ],
    redirect_url: 'https://shop.test/stores/store/redirect/',
    sections: ['*'],
    show_title: true,
    size: 'base',
    display: 'dropdown',
    labels: { title: 'Select Store' },
}

const config = { storeCode: 'default', storeInUrl: false }

/** Where the switch sends the visitor, with the return URL decoded from uenc */
const spyAssign = () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    return () => {
        const target = new URL(String(assign.mock.calls[0][0]))
        const uenc = target.searchParams.get('uenc') ?? ''
        return {
            path: target.origin + target.pathname,
            store: target.searchParams.get('___store'),
            from: target.searchParams.get('___from_store'),
            back: atob(uenc.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=')),
            calls: assign.mock.calls.length,
        }
    }
}

/** The page the visitor is on; set once Inertia has written its own page URL after booting */
const visiting = async (path: string) => {
    await new Promise(resolve => setTimeout(resolve))
    history.replaceState(null, '', path)
}

const button = (wrapper: VueWrapper, text: string) => wrapper.findAll('button').find(b => b.text() === text)

const pick = async (wrapper: VueWrapper, name: string) => {
    await wrapper.find('[aria-haspopup]').trigger('click')
    await button(wrapper, name)?.trigger('click')
}

describe('StoreSwitcher', () => {
    it('shows the title and the current store on the trigger', () => {
        const wrapper = mountNode(StoreSwitcher, { props, config })

        expect(wrapper.find('p').text()).toBe('Select Store')
        expect(wrapper.find('[aria-haspopup]').text()).toBe('English')
        expect(wrapper.find('[aria-haspopup]').attributes('aria-expanded')).toBe('false')
    })

    it('redirects to the chosen store with this page to come back to', async () => {
        const target = spyAssign()
        const wrapper = mountNode(StoreSwitcher, { props, config })
        await visiting('/women/tops.html?color=red')

        await pick(wrapper, 'Français')

        expect(target()).toMatchObject({
            path: 'https://shop.test/stores/store/redirect/',
            store: 'french',
            from: 'default',
            back: `${location.origin}/women/tops.html?color=red`,
        })
    })

    it('swaps the store code in the path when URLs carry it', async () => {
        const target = spyAssign()
        const wrapper = mountNode(StoreSwitcher, { props, config: { ...config, storeInUrl: true } })
        await visiting('/default/women/tops.html')

        await pick(wrapper, 'Français')

        expect(target().back).toBe(`${location.origin}/french/women/tops.html`)
    })

    it('adds the store code to a path without one when URLs carry it', async () => {
        const target = spyAssign()
        const wrapper = mountNode(StoreSwitcher, { props, config: { ...config, storeInUrl: true } })
        await visiting('/women.html')

        await pick(wrapper, 'Français')

        expect(target().back).toBe(`${location.origin}/french/women.html`)
    })

    it('only closes the list when the current store is picked', async () => {
        const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
        const wrapper = mountNode(StoreSwitcher, { props, config })

        await wrapper.find('[aria-haspopup]').trigger('click')
        await wrapper
            .findAll('button')
            .filter(b => b.text() === 'English')[1]
            .trigger('click')

        expect(assign).not.toHaveBeenCalled()
        expect(button(wrapper, 'Français')).toBeUndefined()
    })

    it('closes the list on a click outside', async () => {
        const wrapper = mountNode(StoreSwitcher, { props, config })

        await wrapper.find('[aria-haspopup]').trigger('click')
        // The backdrop sits right before the trigger
        ;(wrapper.find('[aria-haspopup]').element.previousElementSibling as HTMLElement).click()
        await nextTick()

        expect(button(wrapper, 'Français')).toBeUndefined()
    })

    it('lists links with the current one marked, switching on click', async () => {
        const target = spyAssign()
        const wrapper = mountNode(StoreSwitcher, { props: { ...props, display: 'links', show_title: false }, config })

        expect(wrapper.find('p').exists()).toBe(false)
        expect(wrapper.find('[aria-current="true"]').text()).toBe('English')
        await button(wrapper, 'Français')?.trigger('click')

        expect(target().store).toBe('french')
    })

    it('renders nothing without another store to switch to', () => {
        expect(mountNode(StoreSwitcher, { props: { ...props, options: [] }, config }).text()).toBe('')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(StoreSwitcher, { props, config })

        expect(html).toContain('English')
        expect(warnings).toEqual([])
    })

    it('sizes the title a step above the options', () => {
        const wrapper = mountNode(StoreSwitcher, { props: { ...props, size: 'lg', display: 'links' }, config })

        expect(wrapper.find('p').classes()).toContain('text-xl')
        expect(button(wrapper, 'Français')!.classes()).toContain('text-lg')
    })
})
