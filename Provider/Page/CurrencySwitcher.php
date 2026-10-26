<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use Magento\Framework\Locale\Bundle\CurrencyBundle;
use Magento\Framework\Locale\CurrencyInterface as LocaleCurrency;
use Magento\Framework\Locale\ResolverInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\Store;
use Magento\Store\Model\StoreManagerInterface;
use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Helper\SectionInvalidation;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxComponent\Model\Cache\Type\ComponentCache;

/**
 * Currencies the visitor can switch to: code, display name and symbol
 */
class CurrencySwitcher extends AbstractComponentProvider
{
    private const CACHE_KEY_PREFIX = 'lynx_currency_switcher_';

    private const CACHE_LIFETIME = 86400;

    private const MIN_OPTIONS = 2;

    /**
     * Store manager, cache, serializer, url builder, section invalidation, locale resolver, locale currency
     *
     * @param StoreManagerInterface $storeManager
     * @param ComponentCache $cache
     * @param SerializerInterface $serializer
     * @param UrlInterface $urlBuilder
     * @param SectionInvalidation $sectionInvalidation
     * @param ResolverInterface $localeResolver
     * @param LocaleCurrency $localeCurrency
     * @param LocalizedText $localizedText
     */
    public function __construct(
        private readonly StoreManagerInterface $storeManager,
        private readonly ComponentCache $cache,
        private readonly SerializerInterface $serializer,
        private readonly UrlInterface $urlBuilder,
        private readonly SectionInvalidation $sectionInvalidation,
        private readonly ResolverInterface $localeResolver,
        private readonly LocaleCurrency $localeCurrency,
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
        $store = $this->storeManager->getStore();

        $cacheKey = self::CACHE_KEY_PREFIX . $store->getCode();
        $cached = $this->cache->load($cacheKey);
        if ($cached !== false) {
            $options = $this->serializer->unserialize($cached);
        } else {
            $options = $this->getCurrencyOptions($store->getAvailableCurrencyCodes(true));
            $this->cache->save(
                $this->serializer->serialize($options),
                $cacheKey,
                [Store::CACHE_TAG],
                self::CACHE_LIFETIME
            );
        }

        $props['options'] = $options;
        // directory/currency/switch reads a `currency` parameter; Luma posts it
        $props['switch_url'] = $options ? $this->urlBuilder->getUrl('directory/currency/switch') : '';
        // sections.xml declares the switch as <section name="*"/>
        $props['sections'] = $this->sectionInvalidation->getForPath('directory/currency/switch');
        // The heading is the admin's when set, core's currency switcher label otherwise
        $props['labels'] = [];
        if ($props['show_title'] ?? true) {
            $props['labels']['title'] = $this->localizedText->get($props['title'] ?? '') ?: (string) __('Currency');
        }

        return $props;
    }

    /**
     * Names come from ICU's currency bundle for the store locale
     *
     * @param mixed $codes
     * @return array<int, array{code: string, name: string, symbol: string}>
     */
    private function getCurrencyOptions(mixed $codes): array
    {
        if (!\is_array($codes) || \count($codes) < self::MIN_OPTIONS) {
            return [];
        }

        $names = (new CurrencyBundle())->get($this->localeResolver->getLocale())['Currencies'] ?? [];

        return array_values(array_map(
            fn (string $code): array => [
                'code'   => $code,
                'name'   => (string) ($names[$code][1] ?? '') ?: $code,
                'symbol' => (string) $this->localeCurrency->getCurrency($code)->getSymbol(),
            ],
            array_unique(array_map('strval', $codes))
        ));
    }
}
