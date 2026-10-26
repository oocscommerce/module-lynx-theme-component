import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import LinkList from 'OOCS_LynxThemeComponent/Components/LinkList.vue'
import { describe, expect, it } from 'vitest'

const props = {
    title: 'Customer service',
    size: 'base',
    links: [
        { label: 'Contact us', url: '/contact' },
        { label: 'Returns', url: '' },
    ],
}

describe('LinkList', () => {
    it('shows the title and every link', () => {
        const wrapper = mountNode(LinkList, { props })

        expect(wrapper.find('p').text()).toBe('Customer service')
        expect(wrapper.findAll('li')).toHaveLength(2)
        expect(wrapper.find('a[href="/contact"]').text()).toBe('Contact us')
    })

    it('keeps the title a step above the links at every size', () => {
        const classes = (size: string) => {
            const wrapper = mountNode(LinkList, { props: { ...props, size } })
            return [wrapper.find('p').classes(), wrapper.find('a').classes()]
        }

        expect(classes('sm')[0]).toContain('text-base')
        expect(classes('sm')[1]).toContain('text-sm')
        expect(classes('base')[0]).toContain('text-lg')
        expect(classes('base')[1]).toContain('text-base')
        expect(classes('lg')[0]).toContain('text-xl')
        expect(classes('lg')[1]).toContain('text-lg')
    })

    it('still renders a link without URL', () => {
        expect(mountNode(LinkList, { props }).findAll('a')[1].text()).toBe('Returns')
    })

    it('renders without a title or links', () => {
        const wrapper = mountNode(LinkList, { props: { title: '', links: [] } })

        expect(wrapper.find('p').exists()).toBe(false)
        expect(wrapper.findAll('li')).toHaveLength(0)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(LinkList, { props })

        expect(html).toContain('Contact us')
        expect(warnings).toEqual([])
    })
})
