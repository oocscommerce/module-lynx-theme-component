<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Checkout;

use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Framework\UrlInterface;
use OOCS\LynxComponent\Api\SampleProviderInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * Feeds the CheckoutFailure component with the order that failed
 *
 * @SuppressWarnings(PHPMD.CookieAndSessionMisuse)
 */
class Failure extends AbstractComponentProvider implements SampleProviderInterface
{
    /**
     * Checkout session, url builder
     *
     * @param CheckoutSession $checkoutSession
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        private readonly CheckoutSession $checkoutSession,
        private readonly UrlInterface $urlBuilder,
    ) {
    }

    /**
     * Resolve
     *
     * @param array $props
     * @return array
     */
    public function resolve(array $props): array
    {
        $props['order_increment_id'] = (string) $this->checkoutSession->getLastRealOrderId();
        $props['error_message'] = (string) $this->checkoutSession->getErrorMessage();
        $props['urls'] = [
            'cart' => $this->urlBuilder->getUrl('checkout/cart'),
        ];

        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'paymentFailed'      => (string) __('Your payment has been declined. Please try again.'),
            'order'              => (string) __('Order'),
            'wasNotCompleted'    => (string) __('was not completed.'),
            'itemsStillInCart'   => (string) __(
                'Your items are still in the cart — you can try placing the order again.'
            ),
            'returnToCart'       => (string) __('Back to Shopping Cart'),
        ];

        return $props;
    }

    /**
     * An order the payment gateway declined, with the message a gateway sets
     *
     * @param array $resolved
     * @param array $props
     * @return array
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function resolveSample(array $resolved, array $props): array
    {
        $resolved['order_increment_id'] = 'SAMPLE-000000123';
        $resolved['error_message'] = (string) __('Transaction has been declined. Please try again later.');
        $resolved['urls'] = array_map(static fn (): string => '#', $resolved['urls']);

        return $resolved;
    }
}
