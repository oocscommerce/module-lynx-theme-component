<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\MediaUrl;

/**
 * The Group's band background, from its `background_image` setting
 */
class Group extends AbstractComponentProvider
{
    /**
     * Media url
     *
     * @param MediaUrl $mediaUrl
     */
    public function __construct(
        private readonly MediaUrl $mediaUrl,
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
        $props['background_image'] = $this->mediaUrl->url((string) ($props['background_image'] ?? ''));

        return $props;
    }
}
