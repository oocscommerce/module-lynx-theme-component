import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Heading from 'OOCS_LynxThemeComponent/Components/Heading.vue'
import { describe, expect, it } from 'vitest'

const props = { text: 'New arrivals', level: 'h2', text_align: 'center', color: '' }

describe('Heading', () => {
    it('renders the text at the chosen level', () => {
        const wrapper = mountNode(Heading, { props })

        expect(wrapper.find('h2').text()).toBe('New arrivals')
        expect(wrapper.find('h2').attributes('style')).toBeUndefined()
    })

    it('applies a custom color', () => {
        const wrapper = mountNode(Heading, { props: { ...props, level: 'h4', color: '#aa0000' } })

        expect(wrapper.find('h4').attributes('style')).toContain('color: #aa0000')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Heading, { props })

        expect(html).toContain('New arrivals')
        expect(warnings).toEqual([])
    })
})
