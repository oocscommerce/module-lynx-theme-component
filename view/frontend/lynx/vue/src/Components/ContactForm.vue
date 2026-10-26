<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useFormKeyStore } from 'OOCS_LynxTheme/stores/global/formKeyStore'

const props = withDefaults(defineProps<Lynx.ContactForm>(), {
    urls: () => ({}),
    labels: () => ({}),
})

const formKeyStore = useFormKeyStore()

const contactUrls = computed(() => ({
    post: '/contact/index/post/',
    ...props.urls,
}))

const name = ref('')
const email = ref('')
const telephone = ref('')
const comment = ref('')
const submitting = ref(false)
const errors = reactive<{ name?: string; email?: string; comment?: string }>({})

const inputClass = (error?: string) => ['l-input w-full', error ? 'l-input-error' : '']

/**
 * Classic POST to contact/index/post
 */
function onSubmit(event: Event) {
    errors.name = name.value.trim() ? '' : (props.labels.enterName ?? '')
    errors.email = /^[^@\s]+@[^@\s]+\.[^@\s.]+$/.test(email.value) ? '' : (props.labels.invalidEmail ?? '')
    errors.comment = comment.value.trim() ? '' : (props.labels.enterMessage ?? '')

    if (errors.name || errors.email || errors.comment) {
        event.preventDefault()
        // The first field in error takes focus, so its message is read out
        const form = event.currentTarget as HTMLFormElement
        void nextTick(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
        return
    }

    // The cookie may have lapsed while the form was being filled in
    const field = (event.currentTarget as HTMLFormElement).elements.namedItem('form_key')
    if (field instanceof HTMLInputElement) {
        field.value = formKeyStore.ensure()
    }

    submitting.value = true
}
</script>

<template>
    <div class="w-full">
        <div class="max-w-lg mx-auto">
            <form method="post" :action="contactUrls.post" data-recaptcha="contact" novalidate @submit="onSubmit">
                <input type="hidden" name="form_key" :value="formKeyStore.value" />
                <!-- Core anti-spam honeypot: the controller discards submissions where this has a value -->
                <input
                    type="text"
                    name="hideit"
                    value=""
                    class="hidden"
                    tabindex="-1"
                    autocomplete="off"
                    aria-hidden="true"
                />

                <div class="mb-5">
                    <label for="contact-name" class="block text-sm font-semibold text-base-content mb-1.5">
                        {{ labels.name }} <span class="text-error">*</span>
                    </label>
                    <input
                        id="contact-name"
                        v-model="name"
                        type="text"
                        name="name"
                        autocomplete="name"
                        required
                        :class="inputClass(errors.name)"
                        @input="errors.name = ''"
                        :aria-invalid="!!errors.name"
                        :aria-describedby="errors.name ? 'contact-name-error' : undefined"
                    />
                    <p v-if="errors.name" id="contact-name-error" class="mt-1.5 text-sm text-error">
                        {{ errors.name }}
                    </p>
                </div>

                <div class="mb-5">
                    <label for="contact-email" class="block text-sm font-semibold text-base-content mb-1.5">
                        {{ labels.email }} <span class="text-error">*</span>
                    </label>
                    <input
                        id="contact-email"
                        v-model="email"
                        type="email"
                        name="email"
                        autocomplete="email"
                        :placeholder="labels.emailPlaceholder"
                        required
                        :class="inputClass(errors.email)"
                        @input="errors.email = ''"
                        :aria-invalid="!!errors.email"
                        :aria-describedby="errors.email ? 'contact-email-error' : undefined"
                    />
                    <p v-if="errors.email" id="contact-email-error" class="mt-1.5 text-sm text-error">
                        {{ errors.email }}
                    </p>
                </div>

                <div class="mb-5">
                    <label for="contact-telephone" class="block text-sm font-semibold text-base-content mb-1.5">
                        {{ labels.phone }}
                    </label>
                    <input
                        id="contact-telephone"
                        v-model="telephone"
                        type="tel"
                        name="telephone"
                        autocomplete="tel"
                        placeholder="(222)-222-2222"
                        class="l-input w-full"
                    />
                </div>

                <div class="mb-6">
                    <label for="contact-comment" class="block text-sm font-semibold text-base-content mb-1.5">
                        {{ labels.message }} <span class="text-error">*</span>
                    </label>
                    <textarea
                        id="contact-comment"
                        v-model="comment"
                        name="comment"
                        rows="6"
                        :placeholder="labels.messagePlaceholder"
                        required
                        :class="['l-textarea w-full', errors.comment ? 'l-textarea-error' : '']"
                        @input="errors.comment = ''"
                        :aria-invalid="!!errors.comment"
                        :aria-describedby="errors.comment ? 'contact-comment-error' : undefined"
                    ></textarea>
                    <p v-if="errors.comment" id="contact-comment-error" class="mt-1.5 text-sm text-error">
                        {{ errors.comment }}
                    </p>
                </div>

                <button type="submit" :disabled="submitting" class="l-btn l-btn-primary px-8">
                    {{ submitting ? labels.sending : labels.send }}
                </button>
            </form>
        </div>
    </div>
</template>
