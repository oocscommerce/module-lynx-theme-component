<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use Magento\Framework\UrlInterface;
use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Helper\SectionInvalidation;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * Feeds the NewsletterForm component with the newsletter endpoint
 */
class NewsletterForm extends AbstractComponentProvider
{
    /**
     * Url builder, section invalidation, localized text
     *
     * @param UrlInterface $urlBuilder
     * @param SectionInvalidation $sectionInvalidation
     * @param LocalizedText $localizedText
     */
    public function __construct(
        private readonly UrlInterface $urlBuilder,
        private readonly SectionInvalidation $sectionInvalidation,
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
        $props['note'] = $this->localizedText->get($props['note'] ?? '');
        $props['placeholder'] = $this->localizedText->get($props['placeholder'] ?? '');

        $props['urls'] = [
            'subscribe' => $this->urlBuilder->getUrl('newsletter/subscriber/new'),
        ];
        // Sections the endpoint invalidates, resolved from sections.xml.
        $props['sections'] = [
            'subscribe' => $this->sectionInvalidation->getForPath('newsletter/subscriber/new'),
        ];

        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'emailAddress'       => (string) __('Email Address'),
            'subscribe'          => (string) __('Subscribe'),
            'subscribing'        => (string) __('Subscribing…'),
            'subscribeError'     => (string) __('Something went wrong with the subscription.'),
        ];

        return $props;
    }
}
