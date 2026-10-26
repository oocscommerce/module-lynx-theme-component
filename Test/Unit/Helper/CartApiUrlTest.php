<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Helper;

use Magento\Framework\UrlInterface;
use Magento\Quote\Model\Quote;
use Magento\Quote\Model\QuoteIdMask;
use Magento\Quote\Model\QuoteIdMaskFactory;
use Magento\Quote\Model\ResourceModel\Quote\QuoteIdMask as QuoteIdMaskResource;
use Magento\Store\Model\Store;
use Magento\Store\Model\StoreManagerInterface;
use OOCS\LynxThemeComponent\Helper\CartApiUrl;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * REST URLs for the visitor's own quote: carts/mine for customers, the masked id for guests
 */
class CartApiUrlTest extends TestCase
{
    /**
     * @var QuoteIdMaskResource&MockObject
     */
    private QuoteIdMaskResource $maskResource;

    /**
     * @var QuoteIdMaskFactory&MockObject
     */
    private QuoteIdMaskFactory $maskFactory;

    /**
     * @var CartApiUrl
     */
    private CartApiUrl $helper;

    /**
     * Store "default" on https://shop.test/
     *
     * @return void
     */
    protected function setUp(): void
    {
        $store = $this->createMock(Store::class);
        $store->method('getCode')->willReturn('default');
        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($store);
        $url = $this->createMock(UrlInterface::class);
        $url->method('getBaseUrl')->willReturn('https://shop.test/');
        $this->maskResource = $this->createMock(QuoteIdMaskResource::class);
        $this->maskFactory = $this->createMock(QuoteIdMaskFactory::class);

        $this->helper = new CartApiUrl($storeManager, $url, $this->maskFactory, $this->maskResource);
    }

    /**
     * A quote with this id and customer
     *
     * @param int $id
     * @param int $customerId
     * @return Quote
     */
    private function quote(int $id, int $customerId = 0): Quote
    {
        $quote = $this->getMockBuilder(Quote::class)->disableOriginalConstructor()->onlyMethods(['getId'])->getMock();
        $quote->method('getId')->willReturn($id);
        $quote->setData('customer_id', $customerId);

        return $quote;
    }

    /**
     * A customer's quote is carts/mine
     *
     * @return void
     */
    public function testCustomer(): void
    {
        $this->assertSame(
            'https://shop.test/rest/default/V1/carts/mine/coupons/SAVE',
            $this->helper->getUrl($this->quote(5, 9), 'coupons/SAVE')
        );
    }

    /**
     * A guest's quote uses its existing masked id, looked up once
     *
     * @return void
     */
    public function testGuestExistingMask(): void
    {
        $this->maskResource->expects($this->once())->method('getMaskedQuoteId')->with(5)->willReturn('abc');

        $expected = 'https://shop.test/rest/default/V1/guest-carts/abc';
        $this->assertSame($expected, $this->helper->getBaseUrl($this->quote(5)));
        $this->assertSame($expected, $this->helper->getBaseUrl($this->quote(5)));
    }

    /**
     * A guest quote without a mask gets one created
     *
     * @return void
     */
    public function testGuestNewMask(): void
    {
        // masked_id stands for what QuoteIdMask::beforeSave() fills in
        $mask = $this->getMockBuilder(QuoteIdMask::class)->disableOriginalConstructor()->onlyMethods([])->getMock();
        $mask->setData('masked_id', 'new1');
        $this->maskFactory->method('create')->willReturn($mask);
        $this->maskResource->method('getMaskedQuoteId')->willReturn('');
        $this->maskResource->expects($this->once())->method('save')->with($mask);

        $this->assertSame(
            'https://shop.test/rest/default/V1/guest-carts/new1',
            $this->helper->getBaseUrl($this->quote(5))
        );
        $this->assertSame(5, $mask->getData('quote_id'));
    }

    /**
     * No quote yet means no URL
     *
     * @return void
     */
    public function testNoQuote(): void
    {
        $this->assertSame('', $this->helper->getBaseUrl($this->quote(0)));
        $this->assertSame('', $this->helper->getUrl($this->quote(0), 'items'));
    }
}
