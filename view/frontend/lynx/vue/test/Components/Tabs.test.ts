import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Tab from 'OOCS_LynxThemeComponent/Components/Tab.vue'
import Tabs from 'OOCS_LynxThemeComponent/Components/Tabs.vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'

const paragraph = (id: string, text: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({
    id,
    component: 'OOCS_LynxThemeComponent::Components/Paragraph',
    props: { text },
    ...extra,
})

const tab = (id: string, title: string, children: LayoutItem[]): LayoutItem => ({
    id,
    component: 'OOCS_LynxThemeComponent::Components/Tab',
    props: { title },
    slots: { default: children },
})

const items = [
    tab('t1', 'Description', [paragraph('p1', 'Soft cotton tee.')]),
    tab('t2', 'Shipping', [paragraph('p2', 'Ships in 2 days.')]),
    // Nothing shown inside: left out of the strip
    tab('t3', 'Empty', []),
    tab('t4', 'Disabled', [paragraph('p4', 'Hidden', { props: { text: 'Hidden', enabled: false } })]),
    tab('t5', 'Invisible', [paragraph('p5', 'Hidden', { visible: false })]),
    tab('t6', 'Returns', [paragraph('p6', 'Free returns for 30 days.')]),
]

// Stands in for DynamicNode: the slot of Tabs holds nodes carrying their layout item
const Node = defineComponent({
    props: { item: { type: Object as PropType<LayoutItem>, required: true } },
    setup: props => () =>
        h(Tab, { title: String(props.item.props.title) }, () =>
            (props.item.slots?.default ?? []).map(child => h('p', { key: child.id }, String(child.props.text)))
        ),
})

const slots = (list = items) => ({ default: () => list.map(item => h(Node, { key: item.id, item })) })

const mountTabs = (orientation = 'horizontal', list = items) =>
    mountNode(Tabs, { props: { orientation }, slots: slots(list), attachTo: document.body })

const tabs = (wrapper: VueWrapper) => wrapper.findAll('[role="tab"]')
const selected = (wrapper: VueWrapper) => wrapper.find('[aria-selected="true"]').text()
const panel = (wrapper: VueWrapper) => wrapper.find('[role="tabpanel"]').text()

const press = async (wrapper: VueWrapper, key: string) => {
    await wrapper.find('[role="tablist"]').trigger('keydown', { key })
    await flushPromises()
}

describe('Tabs', () => {
    it('keeps the last tab when the selected one goes away, and returns to it when it comes back', async () => {
        const list = ref(items)
        const Page = defineComponent({
            setup: () => () =>
                h(
                    Tabs,
                    { orientation: 'horizontal' },
                    { default: () => list.value.map(item => h(Node, { key: item.id, item })) }
                ),
        })
        const wrapper = mountNode(Page, { attachTo: document.body })
        await tabs(wrapper)[2].trigger('click')
        expect(selected(wrapper)).toBe('Returns')

        list.value = items.filter(item => item.id !== 't6')
        await flushPromises()
        expect(selected(wrapper)).toBe('Shipping')

        list.value = items
        await flushPromises()
        expect(selected(wrapper)).toBe('Returns')
    })

    it('lists only the tabs with something to show, the first one selected', () => {
        const wrapper = mountTabs()
        const [first, second] = tabs(wrapper)
        const tabpanel = wrapper.find('[role="tabpanel"]')

        expect(tabs(wrapper).map(t => t.text())).toEqual(['Description', 'Shipping', 'Returns'])
        expect(first.attributes('aria-selected')).toBe('true')
        expect(first.attributes('tabindex')).toBe('0')
        expect(second.attributes('aria-selected')).toBe('false')
        expect(second.attributes('tabindex')).toBe('-1')
        expect(first.attributes('aria-controls')).toBe(tabpanel.attributes('id'))
        expect(tabpanel.attributes('aria-labelledby')).toBe(first.attributes('id'))
        expect(panel(wrapper)).toBe('Soft cotton tee.')
    })

    it('shows the panel of the tab clicked', async () => {
        const wrapper = mountTabs()

        await tabs(wrapper)[1].trigger('click')

        expect(selected(wrapper)).toBe('Shipping')
        expect(panel(wrapper)).toBe('Ships in 2 days.')
        expect(wrapper.find('[role="tabpanel"]').attributes('aria-labelledby')).toBe(tabs(wrapper)[1].attributes('id'))
    })

    it('moves the selection and focus with the arrows, wrapping, and Home/End', async () => {
        const wrapper = mountTabs()

        await press(wrapper, 'ArrowRight')
        expect(selected(wrapper)).toBe('Shipping')
        expect(document.activeElement).toBe(tabs(wrapper)[1].element)

        await press(wrapper, 'ArrowRight')
        await press(wrapper, 'ArrowRight')
        expect(selected(wrapper)).toBe('Description')

        await press(wrapper, 'ArrowLeft')
        expect(selected(wrapper)).toBe('Returns')
        expect(panel(wrapper)).toBe('Free returns for 30 days.')

        await press(wrapper, 'Home')
        expect(selected(wrapper)).toBe('Description')
        await press(wrapper, 'End')
        expect(selected(wrapper)).toBe('Returns')
        expect(document.activeElement).toBe(tabs(wrapper)[2].element)
    })

    it('ignores keys that do not navigate', async () => {
        const wrapper = mountTabs()
        const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true })

        wrapper.find('[role="tablist"]').element.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
        expect(selected(wrapper)).toBe('Description')
    })

    it('steps with up and down in a vertical strip', async () => {
        const wrapper = mountTabs('vertical')

        expect(wrapper.find('[role="tablist"]').attributes('aria-orientation')).toBe('vertical')
        await press(wrapper, 'ArrowDown')
        expect(selected(wrapper)).toBe('Shipping')
        await press(wrapper, 'ArrowUp')
        expect(selected(wrapper)).toBe('Description')
    })

    it('opens the tab holding the node highlighted in the editor', async () => {
        const wrapper = mountTabs()

        window.dispatchEvent(new MessageEvent('message', { data: { type: 'lynx:highlight', id: 'p6' } }))
        await flushPromises()

        expect(selected(wrapper)).toBe('Returns')
    })

    it('renders nothing when no tab has content', () => {
        const wrapper = mountTabs('horizontal', [items[2], items[3]])

        expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Tabs, { props: { orientation: 'horizontal' }, slots: slots() })

        expect(html).toContain('Soft cotton tee.')
        // Known and reported: the panel-count watch calls the slot outside render, a dev-only warning
        expect(warnings).toEqual([])
    })
})
