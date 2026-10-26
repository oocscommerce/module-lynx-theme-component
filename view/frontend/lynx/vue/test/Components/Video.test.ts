import { hydrate, mountNode } from '@oocs/module-lynx-theme/test'

import Video from 'OOCS_LynxThemeComponent/Components/Video.vue'
import { describe, expect, it } from 'vitest'

const props = {
    url: '',
    title: 'Our story',
    embed: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    aspect: '16_9',
    rounded: 'md',
    width: 800,
    justify: 'center',
    labels: { play: 'Play video: Our story' },
}

describe('Video', () => {
    it('shows the poster behind a labelled play button, without loading the player', () => {
        const wrapper = mountNode(Video, { props })

        expect(wrapper.find('button').attributes('aria-label')).toBe('Play video: Our story')
        expect(wrapper.find('img').attributes('src')).toBe(props.poster)
        expect(wrapper.find('img').attributes('loading')).toBe('lazy')
        expect(wrapper.find('iframe').exists()).toBe(false)
    })

    it('caps the width at the setting, and not at all for 0', () => {
        const capped = mountNode(Video, { props })
        expect((capped.find('button').element.parentElement as HTMLElement).style.maxWidth).toBe('800px')
        capped.unmount()

        const free = mountNode(Video, { props: { ...props, width: 0 } })
        expect((free.find('button').element.parentElement as HTMLElement).style.maxWidth).toBe('')
    })

    it('has no poster image without one, and nothing to play without a supported video', () => {
        const noPoster = mountNode(Video, { props: { ...props, poster: '' } })
        expect(noPoster.find('img').exists()).toBe(false)
        expect(noPoster.find('button').exists()).toBe(true)
        noPoster.unmount()

        const unsupported = mountNode(Video, { props: { ...props, embed: '' } })
        expect(unsupported.find('button').exists()).toBe(false)
        expect(unsupported.find('iframe').exists()).toBe(false)
    })

    it('server-renders and hydrates the same markup', async () => {
        const { html, warnings } = await hydrate(Video, { props })

        expect(html).toContain('Play video: Our story')
        expect(warnings).toEqual([])
    })
})
