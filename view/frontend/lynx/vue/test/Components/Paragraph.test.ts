import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Paragraph from 'OOCS_LynxThemeComponent/Components/Paragraph.vue'
import { describe, expect, it } from 'vitest'

const props = {
    content: '<p>Free shipping on <strong>all orders</strong>.</p><p><a href="/faq">Read the FAQ</a></p>',
    text_align: 'left',
    size: 'base',
    color: '',
}

describe('Paragraph', () => {
    it('renders the rich text as markup', () => {
        const wrapper = mountNode(Paragraph, { props })

        expect(wrapper.findAll('p')).toHaveLength(2)
        expect(wrapper.find('strong').text()).toBe('all orders')
        expect(wrapper.find('a[href="/faq"]').text()).toBe('Read the FAQ')
    })

    it('applies a custom color', () => {
        const wrapper = mountNode(Paragraph, { props: { ...props, color: '#333333' } })

        expect(wrapper.find('div').attributes('style')).toContain('color: #333333')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Paragraph, { props })

        expect(html).toContain('all orders')
        expect(warnings).toEqual([])
    })
})
