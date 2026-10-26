import { mountNode } from '@oocs/module-lynx-theme/test'

import CheckoutFailure from 'OOCS_LynxThemeComponent/Components/CheckoutFailure.vue'
import { describe, expect, it } from 'vitest'

const props = {
    order_increment_id: '000000124',
    error_message: 'Transaction has been declined. Please try again later.',
    urls: { cart: 'https://shop.test/checkout/cart/' },
    labels: {
        paymentFailed: 'Your payment has been declined. Please try again.',
        order: 'Order',
        wasNotCompleted: 'was not completed.',
        itemsStillInCart: 'Your items are still in the cart — you can try placing the order again.',
        returnToCart: 'Back to Shopping Cart',
    },
}

describe('CheckoutFailure', () => {
    it('shows the failed order and the gateway message', () => {
        const wrapper = mountNode(CheckoutFailure, { props })

        expect(wrapper.find('h1').text()).toBe(props.labels.paymentFailed)
        expect(wrapper.text()).toContain('Order #000000124 was not completed.')
        expect(wrapper.text()).toContain(props.error_message)
        expect(wrapper.text()).not.toContain(props.labels.itemsStillInCart)
        expect(wrapper.find('a').attributes('href')).toBe('https://shop.test/checkout/cart/')
        expect(wrapper.find('a').text()).toBe('Back to Shopping Cart')
    })

    it('says the items are still in the cart without a gateway message or order', () => {
        const wrapper = mountNode(CheckoutFailure, { props: { ...props, order_increment_id: '', error_message: '' } })

        expect(wrapper.text()).toContain(props.labels.itemsStillInCart)
        expect(wrapper.text()).not.toContain('was not completed')
    })
})
