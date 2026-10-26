import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'
import { type VueWrapper } from '@vue/test-utils'
import Carousel from 'OOCS_LynxThemeComponent/Components/Carousel.vue'
import { describe, expect, it, vi } from 'vitest'

const props = {
    content_x: 'center',
    content_y: 'middle',
    layout: 'overlay',
    per_view: 1,
    slides: [
        {
            image: 'https://shop.test/media/lynx/hero-1.jpg',
            title: 'Summer Sale',
            subtitle: 'Up to 50% off',
            cta_label: 'Shop now',
            cta_url: '/sale.html',
        },
        // No image: nothing to show
        { image: '', title: 'Draft', subtitle: '', cta_label: '', cta_url: '' },
        { image: 'https://shop.test/media/lynx/hero-2.jpg', title: 'New In', subtitle: '', cta_label: '', cta_url: '' },
        { image: 'https://shop.test/media/lynx/hero-3.jpg', title: '', subtitle: '', cta_label: 'Orphan', cta_url: '' },
    ],
    autoplay: true,
    interval: 4000,
    show_arrows: true,
    show_dots: true,
    labels: { previous: 'Previous', next: 'Next', goToSlide: 'Go to slide %1', pause: 'Pause', play: 'Play' },
}

const current = (wrapper: VueWrapper) => wrapper.find('[aria-current="true"]').attributes('aria-label')

const touch = async (wrapper: VueWrapper, from: number, to: number) => {
    const root = wrapper.element as HTMLElement
    root.dispatchEvent(Object.assign(new Event('touchstart'), { touches: [{ clientX: from }] }))
    root.dispatchEvent(Object.assign(new Event('touchmove'), { touches: [{ clientX: to }] }))
    await wrapper.vm.$nextTick()
    root.dispatchEvent(new Event('touchend'))
    await wrapper.vm.$nextTick()
}

