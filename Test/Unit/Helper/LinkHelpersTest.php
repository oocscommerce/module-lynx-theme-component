<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Helper;

use Magento\Framework\UrlInterface;
use Magento\Store\Model\Store;
use Magento\Store\Model\StoreManagerInterface;
use OOCS\LynxThemeComponent\Helper\MediaUrl;
use OOCS\LynxThemeComponent\Helper\StoreLink;
use PHPUnit\Framework\TestCase;

/**
 * The values of `image` and `url` settings turned into media URLs and store links
 */
class LinkHelpersTest extends TestCase
{
    /**
     * A media path gets the store's media URL; absolute and empty values are kept
     *
     * @return void
     */
    public function testMediaUrl(): void
    {
        $store = $this->createMock(Store::class);
        $store->method('getBaseUrl')->with(UrlInterface::URL_TYPE_MEDIA)->willReturn('https://cdn.shop.test/media/');
        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($store);
        $media = new MediaUrl($storeManager);

        $this->assertSame('https://cdn.shop.test/media/wysiwyg/a.jpg', $media->url(' wysiwyg/a.jpg '));
        $this->assertSame('', $media->url('  '));
        $this->assertSame('/static/a.png', $media->url('/static/a.png'));
        $this->assertSame('HTTPS://other.test/a.png', $media->url('HTTPS://other.test/a.png'));
    }

    /**
     * A store path becomes a root-relative link of the store; anchors, schemes and empty values are kept
     *
     * @return void
     */
    public function testStoreLink(): void
    {
        $url = $this->createMock(UrlInterface::class);
        $url->method('getDirectUrl')->willReturnCallback(fn ($path) => 'https://shop.test/fr/' . $path);
        $link = new StoreLink($url);

        $this->assertSame('/fr/sale.html', $link->path('/sale.html'));
        $this->assertSame('/fr/contact', $link->path(' contact '));
        $this->assertSame('', $link->path(''));
        $this->assertSame('#reviews', $link->path('#reviews'));
        foreach (['https://x.test/a', 'mailto:a@b.c', 'tel:+1555'] as $value) {
            $this->assertSame($value, $link->path($value));
        }
    }
}
