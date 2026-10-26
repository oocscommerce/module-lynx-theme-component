import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import SocialLinks from 'OOCS_LynxThemeComponent/Components/SocialLinks.vue'
import { describe, expect, it } from 'vitest'

const props = {
    size: 'base',
    title: 'Follow us',
    items: [
        { network: 'instagram', url: 'https://instagram.com/shop' },
        { network: 'myspace', url: 'https://myspace.com/shop' },
        { network: 'youtube', url: '' },
    ],
}

describe('SocialLinks', () => {
    it('shows the title and an icon link per known network', () => {
        const wrapper = mountNode(SocialLinks, { props })

        expect(wrapper.find('p').text()).toBe('Follow us')
        expect(wrapper.findAll('a').map(a => a.attributes('aria-label'))).toEqual(['Instagram', 'YouTube'])
    })

    it('opens the network in a new tab', () => {
        const link = mountNode(SocialLinks, { props }).find('a[aria-label="Instagram"]')

        expect(link.attributes('href')).toBe('https://instagram.com/shop')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toBe('noopener')
        expect(link.find('svg path').exists()).toBe(true)
    })

    it('points a network without URL at #', () => {
        expect(mountNode(SocialLinks, { props }).find('a[aria-label="YouTube"]').attributes('href')).toBe('#')
    })

    it('renders no title when empty', () => {
        expect(
            mountNode(SocialLinks, { props: { ...props, title: '' } })
                .find('p')
                .exists()
        ).toBe(false)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(SocialLinks, { props })

        expect(html).toContain('Instagram')
        expect(warnings).toEqual([])
    })

    it('sizes the title', () => {
        expect(
            mountNode(SocialLinks, { props: { ...props, size: 'sm' } })
                .find('p')
                .classes()
        ).toContain('text-base')
    })
})
