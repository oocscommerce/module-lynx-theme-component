import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import AnnouncementBar from 'OOCS_LynxThemeComponent/Components/AnnouncementBar.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    background: '',
    text_color: '',
    items: [
        { text: 'Free shipping', link_label: 'Shop now', link_url: '/sale' },
        { text: 'New arrivals' },
        { text: ' ' },
    ],
    dismissible: true,
    speed: 4,
    labels: { previous: 'Previous', next: 'Next', close: 'Close' },
}

describe('AnnouncementBar', () => {
    it('shows the first message with its link', () => {
        const wrapper = mountNode(AnnouncementBar, { props })

        expect(wrapper.text()).toContain('Free shipping')
        expect(wrapper.find('a[href="/sale"]').text()).toBe('Shop now')
    })

    it('pages with the arrows, skipping blank messages', async () => {
        const wrapper = mountNode(AnnouncementBar, { props })

        await wrapper.find('[aria-label="Next"]').trigger('click')
        expect(wrapper.text()).toContain('New arrivals')

        await wrapper.find('[aria-label="Next"]').trigger('click')
        expect(wrapper.text()).toContain('Free shipping')

        await wrapper.find('[aria-label="Previous"]').trigger('click')
        expect(wrapper.text()).toContain('New arrivals')
    })

    it('moves on by itself at the set speed', async () => {
        vi.useFakeTimers()
        const wrapper = mountNode(AnnouncementBar, { props })

        await vi.advanceTimersByTimeAsync(4000)

        expect(wrapper.text()).toContain('New arrivals')
    })

    it('closes when dismissed', async () => {
        const wrapper = mountNode(AnnouncementBar, { props })

        await wrapper.find('[aria-label="Close"]').trigger('click')

        expect(wrapper.text()).toBe('')
    })

    it('has no arrows for one message and no close button unless dismissible', () => {
        const wrapper = mountNode(AnnouncementBar, {
            props: { ...props, items: [{ text: 'Only one' }], dismissible: false },
        })

        expect(wrapper.findAll('button')).toHaveLength(0)
    })

    it('renders nothing without a message', () => {
        expect(mountNode(AnnouncementBar, { props: { ...props, items: [] } }).text()).toBe('')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(AnnouncementBar, { props })

        expect(html).toContain('Free shipping')
        expect(warnings).toEqual([])
    })
})
