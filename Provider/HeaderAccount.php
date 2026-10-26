<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use Magento\Customer\Model\Url as CustomerUrl;
use Magento\Framework\UrlInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * The header account block: the customer links of its panel, the wish list and the compare link
 */
class HeaderAccount extends AbstractComponentProvider
{
    /**
     * Customer url, url builder
     *
     * @param CustomerUrl $customerUrl
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        private readonly CustomerUrl $customerUrl,
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
        // Config-aware URLs (base url, store code, custom login page, secure)
        $props['customer_urls'] = [
            // No referer: the component adds the page being viewed, which changes with each Inertia visit
            'login'    => $this->urlBuilder->getUrl(CustomerUrl::ROUTE_ACCOUNT_LOGIN),
            'create'   => $this->customerUrl->getRegisterUrl(),
            'account'  => $this->customerUrl->getAccountUrl(),
            'logout'   => $this->customerUrl->getLogoutUrl(),
            'wishlist' => $this->urlBuilder->getUrl('wishlist'),
        ];
        $props['labels'] = [
            'wishlist'      => (string) __('My Wish List'),
            'greeting'      => (string) __('Hi, %1'),
            'myAccount'     => (string) __('My Account'),
            'signOut'       => (string) __('Sign Out'),
            'signIn'        => (string) __('Sign In'),
            'createAccount' => (string) __('Create an Account'),
        ];
        // The compare link; its url and count come from the compare-products section
        if ($props['show_compare'] ?? false) {
            $props['labels']['compare'] = (string) __('Compare Products');
        }

        return $props;
    }
}
