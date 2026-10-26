<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Helper;

use Magento\Tax\Model\Config as TaxConfig;
use OOCS\LynxThemeComponent\Helper\CartTaxDisplay;
use PHPUnit\Framework\TestCase;

/**
 * Shopping Cart Display Settings as the cart, minicart and checkout read them
 */
class CartTaxDisplayTest extends TestCase
{
    /**
     * Prices both, subtotal including, shipping excluding; the three flags on
     *
     * @return void
     */
    public function testDisplayTypes(): void
    {
        $config = $this->createMock(TaxConfig::class);
        $config->method('displayCartPricesBoth')->willReturn(true);
        $config->method('displayCartPricesInclTax')->willReturn(true);
        $config->method('displayCartSubtotalBoth')->willReturn(false);
        $config->method('displayCartSubtotalInclTax')->willReturn(true);
        $config->method('displayCartShippingBoth')->willReturn(false);
        $config->method('displayCartShippingInclTax')->willReturn(false);
        $config->method('displayCartTaxWithGrandTotal')->willReturn(true);
        $config->method('displayCartFullSummary')->willReturn(true);
        $config->method('displayCartZeroTax')->willReturn(true);

        $this->assertSame([
            'price'        => TaxConfig::DISPLAY_TYPE_BOTH,
            'subtotal'     => TaxConfig::DISPLAY_TYPE_INCLUDING_TAX,
            'shipping'     => TaxConfig::DISPLAY_TYPE_EXCLUDING_TAX,
            'grand_total'  => true,
            'full_summary' => true,
            'zero_tax'     => true,
        ], (new CartTaxDisplay($config))->get());
    }
}
