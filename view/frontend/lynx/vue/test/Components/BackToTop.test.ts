import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises } from '@vue/test-utils'
import BackToTop from 'OOCS_LynxThemeComponent/Components/BackToTop.vue'
import { describe, expect, it, vi } from 'vitest'

const props = { position: 'right', color: 'dark', size: 'md', labels: { backToTop: 'Back to top' } }

const scrollTo = async (y: number) => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
    window.dispatchEvent(new Event('scroll'))
    await flushPromises()
}

describe('BackToTop', () => {
    it('appears once the page is scrolled and hides back at the top', async () => {
        const wrapper = mountNode(BackToTop, { props })
        expect(wrapper.find('button').exists()).toBe(false)

        await scrollTo(600)
        expect(wrapper.find('button').attributes('title')).toBe('Back to top')

        await scrollTo(0)
        expect(wrapper.find('button').exists()).toBe(false)
    })

    it('scrolls smoothly to the top when pressed', async () => {
        const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
        const wrapper = mountNode(BackToTop, { props })
        await scrollTo(600)

        await wrapper.find('button').trigger('click')

        expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })

    it('stops listening once removed', async () => {
        const wrapper = mountNode(BackToTop, { props })
        const remove = vi.spyOn(window, 'removeEventListener')

        wrapper.unmount()

        expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(BackToTop, { props })

        // Only the browser knows the scroll position
        expect(html).not.toContain('Back to top')
        expect(warnings).toEqual([])
    })
})
