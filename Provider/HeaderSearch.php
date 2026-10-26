<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider;

use Magento\AdvancedSearch\Model\SuggestedQueriesInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\UrlInterface;
use Magento\Search\Helper\Data as SearchHelper;
use Magento\Store\Model\ScopeInterface;
use Magento\Store\Model\StoreManagerInterface;
use OOCS\LynxComponent\Model\AbstractComponentProvider;

/**
 * The header search: where a query goes, and the GraphQL endpoint its suggestions come from
 */
class HeaderSearch extends AbstractComponentProvider
{
    /**
     * Url builder, search helper, scope config, store manager
     *
     * @param UrlInterface $urlBuilder
     * @param SearchHelper $searchHelper
     * @param ScopeConfigInterface $scopeConfig
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        private readonly UrlInterface $urlBuilder,
        private readonly SearchHelper $searchHelper,
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly StoreManagerInterface $storeManager,
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
        $props['search'] = [
            'action_url'      => $this->urlBuilder->getUrl('catalogsearch/result'),
            // The component sends the autocomplete query itself, as GET so the GraphQL page cache can answer
            'suggest_url'     => $this->storeManager->getStore()->getBaseUrl() . 'graphql',
            'min_length'      => (int) $this->searchHelper->getMinQueryLength(),
            'max_length'      => (int) $this->searchHelper->getMaxQueryLength(),
            'suggest_enabled' => $this->scopeConfig->isSetFlag(
                SuggestedQueriesInterface::SEARCH_SUGGESTION_ENABLED,
                ScopeInterface::SCOPE_STORE
            ),
            // Through __() so it follows the store's translations.
            'placeholder'     => (string) __('Search entire store here...'),
        ];
        $props['labels'] = [
            'search'          => (string) __('Search'),
            'closeSearch'     => (string) __('Close'),
            'inCategory'      => (string) __('in %1'),
            'viewAllResults'  => (string) __('View All'),
            'searchMinLength' => (string) __('Minimum Search query length is %1'),
            'searchError'     => (string) __('Something went wrong with your request. Please try again later.'),
            'searchFetching'  => (string) __('Loading...'),
            'searchNoResults' => (string) __('Your search returned no results.'),
        ];

        return $props;
    }
}
