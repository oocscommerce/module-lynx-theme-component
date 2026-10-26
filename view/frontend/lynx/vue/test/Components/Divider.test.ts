import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Divider from 'OOCS_LynxThemeComponent/Components/Divider.vue'
import { describe, expect, it } from 'vitest'

describe('Divider', () => {
    it('renders a horizontal rule', () => {
        const wrapper = mountNode(Divider, { props: { spacing: 'lg' } })

        expect(wrapper.findAll('hr')).toHaveLength(1)
    })

    it('renders with an unknown spacing', () => {
        expect(
            mountNode(Divider, { props: { spacing: 'huge' } })
                .find('hr')
                .exists()
        ).toBe(true)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Divider, { props: { spacing: 'md' } })

        expect(html).toContain('<hr')
        expect(warnings).toEqual([])
    })
})
