<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * Only the strings: the component is otherwise self-contained
 */
class BackToTop extends AbstractComponentProvider
{
    /**
     * Resolve
     *
     * @param array $props
     * @return array
     */
    public function resolve(array $props): array
    {
        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'backToTop'          => (string) __('Back to top'),
        ];

        return $props;
    }
}
