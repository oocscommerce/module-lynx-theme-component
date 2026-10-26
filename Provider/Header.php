<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use Magento\Catalog\Model\Category;
use Magento\Catalog\Model\ResourceModel\Category\Collection;
use Magento\Catalog\Model\ResourceModel\Category\CollectionFactory;
use Magento\Customer\Model\Url as CustomerUrl;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\UrlInterface;
use Magento\Store\Api\Data\StoreInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Theme\Block\Html\Header\Logo;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxComponent\Model\Cache\Type\ComponentCache;
use OOCS\LynxComponent\Model\PageCacheIdentities;

/**
 * Enriches the Header component props with the real category tree of the current store
 *
 * @SuppressWarnings(PHPMD.CouplingBetweenObjects)
 */
class Header extends AbstractComponentProvider
{
    private const CACHE_KEY_PREFIX = 'lynx_header_categories_';

    /**
     * The store being browsed
     *
     * @var StoreInterface|null
     */
    private ?StoreInterface $store = null;

    private const CACHE_LIFETIME = 86400;

    /**
     * Collection factory, store manager, page cache identities, cache, serializer, customer url, url builder
     *
     * @param CollectionFactory $collectionFactory
     * @param StoreManagerInterface $storeManager
     * @param PageCacheIdentities $pageCacheIdentities
     * @param ComponentCache $cache
     * @param SerializerInterface $serializer
     * @param CustomerUrl $customerUrl
     * @param UrlInterface $urlBuilder
     * @param Logo $logo
     */
    public function __construct(
        private readonly CollectionFactory $collectionFactory,
        private readonly StoreManagerInterface $storeManager,
        private readonly PageCacheIdentities $pageCacheIdentities,
        private readonly ComponentCache $cache,
        private readonly SerializerInterface $serializer,
        private readonly CustomerUrl $customerUrl,
        private readonly UrlInterface $urlBuilder,
        private readonly Logo $logo,
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
        $store = $this->getStore();
        $cacheKey = self::CACHE_KEY_PREFIX . $store->getId();

        $cached = $this->cache->load($cacheKey);
        if ($cached !== false) {
            $data = $this->serializer->unserialize($cached);
        } else {
            $data = $this->loadCategoryData((int) $store->getId(), (int) $store->getRootCategoryId());
            $this->cache->save(
                $this->serializer->serialize($data),
                $cacheKey,
                $data['identities'],
                self::CACHE_LIFETIME
            );
        }

        $this->pageCacheIdentities->add($data['identities']);
        $props['categories'] = $data['categories'];

        // The store's logo, the way Luma's header block resolves it
        $props['logo_src'] = (string) $this->logo->getLogoSrc();
        $props['logo_alt'] = (string) ($this->logo->getLogoAlt() ?: $store->getFrontendName());
        $props['logo_href'] = $this->urlBuilder->getUrl('');

        // The menu drawer's account links: config-aware (base url, store code, custom login page, secure)
        $props['customer_urls'] = [
            // No referer: the component adds the page being viewed, which changes with each Inertia visit
            'login'    => $this->urlBuilder->getUrl(CustomerUrl::ROUTE_ACCOUNT_LOGIN),
            'create'   => $this->customerUrl->getRegisterUrl(),
            'account'  => $this->customerUrl->getAccountUrl(),
            'logout'   => $this->customerUrl->getLogoutUrl(),
            'wishlist' => $this->urlBuilder->getUrl('wishlist'),
        ];
        // Every string the component shows, translated here: the storefront's language is a server-side matter
        $props['labels'] = [
            'wishlist'      => (string) __('My Wish List'),
            'greeting'      => (string) __('Hi, %1'),
            'myAccount'     => (string) __('My Account'),
            'account'       => (string) __('Account'),
            'viewAll'       => (string) __('View All'),
            'signOut'       => (string) __('Sign Out'),
            'signIn'        => (string) __('Sign In'),
            'createAccount' => (string) __('Create an Account'),
            'close'         => (string) __('Close'),
            'menu'          => (string) __('Menu'),
            'compare'       => (string) __('Compare Products'),
        ];

        return $props;
    }

    /**
     * Get Store
     *
     * @return StoreInterface
     */
    private function getStore(): StoreInterface
    {
        return $this->store ??= $this->storeManager->getStore();
    }

    /**
     * Query the category tree and derive the FPC/cache identities
     *
     * @param int $storeId
     * @param int $rootId
     * @return array{categories: array, identities: string[]}
     */
    private function loadCategoryData(int $storeId, int $rootId): array
    {
        $collection = $this->getCategoryTree($storeId, $rootId);

        $byParent = [];
        foreach ($collection as $category) {
            $byParent[(int) $category->getParentId()][] = $category;
        }

        // Same as Catalog\Plugin\Block\Topmenu::beforeGetIdentities()
        $identities = [Category::CACHE_TAG];
        foreach ($byParent[$rootId] ?? [] as $category) {
            $identities[] = Category::CACHE_TAG . '_' . $category->getId();
        }

        return [
            'categories' => $this->buildTree($byParent, $rootId),
            'identities' => $identities,
        ];
    }

    /**
     * Build a recursive node tree from the flat collection grouped by parent id
     *
     * @param array $byParent
     * @param int $parentId
     * @return array<int, array{label: string, url: string, children: array}>
     */
    private function buildTree(array $byParent, int $parentId): array
    {
        $nodes = [];
        foreach ($byParent[$parentId] ?? [] as $category) {
            $nodes[] = [
                'label'    => $this->toPlainText((string) $category->getName()),
                // Origin-relative, store code path kept: valid on whichever host serves the page
                'url'      => preg_replace('#^[a-z][a-z\d+.-]*://[^/?\#]+#i', '', $category->getUrl()) ?: '/',
                'children' => $this->buildTree($byParent, (int) $category->getId()),
            ];
        }

        return $nodes;
    }

    /**
     * Same collection recipe as Magento\Catalog\Plugin\Block\Topmenu::getCategoryTree()
     *
     * @param int $storeId
     * @param int $rootId
     * @return Collection
     */
    private function getCategoryTree(int $storeId, int $rootId): Collection
    {
        $collection = $this->collectionFactory->create();
        $collection->setStoreId($storeId);
        $collection->addAttributeToSelect('name');
        $collection->addFieldToFilter('path', ['like' => '1/' . $rootId . '/%']);
        $collection->addAttributeToFilter('include_in_menu', 1);
        $collection->addIsActiveFilter();
        $collection->addNavigationMaxDepthFilter();
        $collection->addUrlRewriteToResult();
        $collection->addOrder('level', Collection::SORT_ORDER_ASC);
        $collection->addOrder('position', Collection::SORT_ORDER_ASC);
        $collection->addOrder('parent_id', Collection::SORT_ORDER_ASC);
        $collection->addOrder('entity_id', Collection::SORT_ORDER_ASC);

        return $collection;
    }
}
