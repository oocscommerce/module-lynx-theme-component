<script setup lang="ts">
import { onMounted } from 'vue'
import { useAnalyticsStore } from 'OOCS_LynxTheme/stores/global/analyticsStore'
import { useCustomerDataStore } from 'OOCS_LynxTheme/stores/global/customerDataStore'

const customerData = useCustomerDataStore()
const analytics = useAnalyticsStore()

const props = withDefaults(defineProps<Lynx.CheckoutSuccess>(), {
    order_increment_id: '',
    email: '',
    can_view_order: false,
    urls: () => ({}),
    purchase: null,
    labels: () => ({}),
})

// The order is this page's to report
onMounted(() => {
    if (props.purchase) analytics.trackOnce('purchase_' + props.order_increment_id, 'purchase', props.purchase)
})

// Core wording "Your order number is: %1." — the id is rendered bold in place of %1.
const orderNumberParts = (props.labels.orderNumberIs ?? '').split('%1')

const successUrls = {
    home: '/',
    ...props.urls,
}

// An order was actually placed (order_increment_id is set only for a real last order
onMounted(() => {
    if (!props.order_increment_id) return
    try {
        localStorage.removeItem('lynx-checkout-data')
    } catch {
        // Storage blocked: nothing to clear.
    }
    // The order consumed the cart; refetch the section so the header and mini-cart show it empty
    void customerData.reload(['cart'])
})
</script>

<template>
    <div class="max-w-lg mx-auto text-center">
        <div class="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
        </div>

        <h1 class="text-3xl font-semibold text-base-content mb-2">{{ labels.thankYou }}</h1>

        <p v-if="props.order_increment_id" class="text-base text-base-content/70">
            {{ orderNumberParts[0]
            }}<strong class="font-semibold text-base-content">{{ props.order_increment_id }}</strong
            >{{ orderNumberParts[1] }}
        </p>
        <p v-if="props.email" class="text-base text-base-content/70 mt-1">
            {{ labels.emailSentTo }} <strong class="font-semibold text-base-content">{{ props.email }}</strong
            >.
        </p>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a :href="successUrls.home" class="l-btn l-btn-primary min-w-[10rem] px-6 uppercase no-underline">{{
                labels.continueShopping
            }}</a>

            <!-- Only a signed-in customer can open the order view -->
            <a
                v-if="props.can_view_order && successUrls.order"
                :href="successUrls.order"
                class="l-btn l-btn-outline l-btn-secondary min-w-[10rem] px-6 uppercase no-underline"
                >{{ labels.viewOrder }}</a
            >

            <!-- Sent for guests only: a signed-in customer whose order is hidden gets neither button -->
            <a
                v-if="successUrls.create_account"
                :href="successUrls.create_account"
                class="l-btn l-btn-outline l-btn-secondary min-w-[10rem] px-6 uppercase no-underline"
                >{{ labels.createAccount }}</a
            >
        </div>
    </div>
</template>
