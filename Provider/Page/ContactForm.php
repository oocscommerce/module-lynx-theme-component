<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use Magento\Framework\UrlInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * Supplies the config-aware submit URL to the ContactForm component (base url, store code, secure)
 */
class ContactForm extends AbstractComponentProvider
{
    /**
     * Url builder
     *
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        private readonly UrlInterface $urlBuilder,
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

        $props['urls'] = [
            'post' => $this->urlBuilder->getUrl('contact/index/post'),
        ];

        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'enterName'          => (string) __('This is a required field.'),
            'invalidEmail'       => (string) __('Please enter a valid email address.'),
            'enterMessage'       => (string) __('This is a required field.'),
            'name'               => (string) __('Name'),
            'email'              => (string) __('Email'),
            'emailPlaceholder'   => (string) __('abc@xyz.com'),
            'phone'              => (string) __('Phone Number'),
            'message'            => (string) __('Message'),
            'messagePlaceholder' => (string) __('What’s on your mind?'),
            'sending'            => (string) __('Sending…'),
            'send'               => (string) __('Submit'),
        ];

        return $props;
    }
}
