<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\StoreLink;

/**
 * The Button's `label` for the store being rendered, out of its localized setting
 */
class Button extends AbstractComponentProvider
{
    /**
     * Localized text, store link
     *
     * @param LocalizedText $localizedText
     * @param StoreLink $storeLink
     */
    public function __construct(
        private readonly LocalizedText $localizedText,
        private readonly StoreLink $storeLink,
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
        $props['label'] = $this->localizedText->get($props['label'] ?? '');
        $props['href']  = $this->storeLink->path((string) ($props['href'] ?? ''));

        return $props;
    }
}
