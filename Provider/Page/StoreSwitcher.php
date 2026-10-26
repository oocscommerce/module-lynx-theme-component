<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\UrlInterface;
use Magento\Store\Api\Data\StoreInterface;
use Magento\Store\Model\Store;
use Magento\Store\Model\StoreManagerInterface;
use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Helper\SectionInvalidation;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxComponent\Model\Cache\Type\ComponentCache;

/**
 * Store views the visitor can switch to: the active ones of the current group
 */
class StoreSwitcher extends AbstractComponentProvider
{
    private const CACHE_KEY_PREFIX = 'lynx_store_switcher_';

    private const CACHE_LIFETIME = 86400;

    private const MIN_OPTIONS = 2;

    /**
     * Store manager, cache, serializer, url builder, section invalidation, localized text
     *
     * @param StoreManagerInterface $storeManager
     * @param ComponentCache $cache
     * @param SerializerInterface $serializer
     * @param UrlInterface $urlBuilder
     * @param SectionInvalidation $sectionInvalidation
     * @param LocalizedText $localizedText
     */
    public function __construct(
        private readonly StoreManagerInterface $storeManager,
        private readonly ComponentCache $cache,
        private readonly SerializerInterface $serializer,
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
        $store = $this->storeManager->getStore();

        // The list is store configuration and depends on no page
        $cacheKey = self::CACHE_KEY_PREFIX . $store->getCode();
        $cached = $this->cache->load($cacheKey);
        if ($cached !== false) {
            $options = $this->serializer->unserialize($cached);
        } else {
            $options = $this->getStoreOptions($store);
            $this->cache->save(
                $this->serializer->serialize($options),
                $cacheKey,
                [Store::CACHE_TAG],
                self::CACHE_LIFETIME
            );
        }

        $props['options'] = $options;
        // stores/store/redirect hands the encoded url on to stores/store/switch
        $props['redirect_url'] = $options ? $this->urlBuilder->getUrl('stores/store/redirect') : '';
        // sections.xml declares the switch as <section name="*"/>
        $props['sections'] = $this->sectionInvalidation->getForPath('stores/store/switch');
        // The heading is the admin's when set, core's switch/stores.phtml label otherwise
        $props['labels'] = [];
        if ($props['show_title'] ?? true) {
            $props['labels']['title'] = $this->localizedText->get($props['title'] ?? '') ?: (string) __('Select Store');
        }

        return $props;
    }

    /**
     * Active store views of the group being browsed, ordered as an admin sorted them
     *
     * @param StoreInterface $currentStore
     * @return array<int, array{code: string, name: string}>
     */
    private function getStoreOptions(StoreInterface $currentStore): array
    {
        $stores = [];
        foreach ($this->storeManager->getWebsite()->getStores() as $store) {
            if (!$store->isActive() || (int) $store->getGroupId() !== (int) $currentStore->getGroupId()) {
                continue;
            }
            $stores[] = [
                'code'       => (string) $store->getCode(),
                'name'       => (string) $store->getName(),
                'sort_order' => (int) $store->getSortOrder(),
            ];
        }

        if (\count($stores) < self::MIN_OPTIONS) {
            return [];
        }

        usort($stores, static fn (array $a, array $b): int => $a['sort_order'] <=> $b['sort_order']);

        return array_map(
            static fn (array $store): array => ['code' => $store['code'], 'name' => $store['name']],
            $stores
        );
    }
}
