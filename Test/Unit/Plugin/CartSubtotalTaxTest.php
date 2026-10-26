<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Plugin;

use Magento\Checkout\CustomerData\Cart;
use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Quote\Model\Quote;
use Magento\Quote\Model\Quote\Address\Total;
use OOCS\LynxComponent\Helper\ThemeIdentity;
use OOCS\LynxThemeComponent\Plugin\CartSubtotalTax;
use PHPUnit\Framework\TestCase;

/**
 * The cart section's subtotal with and without tax as numbers, on Lynx store views only
 */
class CartSubtotalTaxTest extends TestCase
{
    /**
     * The plugin's answer for a quote with this subtotal total on a store that is Lynx or not
     *
     * @param Total|null $subtotal
     * @param bool $lynx
     * @return array
     */
    private function section(?Total $subtotal, bool $lynx = true): array
    {
        $quote = $this->createMock(Quote::class);
        $quote->method('getStoreId')->willReturn(1);
        $quote->method('getTotals')->willReturn($subtotal ? ['subtotal' => $subtotal] : []);
        $session = $this->createMock(CheckoutSession::class);
        $session->method('getQuote')->willReturn($quote);
        $identity = $this->createMock(ThemeIdentity::class);
        $identity->method('isLynxForStore')->with(1)->willReturn($lynx);

        return (new CartSubtotalTax($session, $identity))
            ->afterGetSectionData($this->createMock(Cart::class), ['summary_count' => 2]);
    }

    /**
     * The excluding and including values are added next to core's keys
     *
     * @return void
     */
    public function testValues(): void
    {
        $total = new Total(['value' => 100, 'value_excl_tax' => 100, 'value_incl_tax' => 110], new Json());

        $this->assertSame(
            ['summary_count' => 2, 'subtotal_excl_tax_value' => 100.0, 'subtotal_incl_tax_value' => 110.0],
            $this->section($total)
        );
    }

    /**
     * Without tax figures both fall back to the subtotal value; without a subtotal both are 0
     *
     * @return void
     */
    public function testFallbacks(): void
    {
        $section = $this->section(new Total(['value' => 80], new Json()));
        $this->assertSame([80.0, 80.0], [$section['subtotal_excl_tax_value'], $section['subtotal_incl_tax_value']]);

        $section = $this->section(null);
        $this->assertSame([0.0, 0.0], [$section['subtotal_excl_tax_value'], $section['subtotal_incl_tax_value']]);
    }

    /**
     * Other themes keep the section as core builds it
     *
     * @return void
     */
    public function testOtherTheme(): void
    {
        $this->assertSame(['summary_count' => 2], $this->section(new Total(['value' => 80], new Json()), false));
    }
}
