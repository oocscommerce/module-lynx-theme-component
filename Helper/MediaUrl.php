<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Helper;

use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;

/**
 * Turns the value of an `image` setting into a URL of the current store's media
 */
class MediaUrl
{
    /**
     * Store manager
     *
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        private readonly StoreManagerInterface $storeManager,
    ) {
    }

    /**
     * Url
     *
     * @param string $value
     * @return string
     */
    public function url(string $value): string
    {
        $value = trim($value);
        if ($value === '' || str_starts_with($value, '/') || preg_match('#^https?://#i', $value)) {
            return $value;
        }

        return $this->storeManager->getStore()->getBaseUrl(UrlInterface::URL_TYPE_MEDIA) . $value;
    }
}
