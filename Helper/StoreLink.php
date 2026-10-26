<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Helper;

use Magento\Framework\UrlInterface;

/**
 * Turns the value of a `url` setting into a link of the current store
 */
class StoreLink
{
    /**
     * Url
     *
     * @param UrlInterface $url
     */
    public function __construct(
        private readonly UrlInterface $url,
    ) {
    }

    /**
     * Path
     *
     * @param string $value
     * @return string
     */
    public function path(string $value): string
    {
        $value = trim($value);
        if ($value === '' || str_starts_with($value, '#') || preg_match('#^[a-z][a-z0-9+.-]*:#i', $value)) {
            return $value;
        }

        return preg_replace('#^[a-z]+://[^/]*#i', '', $this->url->getDirectUrl(ltrim($value, '/')));
    }
}
