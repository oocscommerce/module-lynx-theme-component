import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Group from 'OOCS_LynxThemeComponent/Components/Group.vue'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

const props = {
    layout: 'constrained',
    width: 'site',
    padding_y: 'md',
    padding_x: 'default',
    gap: 'md',
    min_height: 0,
    content_position: 'top',
    color: '',
    background: '',
    gradient: 'none',
    background_image: '',
    background_size: 'cover',
    background_position: 'center',
    overlay: 0,
    border: 'none',
    rounded: 'none',
    tag: 'section',
    anchor: '',
}
const slots = { default: () => h('p', 'Inside the group') }

describe('Group', () => {
    it('wraps its blocks in the chosen tag', () => {
        const wrapper = mountNode(Group, { props, slots })

        expect(wrapper.find('section').exists()).toBe(true)
        expect(wrapper.find('section p').text()).toBe('Inside the group')
        expect(wrapper.find('section').attributes('id')).toBeUndefined()
    })

    it('uses the anchor as the id', () => {
        const wrapper = mountNode(Group, { props: { ...props, tag: 'footer', anchor: 'contact' }, slots })

        expect(wrapper.find('footer').attributes('id')).toBe('contact')
    })

    it('applies colors, background image and minimum height', () => {
        const style = mountNode(Group, {
            props: {
                ...props,
                color: '#ffffff',
                background: '#112233',
                background_image: 'https://shop.test/media/lynx/band.jpg',
                min_height: 300,
            },
            slots,
        })
            .find('section')
            .attributes('style')

        expect(style).toContain('color: #ffffff')
        expect(style).toContain('band.jpg')
        expect(style).toContain('min-height: 300px')
    })

    it('draws an overlay only when set, capped at 100%', () => {
        expect(mountNode(Group, { props, slots }).find('[aria-hidden="true"]').exists()).toBe(false)

        const overlay = mountNode(Group, { props: { ...props, overlay: 150 }, slots }).find('[aria-hidden="true"]')
        expect(overlay.attributes('style')).toContain('rgb(0 0 0 / 1)')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Group, { props: { ...props, overlay: 40 }, slots })

        expect(html).toContain('Inside the group')
        expect(warnings).toEqual([])
    })
})
