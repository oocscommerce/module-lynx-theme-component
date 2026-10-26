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
 * The Banner's background image, from its `image` setting, and the store link of its call to action
 */
class Banner extends AbstractComponentProvider
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
        $props['title'] = $this->localizedText->get($props['title'] ?? '');
        $props['subtitle'] = $this->localizedText->get($props['subtitle'] ?? '');
        $props['cta_label'] = $this->localizedText->get($props['cta_label'] ?? '');

        $props['image']   = $this->mediaUrl->url((string) ($props['image'] ?? ''));
        $props['cta_url'] = $this->storeLink->path((string) ($props['cta_url'] ?? ''));

        return $props;
    }
}
