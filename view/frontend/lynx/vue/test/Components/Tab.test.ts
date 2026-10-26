import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'

import Tab from 'OOCS_LynxThemeComponent/Components/Tab.vue'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

const props = { title: 'Description' }
const slots = { default: () => [h('p', 'Soft cotton tee.'), h('p', 'Machine washable.')] }

describe('Tab', () => {
    it('renders the blocks placed in it, not its title', () => {
        const wrapper = mountNode(Tab, { props, slots })

        expect(wrapper.findAll('p').map(p => p.text())).toEqual(['Soft cotton tee.', 'Machine washable.'])
        expect(wrapper.text()).not.toContain('Description')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Tab, { props, slots })

        expect(html).toContain('Machine washable.')
        expect(warnings).toEqual([])
    })
})
