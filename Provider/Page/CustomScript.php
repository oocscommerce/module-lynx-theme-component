<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use Magento\Csp\Helper\CspNonceProvider;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Request\Http;
use Magento\Store\Model\ScopeInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * The Custom Script block's code, with a CSP nonce on pages whose policy is enforced (the checkout)
 */
class CustomScript extends AbstractComponentProvider
{
    /**
     * Request, scope config, nonce provider
     *
     * @param Http $request
     * @param ScopeConfigInterface $scopeConfig
     * @param CspNonceProvider $nonceProvider
     */
    public function __construct(
        private readonly Http $request,
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly CspNonceProvider $nonceProvider,
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
        $props['nonce'] = $this->isEnforced() ? $this->nonceProvider->generateNonce() : '';

        return $props;
    }

    /**
     * Whether this page's CSP blocks rather than reports, as Magento's own per-page mode setting says
     *
     * @return bool
     */
    private function isEnforced(): bool
    {
        $mode = $this->scopeConfig->getValue(
            'csp/mode/storefront_' . $this->request->getFullActionName() . '/report_only',
            ScopeInterface::SCOPE_STORE
        ) ?? $this->scopeConfig->getValue('csp/mode/storefront/report_only', ScopeInterface::SCOPE_STORE);

        return (string) $mode === '0';
    }
}
