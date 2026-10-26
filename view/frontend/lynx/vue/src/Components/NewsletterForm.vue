<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFormKeyStore } from 'OOCS_LynxTheme/stores/global/formKeyStore'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'
import { useMessagesStore } from 'OOCS_LynxTheme/stores/global/messagesStore'

// The newsletter signup on its own, so it can sit in a footer column, a Section of the home page or a sidebar
const props = withDefaults(defineProps<Lynx.NewsletterForm>(), {
    urls: () => ({}),
    sections: () => ({}),
    labels: () => ({}),
})

// Title, then note; written out in full so Tailwind sees every class
const SIZE: Record<string, [string, string]> = {
    sm: ['text-base', 'text-sm'],
    base: ['text-lg', 'text-sm'],
    lg: ['text-xl', 'text-base'],
}
const text = computed(() => SIZE[props.size] ?? SIZE.base)

const subscribeUrl = computed(() => props.urls.subscribe ?? '/newsletter/subscriber/new/')

const formKeyStore = useFormKeyStore()
const customerData = useCustomerDataStore()
const messagesStore = useMessagesStore()

const email = ref('')
const subscribing = ref(false)

/**
 * Posts to the native controller
 */
async function subscribe(event: Event) {
    if (!email.value || subscribing.value) return
    const form = event.currentTarget as HTMLFormElement
    // Filled by the reCAPTCHA widget when the form is protected (OOCS_LynxReCaptcha boot.ts), absent otherwise
    const captcha = (form.elements.namedItem('g-recaptcha-response') as HTMLTextAreaElement | null)?.value
    subscribing.value = true
    try {
        await fetch(subscribeUrl.value, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: 'same-origin',
            redirect: 'manual',
            body: new URLSearchParams({
                form_key: formKeyStore.ensure(),
                email: email.value,
                ...(captcha ? { 'g-recaptcha-response': captcha } : {}),
            }),
        })
        email.value = ''
        messagesStore.sync()
        await customerData.reload(props.sections.subscribe ?? [])
    } catch {
        messagesStore.add('error', props.labels.subscribeError ?? '')
    } finally {
        subscribing.value = false
    }
}
</script>

<template>
    <div class="space-y-3">
        <div v-if="title || note">
            <p v-if="title" class="font-semibold text-base-content" :class="text[0]">{{ title }}</p>
            <p v-if="note" class="text-base-content/70 mt-0.5" :class="text[1]">{{ note }}</p>
        </div>
        <!-- Capped from sm up so a tablet does not stretch the field across the whole viewport -->
        <form class="sm:max-w-md lg:max-w-none" data-recaptcha="newsletter" @submit.prevent="subscribe">
            <div class="flex gap-2">
                <input
                    v-model="email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    required
                    :placeholder="placeholder"
                    :aria-label="labels.emailAddress"
                    :disabled="subscribing"
                    class="l-input flex-1 min-w-0"
                />
                <button type="submit" :disabled="subscribing" class="l-btn l-btn-primary shrink-0 px-6">
                    {{ subscribing ? labels.subscribing : labels.subscribe }}
                </button>
            </div>
            <!-- Where the reCAPTCHA widget goes when the newsletter form is protected -->
            <div data-recaptcha-slot class="not-empty:mt-3"></div>
        </form>
    </div>
</template>