describe('Carousel', () => {
    it('shows the slides that have an image, the first loaded eagerly', () => {
        const wrapper = mountNode(Carousel, { props })
        const images = wrapper.findAll('img')

        expect(images.map(img => img.attributes('src'))).toEqual([
            'https://shop.test/media/lynx/hero-1.jpg',
            'https://shop.test/media/lynx/hero-2.jpg',
            'https://shop.test/media/lynx/hero-3.jpg',
        ])
        expect(images.map(img => img.attributes('alt'))).toEqual(['Summer Sale', 'New In', ''])
        expect(images.map(img => img.attributes('loading'))).toEqual(['eager', 'lazy', 'lazy'])
        expect(images[0].attributes('fetchpriority')).toBe('high')
        expect(wrapper.find('h2').text()).toBe('Summer Sale')
        expect(wrapper.text()).toContain('Up to 50% off')
        expect(wrapper.find('a').attributes('href')).toBe('/sale.html')
        expect(wrapper.find('a').text()).toBe('Shop now')
        // A button needs both a label and a URL
        expect(wrapper.text()).not.toContain('Orphan')
    })

    it('pages with the arrows, wrapping both ways', async () => {
        const wrapper = mountNode(Carousel, { props: { ...props, autoplay: false } })

        expect(current(wrapper)).toBe('Go to slide 1')
        await wrapper.find('[aria-label="Next"]').trigger('click')
        expect(current(wrapper)).toBe('Go to slide 2')
        await wrapper.find('[aria-label="Next"]').trigger('click')
        await wrapper.find('[aria-label="Next"]').trigger('click')
        expect(current(wrapper)).toBe('Go to slide 1')
        await wrapper.find('[aria-label="Previous"]').trigger('click')
        expect(current(wrapper)).toBe('Go to slide 3')
    })

    it('jumps to the slide of a dot', async () => {
        const wrapper = mountNode(Carousel, { props: { ...props, autoplay: false } })

        await wrapper.find('[aria-label="Go to slide 3"]').trigger('click')

        expect(current(wrapper)).toBe('Go to slide 3')
        expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(1)
    })

    it('advances by itself at the interval, pausing while hovered', async () => {
        vi.useFakeTimers()
        const wrapper = mountNode(Carousel, { props })

        await vi.advanceTimersByTimeAsync(4000)
        expect(current(wrapper)).toBe('Go to slide 2')

        wrapper.element.dispatchEvent(new Event('mouseenter'))
        await vi.advanceTimersByTimeAsync(8000)
        expect(current(wrapper)).toBe('Go to slide 2')

        wrapper.element.dispatchEvent(new Event('mouseleave'))
        await vi.advanceTimersByTimeAsync(4000)
        expect(current(wrapper)).toBe('Go to slide 3')
    })

    it('holds while focus is inside, and stops for good from its pause button', async () => {
        vi.useFakeTimers()
        const wrapper = mountNode(Carousel, { props, attachTo: document.body })

        wrapper.element.dispatchEvent(new FocusEvent('focusin'))
        await vi.advanceTimersByTimeAsync(8000)
        expect(current(wrapper)).toBe('Go to slide 1')
        wrapper.element.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }))
        await vi.advanceTimersByTimeAsync(4000)
        expect(current(wrapper)).toBe('Go to slide 2')

        await wrapper.find('[aria-label="Pause"]').trigger('click')
        await vi.advanceTimersByTimeAsync(12000)
        expect(current(wrapper)).toBe('Go to slide 2')

        await wrapper.find('[aria-label="Play"]').trigger('click')
        await vi.advanceTimersByTimeAsync(4000)
        expect(current(wrapper)).toBe('Go to slide 3')
        wrapper.unmount()
    })

    it('starts paused where motion is reduced', async () => {
        vi.useFakeTimers()
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
        const wrapper = mountNode(Carousel, { props })
        await wrapper.vm.$nextTick()

        await vi.advanceTimersByTimeAsync(12000)
        expect(current(wrapper)).toBe('Go to slide 1')
        expect(wrapper.find('[aria-label="Play"]').exists()).toBe(true)
        vi.unstubAllGlobals()
    })

    it('stays put with autoplay off', async () => {
        vi.useFakeTimers()
        const wrapper = mountNode(Carousel, { props: { ...props, autoplay: false } })

        await vi.advanceTimersByTimeAsync(12000)

        expect(current(wrapper)).toBe('Go to slide 1')
    })

    it('follows a swipe past the threshold, and ignores a short one', async () => {
        const wrapper = mountNode(Carousel, { props: { ...props, autoplay: false } })

        await touch(wrapper, 300, 200)
        expect(current(wrapper)).toBe('Go to slide 2')
        await touch(wrapper, 200, 300)
        expect(current(wrapper)).toBe('Go to slide 1')
        await touch(wrapper, 300, 270)
        expect(current(wrapper)).toBe('Go to slide 1')
    })

    it('has no arrows or dots for a single slide or when turned off', () => {
        const single = mountNode(Carousel, { props: { ...props, slides: [props.slides[0]] } })
        expect(single.findAll('button')).toHaveLength(0)
        single.unmount()

        // Autoplay keeps its pause
        const off = mountNode(Carousel, { props: { ...props, show_arrows: false, show_dots: false } })
        expect(off.findAll('button').map(b => b.attributes('aria-label'))).toEqual(['Pause'])
    })

    it('places the text where the position settings say', () => {
        const wrapper = mountNode(Carousel, { props: { ...props, content_x: 'start', content_y: 'bottom' } })
        const text = wrapper.find('h2').element.parentElement!

        expect(text.className).toContain('items-start')
        expect(text.className).toContain('justify-end')
    })

    it('puts the text beside the image in the split layout, the image on the side the text leaves', () => {
        const wrapper = mountNode(Carousel, { props: { ...props, layout: 'split', content_x: 'end' } })
        const slide = wrapper.find('img').element.closest('.grid')!

        expect(slide.children).toHaveLength(2)
        expect(slide.children[0].className).not.toContain('md:order-last')
        expect(slide.querySelector('h2')!.className).toContain('text-base-content')
    })

    it('shows the slides as tiles with several per view', () => {
        const wrapper = mountNode(Carousel, { props: { ...props, per_view: 3 } })
        const slide = wrapper.find('img').element.parentElement!

        expect(wrapper.attributes('style')).toContain('--pv: 3')
        expect(slide.className).toContain('rounded-box')
        expect(wrapper.findAll('img').map(img => img.attributes('loading'))).toEqual(['eager', 'eager', 'eager'])
    })

    it('renders nothing without a slide image', () => {
        expect(
            mountNode(Carousel, { props: { ...props, slides: [props.slides[1]] } })
                .find('img')
                .exists()
        ).toBe(false)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Carousel, { props })

        expect(html).toContain('Summer Sale')
        expect(warnings).toEqual([])
    })
})
