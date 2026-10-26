import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Banner from 'OOCS_LynxThemeComponent/Components/Banner.vue'
import { describe, expect, it } from 'vitest'

const props = {
    image: 'https://shop.test/media/lynx/hero.jpg',
    title: 'Summer collection',
    subtitle: 'Fresh styles <strong>every week</strong>',
    cta_label: 'Shop now',
    cta_url: '/women.html',
    min_height: 420,
}

describe('Banner', () => {
    it('shows the title, the subtitle markup and the call to action', () => {
        const wrapper = mountNode(Banner, { props })

        expect(wrapper.find('h1').text()).toBe('Summer collection')
        expect(wrapper.find('strong').text()).toBe('every week')
        expect(wrapper.find('a[href="/women.html"]').text()).toBe('Shop now')
    })

    it('sets the background image and the minimum height', () => {
        const style = mountNode(Banner, { props }).find('div').attributes('style')

        expect(style).toContain('min-height: 420px')
        expect(style).toContain('hero.jpg')
    })

    it('leaves out what is not set', () => {
        const wrapper = mountNode(Banner, {
            props: { ...props, image: '', title: '', subtitle: '', cta_label: '' },
        })

        expect(wrapper.find('h1').exists()).toBe(false)
        expect(wrapper.find('a').exists()).toBe(false)
        expect(wrapper.text()).toBe('')
        expect(wrapper.find('div').attributes('style')).not.toContain('background-image')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Banner, { props })

        expect(html).toContain('Summer collection')
        expect(warnings).toEqual([])
    })
})
