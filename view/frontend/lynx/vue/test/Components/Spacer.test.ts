import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Spacer from 'OOCS_LynxThemeComponent/Components/Spacer.vue'
import { describe, expect, it } from 'vitest'

describe('Spacer', () => {
    it('takes the set height, hidden from assistive technology', () => {
        const spacer = mountNode(Spacer, { props: { height: 48 } }).find('div')

        expect(spacer.attributes('style')).toContain('height: 48px')
        expect(spacer.attributes('aria-hidden')).toBe('true')
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Spacer, { props: { height: 48 } })

        expect(html).toContain('height:48px')
        expect(warnings).toEqual([])
    })
})
