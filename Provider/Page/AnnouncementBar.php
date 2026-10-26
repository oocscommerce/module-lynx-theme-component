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
 * The store link of each message, from the `link_url` of its `items`
 */
class AnnouncementBar extends AbstractComponentProvider
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
        foreach ($props['items'] ?? [] as $i => $item) {
            if (\is_array($item)) {
                $props['items'][$i]['text'] = $this->localizedText->get($item['text'] ?? '');
                $props['items'][$i]['link_label'] = $this->localizedText->get($item['link_label'] ?? '');
            }
        }

        foreach ($props['items'] ?? [] as $i => $item) {
            if (\is_array($item)) {
                $props['items'][$i]['link_url'] = $this->storeLink->path((string) ($item['link_url'] ?? ''));
            }
        }

        // Names of the icon-only buttons, for screen readers
        $props['labels'] = [
            'previous' => (string) __('Previous'),
            'next'     => (string) __('Next'),
            'close'    => (string) __('Close'),
        ];

        return $props;
    }
}
