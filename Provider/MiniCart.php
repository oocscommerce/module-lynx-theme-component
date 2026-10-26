<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use Magento\Framework\UrlInterface;
use Magento\Tax\Model\Config as TaxConfig;
use OOCS\LynxComponent\Helper\SectionInvalidation;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\CartTaxDisplay;

/**
 * The mini cart: where its buttons go, the sections removing an item invalidates, and how its subtotal shows tax
 */
class MiniCart extends AbstractComponentProvider
{
    /**
     * Url builder, section invalidation, cart tax display
     *
     * @param UrlInterface $urlBuilder
     * @param SectionInvalidation $sectionInvalidation
     * @param CartTaxDisplay $cartTaxDisplay
     */
    public function __construct(
        private readonly UrlInterface $urlBuilder,
        private readonly SectionInvalidation $sectionInvalidation,
        private readonly CartTaxDisplay $cartTaxDisplay,
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
        $props['checkout_urls'] = [
            'checkout'    => $this->urlBuilder->getUrl('checkout'),
            'cart'        => $this->urlBuilder->getUrl('checkout/cart'),
            'remove_item' => $this->urlBuilder->getUrl('checkout/sidebar/removeItem'),
        ];
        // Sections each action invalidates, resolved from sections.xml
        $props['sections'] = [
            'remove_item' => $this->sectionInvalidation->getForPath('checkout/sidebar/removeItem'),
        ];
        // Display Subtotal of the cart display settings: 1 excluding tax, 2 including, 3 both
        $props['subtotal_tax_display'] = $this->cartTaxDisplay->get()['subtotal'];
        $props['labels'] = [
            'myCart'           => (string) __('My Cart'),
            'close'            => (string) __('Close'),
            'qty'              => (string) __('Qty'),
            'seeDetails'       => (string) __('See Details'),
            'removeItem'       => (string) __('Remove item'),
            'cartEmpty'        => (string) __('You have no items in your shopping cart.'),
            'continueShopping' => (string) __('Continue Shopping'),
            'exclTax'          => (string) __('Excl. Tax'),
            'shippingNote'     => (string) __('Shipping and taxes calculated at checkout.'),
            'checkout'         => (string) __('Checkout'),
            'viewEditCart'     => (string) __('View and Edit Cart'),
        ];
        // Both amounts are labelled only when both show
        if ($props['subtotal_tax_display'] === TaxConfig::DISPLAY_TYPE_BOTH) {
            $props['labels']['subtotalInclTax'] = (string) __('Subtotal (Incl. Tax)');
            $props['labels']['subtotalExclTax'] = (string) __('Subtotal (Excl. Tax)');
        } else {
            $props['labels']['subtotal'] = (string) __('Subtotal');
        }

        return $props;
    }
}
