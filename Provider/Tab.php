<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * A Tab has one setting the visitor reads, its title, and it is translatable (text_i18n)
 */
class Tab extends AbstractComponentProvider
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
        $props['title'] = $this->localizedText->get($props['title'] ?? '');

        return $props;
    }
}
