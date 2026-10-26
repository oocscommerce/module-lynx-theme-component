import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Row from 'OOCS_LynxThemeComponent/Components/Row.vue'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

const props = { columns: 4, columns_tablet: 0, columns_mobile: 0, gap: 24, vertical_align: 'stretch' }
const slots = { default: () => [h('p', 'First'), h('p', 'Second')] }

describe('Row', () => {
    it('lays its blocks out with the gap', () => {
        const wrapper = mountNode(Row, { props, slots })

        expect(wrapper.findAll('p').map(p => p.text())).toEqual(['First', 'Second'])
        expect(wrapper.find('div').attributes('style')).toContain('gap: 24px')
    })

    it('renders with out-of-range column counts', () => {
        const wrapper = mountNode(Row, {
            props: { ...props, columns: 12, columns_tablet: 9, columns_mobile: 9 },
            slots,
        })

        expect(wrapper.findAll('p')).toHaveLength(2)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Row, { props, slots })

        expect(html).toContain('Second')
        expect(warnings).toEqual([])
    })
})
