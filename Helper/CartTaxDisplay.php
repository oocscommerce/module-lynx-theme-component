<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Helper;

use Magento\Tax\Model\Config as TaxConfig;

/**
 * Shopping Cart Display Settings of the tax configuration, as the minicart, cart and checkout summary read them.
 */
class CartTaxDisplay
{
    /**
     * Tax configuration
     *
     * @param TaxConfig $taxConfig
     */
    public function __construct(
        private readonly TaxConfig $taxConfig,
    ) {
    }

    /**
     * Price, subtotal and shipping as 1 excluding tax, 2 including, 3 both; the rest as flags
     *
     * @return array{price: int, subtotal: int, shipping: int, grand_total: bool, full_summary: bool, zero_tax: bool}
     */
    public function get(): array
    {
        $config = $this->taxConfig;

        return [
            'price'        => $this->type($config->displayCartPricesBoth(), $config->displayCartPricesInclTax()),
            'subtotal'     => $this->type($config->displayCartSubtotalBoth(), $config->displayCartSubtotalInclTax()),
            'shipping'     => $this->type($config->displayCartShippingBoth(), $config->displayCartShippingInclTax()),
            'grand_total'  => (bool) $config->displayCartTaxWithGrandTotal(),
            'full_summary' => (bool) $config->displayCartFullSummary(),
            'zero_tax'     => (bool) $config->displayCartZeroTax(),
        ];
    }

    /**
     * One setting's display type
     *
     * @param bool $both
     * @param bool $including
     * @return int
     */
    private function type(bool $both, bool $including): int
    {
        return match (true) {
            $both => TaxConfig::DISPLAY_TYPE_BOTH,
            $including => TaxConfig::DISPLAY_TYPE_INCLUDING_TAX,
            default => TaxConfig::DISPLAY_TYPE_EXCLUDING_TAX,
        };
    }
}
