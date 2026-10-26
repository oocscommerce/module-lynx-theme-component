<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Provider\Page;

use Magento\Csp\Helper\CspNonceProvider;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Request\Http;
use OOCS\LynxThemeComponent\Provider\Page\CustomScript;
use PHPUnit\Framework\TestCase;

/**
 * The Custom Script block gets a CSP nonce only where the policy is enforced
 */
class CustomScriptTest extends TestCase
{
    /**
     * The nonce the block gets for the action and CSP config
     *
     * @param string $action
     * @param array $config
     * @return string
     */
    private function nonce(string $action, array $config): string
    {
        $request = $this->createMock(Http::class);
        $request->method('getFullActionName')->willReturn($action);
        $scopeConfig = $this->createMock(ScopeConfigInterface::class);
        $scopeConfig->method('getValue')->willReturnCallback(fn ($path) => $config[$path] ?? null);
        $nonces = $this->createMock(CspNonceProvider::class);
        $nonces->method('generateNonce')->willReturn('n0nce');

        return (new CustomScript($request, $scopeConfig, $nonces))->resolve(['code' => 'x'])['nonce'];
    }

    /**
     * The checkout's own enforced mode gives a nonce
     *
     * @return void
     */
    public function testEnforcedPage(): void
    {
        $this->assertSame('n0nce', $this->nonce('checkout_index_index', [
            'csp/mode/storefront_checkout_index_index/report_only' => '0',
            'csp/mode/storefront/report_only'                      => '1',
        ]));
    }

    /**
     * A page without its own mode follows the storefront mode
     *
     * @return void
     */
    public function testStorefrontMode(): void
    {
        $this->assertSame('', $this->nonce('cms_index_index', ['csp/mode/storefront/report_only' => '1']));
        $this->assertSame('n0nce', $this->nonce('cms_index_index', ['csp/mode/storefront/report_only' => '0']));
        $this->assertSame('', $this->nonce('cms_index_index', []));
    }
}
