import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Column from 'OOCS_LynxThemeComponent/Components/Column.vue'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

const props = { span: 2 }
const slots = { default: () => h('p', 'Customer service') }

describe('Column', () => {
    it('renders the blocks of its slot', () => {
        expect(mountNode(Column, { props, slots }).find('p').text()).toBe('Customer service')
    })

    it('renders an empty cell without blocks', () => {
        const wrapper = mountNode(Column, { props: { span: 9 } })

        expect(wrapper.find('div').exists()).toBe(true)
        expect(wrapper.text()).toBe('')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Column, { props, slots })

        expect(html).toContain('Customer service')
        expect(warnings).toEqual([])
    })
})
