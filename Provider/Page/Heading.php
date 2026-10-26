<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * The Heading's `text` for the store being rendered, out of its localized setting
 */
class Heading extends AbstractComponentProvider
{
    /**
     * Localized text
     *
     * @param LocalizedText $localizedText
     */
    public function __construct(
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
        $props['text'] = $this->localizedText->get($props['text'] ?? '');

        return $props;
    }
}
