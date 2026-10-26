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
 * The hero slider's slides: the `image` of each item of its `slides` setting
 */
class Carousel extends AbstractComponentProvider
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
        foreach ($props['slides'] ?? [] as $i => $item) {
            if (\is_array($item)) {
                $props['slides'][$i]['title'] = $this->localizedText->get($item['title'] ?? '');
                $props['slides'][$i]['subtitle'] = $this->localizedText->get($item['subtitle'] ?? '');
                $props['slides'][$i]['cta_label'] = $this->localizedText->get($item['cta_label'] ?? '');
            }
        }

        foreach ($props['slides'] ?? [] as $i => $slide) {
            if (\is_array($slide)) {
                $props['slides'][$i]['image']   = $this->mediaUrl->url((string) ($slide['image'] ?? ''));
                $props['slides'][$i]['cta_url'] = $this->storeLink->path((string) ($slide['cta_url'] ?? ''));
            }
        }

        $props['labels'] = [
            'previous'   => (string) __('Previous'),
            'next'       => (string) __('Next'),
            // %1 is the slide's position, counting from one.
            'goToSlide'  => (string) __('Go to slide %1'),
            'pause'      => (string) __('Pause'),
            'play'       => (string) __('Play'),
        ];

        return $props;
    }
}
