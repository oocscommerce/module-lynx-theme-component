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
 * The strings, and the store link of the policy page: the component is otherwise self-contained
 */
class CookieConsent extends AbstractComponentProvider
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
        $props['message'] = $this->localizedText->get($props['message'] ?? '');
        $props['policy_label'] = $this->localizedText->get($props['policy_label'] ?? '');
        $props['accept_label'] = $this->localizedText->get($props['accept_label'] ?? '');
        $props['decline_label'] = $this->localizedText->get($props['decline_label'] ?? '');

        $props['policy_url'] = $this->storeLink->path((string) ($props['policy_url'] ?? ''));

        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'title'              => (string) __('Cookie Notice'),
        ];

        return $props;
    }
}
