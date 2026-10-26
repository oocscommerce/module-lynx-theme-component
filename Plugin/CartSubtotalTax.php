<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Plugin;

use Magento\Checkout\CustomerData\Cart;
use Magento\Checkout\Model\Session as CheckoutSession;
use OOCS\LynxComponent\Helper\ThemeIdentity;

/**
 * The cart section's subtotal with and without tax as plain numbers; core sends them only as formatted markup.
 *
 * @SuppressWarnings(PHPMD.CookieAndSessionMisuse)
 */
class CartSubtotalTax
{
    /**
     * Checkout session and theme check
     *
     * @param CheckoutSession $checkoutSession
     * @param ThemeIdentity $themeIdentity
     */
    public function __construct(
        private readonly CheckoutSession $checkoutSession,
        private readonly ThemeIdentity $themeIdentity,
    ) {
    }

    /**
     * Add subtotal_excl_tax_value and subtotal_incl_tax_value, as Magento\Tax\Plugin\Checkout\CustomerData\Cart
     *
     * @param Cart $subject
     * @param array $result
     * @return array
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function afterGetSectionData(Cart $subject, array $result): array
    {
        $quote = $this->checkoutSession->getQuote();
        if (!$this->themeIdentity->isLynxForStore((int) $quote->getStoreId())) {
            return $result;
        }

        $subtotal = $quote->getTotals()['subtotal'] ?? null;
        $result['subtotal_excl_tax_value'] = (float) ($subtotal?->getValueExclTax() ?: $subtotal?->getValue());
        $result['subtotal_incl_tax_value'] = (float) ($subtotal?->getValueInclTax() ?: $subtotal?->getValue());

        return $result;
    }
}
