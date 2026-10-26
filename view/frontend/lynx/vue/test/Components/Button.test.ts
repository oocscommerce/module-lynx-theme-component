import { router } from '@inertiajs/vue3'
import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import Button from 'OOCS_LynxThemeComponent/Components/Button.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    label: 'View all products',
    href: '/catalog.html',
    variant: 'primary',
    size: 'md',
    justify: 'center',
    new_tab: false,
}

describe('Button', () => {
    it('links the label to its URL in the same tab', () => {
        const link = mountNode(Button, { props }).find('a')

        expect(link.text()).toBe('View all products')
        expect(link.attributes('href')).toBe('/catalog.html')
        expect(link.attributes('target')).toBeUndefined()
        expect(link.attributes('rel')).toBeUndefined()
    })

    it('opens in a new tab when set to', () => {
        const link = mountNode(Button, { props: { ...props, new_tab: true } }).find('a')

        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toBe('noopener')
    })

    it('navigates through Inertia on click', async () => {
        const visit = vi.spyOn(router, 'visit').mockImplementation(() => {})

        await mountNode(Button, { props }).find('a').trigger('click')

        expect(visit).toHaveBeenCalledWith('/catalog.html', expect.anything())
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Button, { props })

        expect(html).toContain('View all products')
        expect(warnings).toEqual([])
    })
})
