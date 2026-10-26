<script setup lang="ts">
// A row of social network icons
defineProps<Lynx.SocialLinks>()

// The title's; written out in full so Tailwind sees every class
const SIZE: Record<string, string> = { sm: 'text-base', base: 'text-lg', lg: 'text-xl' }

const NETWORKS: Record<string, { name: string; svg: string }> = {
    instagram: {
        name: 'Instagram',
        svg: `<path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z"/>`,
    },
    facebook: {
        name: 'Facebook',
        svg: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
    },
    x: {
        name: 'X',
        svg: `<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>`,
    },
    youtube: {
        name: 'YouTube',
        svg: `<path d="M21.543 6.498C22 8.28 22 12 22 12s0 3.72-.457 5.502c-.254.985-.997 1.76-1.938 2.022C17.896 20 12 20 12 20s-5.893 0-7.605-.476c-.945-.266-1.687-1.04-1.938-2.022C2 15.72 2 12 2 12s0-3.72.457-5.502c.254-.985.997-1.76 1.938-2.022C6.107 4 12 4 12 4s5.896 0 7.605.476c.945.266 1.687 1.04 1.938 2.022zM10 15.5l6-3.5-6-3.5v7z"/>`,
    },
    pinterest: {
        name: 'Pinterest',
        svg: `<path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.12.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>`,
    },
    tiktok: {
        name: 'TikTok',
        svg: `<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>`,
    },
}
</script>

<template>
    <div>
        <p v-if="title" class="font-semibold text-base-content mb-3" :class="SIZE[size] ?? SIZE.base">{{ title }}</p>
        <div class="flex items-center gap-2">
            <template v-for="(item, i) in items" :key="i">
                <a
                    v-if="NETWORKS[item.network]"
                    :href="item.url || '#'"
                    :title="NETWORKS[item.network].name"
                    :aria-label="NETWORKS[item.network].name"
                    target="_blank"
                    rel="noopener"
                    class="w-8 h-8 rounded-full bg-base-200 hover:bg-primary flex items-center justify-center text-base-content/70 hover:text-primary-content transition-colors no-underline"
                >
                    <svg
                        class="w-[15px] h-[15px]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        v-html="NETWORKS[item.network].svg"
                    />
                </a>
            </template>
        </div>
    </div>
</template>
