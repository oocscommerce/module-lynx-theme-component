import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import NotFound from 'OOCS_LynxThemeComponent/Components/NotFound.vue'
import { describe, expect, it } from 'vitest'

describe('NotFound', () => {
    it('shows the 404 mark, hidden from assistive technology', () => {
        const mark = mountNode(NotFound).find('p')

        expect(mark.text()).toBe('404')
        expect(mark.attributes('aria-hidden')).toBe('true')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(NotFound)

        expect(html).toContain('404')
        expect(warnings).toEqual([])
    })
})
