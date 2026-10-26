<script lang="ts">
import { defineComponent, h, nextTick, ref, useId, onMounted, onUnmounted, type VNode } from 'vue'

/**
 * One panel of several at a time
 */

function hasContent(item: LayoutItem): boolean {
    const children = Object.values(item.slots ?? {})
        .flat()
        .filter(c => c.visible !== false)
    return children.some(c => (c.props as { enabled?: boolean } | undefined)?.enabled !== false)
}

function contains(item: LayoutItem, id: string): boolean {
    if (item.id === id) return true
    return Object.values(item.slots ?? {})
        .flat()
        .some(c => contains(c, id))
}

export default defineComponent({
    name: 'Tabs',
    props: {
        orientation: { type: String, required: true },
    },
    setup(props, { slots }) {
        const active = ref(0)
        const id = useId()

        // Arrows step through the tabs (mirrored on RTL), Home and End jump to the ends; the tab reached is selected
        const onKeydown = (e: KeyboardEvent, current: number, count: number) => {
            const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === 'rtl'
            const steps: Record<string, number> = {
                ArrowRight: rtl ? -1 : 1,
                ArrowLeft: rtl ? 1 : -1,
                ArrowDown: 1,
                ArrowUp: -1,
            }
            const step = steps[e.key]
            const target =
                e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? count - 1
                      : step === undefined
                        ? -1
                        : (current + step + count) % count
            if (target < 0) return
            e.preventDefault()
            active.value = target
            void nextTick(() => document.getElementById(`${id}-tab-${target}`)?.focus())
        }

        // The Tab vnodes with something in them, read from the slot on each render; only the render may call it
        const panels = (): VNode[] =>
            (slots.default?.() ?? []).filter(v => {
                const item = (v.props as { item?: LayoutItem } | null)?.item
                return item !== undefined && hasContent(item)
            })

        // What the last render showed, for the handlers below
        let rendered: VNode[] = []

        // Editor preview: open the tab that holds the node being highlighted.
        const onMessage = (e: MessageEvent) => {
            if (e.data?.type !== 'lynx:highlight' || !e.data.id) return
            const index = rendered.findIndex(v => contains((v.props as { item: LayoutItem }).item, e.data.id))
            if (index >= 0) active.value = index
        }
        onMounted(() => window.addEventListener('message', onMessage))
        onUnmounted(() => window.removeEventListener('message', onMessage))

        return () => {
            const list = panels()
            rendered = list
            if (!list.length) return null
            const current = Math.min(active.value, list.length - 1)
            const vertical = props.orientation === 'vertical'

            const strip = h(
                'div',
                {
                    role: 'tablist',
                    'aria-orientation': vertical ? 'vertical' : 'horizontal',
                    onKeydown: (e: KeyboardEvent) => onKeydown(e, current, list.length),
                    class: [
                        'flex gap-8 border-b border-base-300 mb-6',
                        vertical &&
                            'lg:flex-col lg:gap-0 lg:mb-0 lg:border-b-0 lg:border-s lg:border-solid lg:border-base-300',
                    ],
                },
                list.map((v, i) => {
                    const item = (v.props as { item: LayoutItem }).item
                    const selected = i === current
                    return h(
                        'button',
                        {
                            key: item.id ?? i,
                            type: 'button',
                            id: `${id}-tab-${i}`,
                            role: 'tab',
                            'aria-selected': selected ? 'true' : 'false',
                            'aria-controls': `${id}-panel`,
                            // Roving tabindex: Tab enters the strip once, the arrows move inside it
                            tabindex: selected ? 0 : -1,
                            class: [
                                '-mb-px border-0 border-b-(length:--border) border-solid bg-transparent pb-3 cursor-pointer transition-colors',
                                vertical &&
                                    'lg:mb-0 lg:-ms-px lg:border-b-0 lg:border-s-(length:--border) lg:py-2.5 lg:ps-4 lg:text-start',
                                selected
                                    ? 'border-primary font-semibold text-base-content'
                                    : 'border-transparent text-base-content/70 hover:text-base-content',
                            ],
                            onClick: () => {
                                active.value = i
                            },
                        },
                        String((item.props as { title?: string }).title ?? '')
                    )
                })
            )

            const panel = h(
                'div',
                { id: `${id}-panel`, role: 'tabpanel', 'aria-labelledby': `${id}-tab-${current}`, class: 'min-w-0' },
                [list[current]]
            )

            return h(
                'div',
                {
                    class: vertical ? 'lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8' : undefined,
                },
                [strip, panel]
            )
        }
    },
})
</script>
