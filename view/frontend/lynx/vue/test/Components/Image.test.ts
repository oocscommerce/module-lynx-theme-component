import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Image from 'OOCS_LynxThemeComponent/Components/Image.vue'
import { describe, expect, it } from 'vitest'

const props = {
    src: 'https://shop.test/media/lynx/lookbook.jpg',
    alt: 'Autumn lookbook',
    href: '',
    width: 640,
    justify: 'center',
    rounded: 'md',
    new_tab: false,
}

describe('Image', () => {
    it('renders the image lazily with its alt text and width', () => {
        const img = mountNode(Image, { props }).find('img')

        expect(img.attributes('src')).toBe(props.src)
        expect(img.attributes('alt')).toBe('Autumn lookbook')
        expect(img.attributes('width')).toBe('640')
        expect(img.attributes('loading')).toBe('lazy')
    })

    it('leaves the width out when it is 0', () => {
        const img = mountNode(Image, { props: { ...props, width: 0 } }).find('img')

        expect(img.attributes('width')).toBeUndefined()
    })

    it('is not a link without a URL', () => {
        expect(mountNode(Image, { props }).find('a').exists()).toBe(false)
    })

    it('links to the URL, in a new tab when set to', () => {
        const link = mountNode(Image, { props: { ...props, href: '/lookbook', new_tab: true } }).find('a')

        expect(link.attributes('href')).toBe('/lookbook')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.find('img').exists()).toBe(true)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Image, { props: { ...props, href: '/lookbook' } })

        expect(html).toContain('lookbook.jpg')
        expect(warnings).toEqual([])
    })
})
