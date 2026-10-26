<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\MediaUrl;
use OOCS\LynxThemeComponent\Helper\StoreLink;

/**
 * The Image block's picture, from its `src` setting, and the store link it opens
 */
class Image extends AbstractComponentProvider
{
    /**
     * Media url, store link, localized text
     *
     * @param MediaUrl $mediaUrl
     * @param StoreLink $storeLink
     * @param LocalizedText $localizedText
     */
    public function __construct(
        private readonly MediaUrl $mediaUrl,
        private readonly StoreLink $storeLink,
        private readonly LocalizedText $localizedText,
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
        $props['alt'] = $this->localizedText->get($props['alt'] ?? '');

        $props['src']  = $this->mediaUrl->url((string) ($props['src'] ?? ''));
        $props['href'] = $this->storeLink->path((string) ($props['href'] ?? ''));

        return $props;
    }
}
