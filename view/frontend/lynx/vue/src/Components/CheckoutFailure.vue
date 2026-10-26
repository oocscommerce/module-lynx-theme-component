<script setup lang="ts">
const props = withDefaults(defineProps<Lynx.CheckoutFailure>(), {
    order_increment_id: '',
    error_message: '',
    urls: () => ({}),
    labels: () => ({}),
})

const failureUrls = {
    cart: '/checkout/cart',
    ...props.urls,
}

// Unlike the success page, nothing is cleared here: the order failed
</script>

<template>
    <div class="max-w-lg mx-auto text-center">
        <div class="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </div>

        <h1 class="text-3xl font-semibold text-base-content mb-2">{{ labels.paymentFailed }}</h1>

        <p v-if="props.order_increment_id" class="text-base text-base-content/70">
            {{ labels.order }} <strong class="font-semibold text-base-content">#{{ props.order_increment_id }}</strong>
            {{ labels.wasNotCompleted }}
        </p>
        <p v-if="props.error_message" class="text-base text-base-content/70 mt-1">
            {{ props.error_message }}
        </p>
        <p v-else class="text-base text-base-content/70 mt-1">
            {{ labels.itemsStillInCart }}
        </p>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a :href="failureUrls.cart" class="l-btn l-btn-primary min-w-[10rem] px-6 uppercase no-underline">{{
                labels.returnToCart
            }}</a>
        </div>
    </div>
</template>
