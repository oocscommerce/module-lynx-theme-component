<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Checkout;

use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Customer\Model\Session as CustomerSession;
use Magento\Framework\UrlInterface;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\Order\Config as OrderConfig;
use OOCS\LynxComponent\Api\SampleProviderInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * Feeds the CheckoutSuccess component with the order just placed
 *
 * @SuppressWarnings(PHPMD.CookieAndSessionMisuse)
 */
class Success extends AbstractComponentProvider implements SampleProviderInterface
{
    /**
     * Checkout session, customer session, order config, url builder
     *
     * @param CheckoutSession $checkoutSession
     * @param CustomerSession $customerSession
     * @param OrderConfig $orderConfig
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        private readonly CheckoutSession $checkoutSession,
        private readonly CustomerSession $customerSession,
        private readonly OrderConfig $orderConfig,
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
        $order = $this->checkoutSession->getLastRealOrder();

        $props['order_increment_id'] = (string) $order->getIncrementId();
        $props['email'] = (string) $order->getCustomerEmail();
        $props['can_view_order'] = $this->canViewOrder($order);
        $props['urls'] = ['home' => $this->urlBuilder->getBaseUrl()];
        if ($order->getId()) {
            $props['purchase'] = $this->purchaseParams($order);
        }

        $props['labels'] = $this->getLabels();
        if ($props['can_view_order']) {
            $props['urls']['order'] = $this->urlBuilder->getUrl(
                'sales/order/view',
                ['order_id' => $order->getEntityId()]
            );
            $props['labels']['viewOrder'] = (string) __('View Order');
        }
        // The page is not cached, so the session decides who is offered an account
        if (!$this->customerSession->isLoggedIn()) {
            $props['urls']['create_account'] = $this->urlBuilder->getUrl('customer/account/create');
            $props['labels']['createAccount'] = (string) __('Create an Account');
        }

        return $props;
    }

    /**
     * A signed-in customer's order, so every part of the page shows
     *
     * @param array $resolved
     * @param array $props
     * @return array
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function resolveSample(array $resolved, array $props): array
    {
        $resolved['order_increment_id'] = 'SAMPLE-000000123';
        $resolved['email'] = 'sample@example.com';
        $resolved['can_view_order'] = true;
        // As a signed-in customer sees it; home stays real, it leaves the sample without touching any data
        $resolved['urls'] = ['home' => $this->urlBuilder->getBaseUrl(), 'order' => '#'];
        $resolved['labels'] = $this->getLabels() + ['viewOrder' => (string) __('View Order')];
        // An order this browser really placed stays in the session: nothing was bought here
        unset($resolved['purchase']);

        return $resolved;
    }

    /**
     * Every string the page shows to anyone, translated here: the storefront's language is a server-side matter
     *
     * @return array<string,string>
     */
    private function getLabels(): array
    {
        return [
            'thankYou'         => (string) __('Thank you for your purchase!'),
            'orderNumberIs'    => (string) __('Your order number is: %1.'),
            'emailSentTo'      => (string) __('A confirmation email has been sent to'),
            'continueShopping' => (string) __('Continue Shopping'),
        ];
    }

    /**
     * The GA4 purchase event's params for this order, as Magento_GoogleGtag reports it on the native success page
     *
     * @param Order $order
     * @return array
     */
    private function purchaseParams(Order $order): array
    {
        $params = [
            'transaction_id' => (string) $order->getIncrementId(),
            'value'          => round((float) $order->getGrandTotal(), 2),
            'tax'            => round((float) $order->getTaxAmount(), 2),
            'shipping'       => round((float) $order->getShippingAmount(), 2),
            'currency'       => (string) $order->getOrderCurrencyCode(),
            'items'          => array_map(fn (Order\Item $item) => [
                'item_id'   => (string) $item->getSku(),
                'item_name' => $this->toPlainText((string) $item->getName()),
                'price'     => round((float) $item->getPrice(), 2),
                'quantity'  => (float) $item->getQtyOrdered(),
            ], $order->getAllVisibleItems()),
        ];
        if ($order->getCouponCode()) {
            $params['coupon'] = (string) $order->getCouponCode();
        }

        return $params;
    }

    /**
     * Same rule as the native success block: signed in, and the order status is not one of the statuses configured as
     *
     * @param Order $order
     * @return bool
     */
    private function canViewOrder(Order $order): bool
    {
        if (!$order->getId() || !$this->customerSession->isLoggedIn()) {
            return false;
        }

        return !\in_array($order->getStatus(), $this->orderConfig->getInvisibleOnFrontStatuses(), true);
    }
}
