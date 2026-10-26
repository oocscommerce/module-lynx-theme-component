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
 * The store link of each entry, from the `url` of its `links`
 */
class LinkList extends AbstractComponentProvider
{
    /**
     * Store link, localized text
     *
     * @param StoreLink $storeLink
     * @param LocalizedText $localizedText
     */
    public function __construct(
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
        foreach ($props['links'] ?? [] as $i => $item) {
            if (\is_array($item)) {
                $props['links'][$i]['label'] = $this->localizedText->get($item['label'] ?? '');
            }
        }

        foreach ($props['links'] ?? [] as $i => $link) {
            if (\is_array($link)) {
                $props['links'][$i]['url'] = $this->storeLink->path((string) ($link['url'] ?? ''));
            }
        }

        return $props;
    }
}
