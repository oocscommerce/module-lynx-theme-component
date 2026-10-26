<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Checkout;

use Magento\Catalog\Helper\Product\ConfigurationPool as ProductConfigurationPool;
use Magento\Catalog\Model\Product\Configuration\Item\ItemResolverInterface;
use Magento\Catalog\Model\Product\Image\UrlBuilder as ImageUrlBuilder;
use Magento\Checkout\Block\Cart\Grid;
use Magento\Checkout\Model\Session as CheckoutSession;
use Magento\Checkout\ViewModel\Cart as CartViewModel;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Message\ManagerInterface as MessageManager;
use Magento\Framework\UrlInterface;
use Magento\Framework\View\Element\Message\InterpretationStrategyInterface;
use Magento\Multishipping\Helper\Data as MultishippingHelper;
use Magento\Quote\Model\Quote;
use Magento\Quote\Model\Quote\Item;
use Magento\Store\Model\ScopeInterface;
use OOCS\LynxCatalog\Model\Product\SalableStatus;
use OOCS\LynxComponent\Helper\SectionInvalidation;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\CartApiUrl;
use OOCS\LynxThemeComponent\Helper\CartTaxDisplay;

/**
 * Feeds the CheckoutCart component with the visitor's quote
 *
 * @SuppressWarnings(PHPMD.CookieAndSessionMisuse)
 * @SuppressWarnings(PHPMD.CouplingBetweenObjects)
 */
class Cart extends AbstractComponentProvider
{
    /**
     * Checkout session, image url builder, product configuration pool, url builder, section invalidation
     *
     * @param CheckoutSession $checkoutSession
     * @param ImageUrlBuilder $imageUrlBuilder
     * @param ProductConfigurationPool $productConfigurationPool
     * @param UrlInterface $urlBuilder
     * @param SectionInvalidation $sectionInvalidation
     * @param CartApiUrl $cartApiUrl
     * @param MultishippingHelper $multishippingHelper
     * @param ScopeConfigInterface $scopeConfig
     * @param RequestInterface $request
     * @param ItemResolverInterface $itemResolver
     * @param CartViewModel $cartViewModel
     * @param SalableStatus $salableStatus
     * @param CartTaxDisplay $cartTaxDisplay
     * @param MessageManager $messageManager
     * @param InterpretationStrategyInterface $interpretationStrategy
     * @SuppressWarnings(PHPMD.ExcessiveParameterList)
     */
    public function __construct(
        private readonly CheckoutSession $checkoutSession,
        private readonly ImageUrlBuilder $imageUrlBuilder,
        private readonly ProductConfigurationPool $productConfigurationPool,
        private readonly UrlInterface $urlBuilder,
        private readonly SectionInvalidation $sectionInvalidation,
        private readonly CartApiUrl $cartApiUrl,
        private readonly MultishippingHelper $multishippingHelper,
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly RequestInterface $request,
        private readonly ItemResolverInterface $itemResolver,
        private readonly CartViewModel $cartViewModel,
        private readonly SalableStatus $salableStatus,
        private readonly CartTaxDisplay $cartTaxDisplay,
        private readonly MessageManager $messageManager,
        private readonly InterpretationStrategyInterface $interpretationStrategy,
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
        $quote = $this->checkoutSession->getQuote();
        // A visitor who never added anything has no saved quote yet (id 0), and nothing may be read off it
        $hasQuote = (bool) $quote->getId();

        // Every visible item is loaded even when only a page is rendered; newest first, as in the mini cart
        $allItems = $hasQuote ? array_reverse($quote->getAllVisibleItems()) : [];
        $props += $this->paginate($allItems);
        // Read after the items: loading them with their products is what runs the checks
        $props['has_error'] = $hasQuote && (bool) $quote->getHasError();
        $props['error_messages'] = $props['has_error'] ? $this->getQuoteErrors($quote) : [];
        $props['coupon_code'] = $hasQuote ? (string) $quote->getCouponCode() : '';
        // Stores > Configuration > Sales > Checkout > Shopping Cart > Enable Clear Shopping Cart
        $props['can_clear_cart'] = $hasQuote && $this->cartViewModel->isClearShoppingCartEnabled();
        // Amounts come from the quote through the web API, the same source the checkout page reads
        $props['totals_url'] = $hasQuote ? $this->cartApiUrl->getUrl($quote, 'totals') : '';
        // REST prefix for this quote, which the coupon is applied and removed over
        $props['cart_api_url'] = $hasQuote ? $this->cartApiUrl->getBaseUrl($quote) : '';

        // Shopping Cart Display Settings of the tax configuration: which amounts show with tax, without, or both
        $props['tax_display'] = $this->cartTaxDisplay->get();
        $props['urls'] = $this->getUrls($hasQuote);
        // Customer-data sections each endpoint invalidates (keys mirror the urls).
        $props['sections'] = [
            'update_post'          => $this->sectionInvalidation->getForPath('checkout/cart/updatePost'),
            'delete'               => $this->sectionInvalidation->getForPath('checkout/cart/delete'),
        ];

        $props['labels'] = $this->getLabels();

        return $props;
    }

    /**
     * The page of items the request asks for, with the counts the pager renders
     *
     * @param Item[] $allItems
     * @return array<string,mixed>
     */
    private function paginate(array $allItems): array
    {
        $pageSize = max(
            1,
            (int) $this->scopeConfig->getValue(
                Grid::XPATH_CONFIG_NUMBER_ITEMS_TO_DISPLAY_PAGER,
                ScopeInterface::SCOPE_STORE
            )
        );
        $totalCount = \count($allItems);
        $totalPages = $totalCount > $pageSize ? (int) ceil($totalCount / $pageSize) : 1;
        // Clamped: removing the last item of the last page lands on the page before it.
        $page = min($totalPages, max(1, (int) $this->request->getParam('p', 1)));
        $pageItems = $totalPages > 1 ? \array_slice($allItems, ($page - 1) * $pageSize, $pageSize) : $allItems;

        return [
            'items'        => $this->getItems($pageItems),
            'total_count'  => $totalCount,
            'current_page' => $page,
            'total_pages'  => $totalPages,
        ];
    }

    /**
     * Storefront endpoints the cart page links to and posts to
     *
     * @param bool $hasQuote
     * @return array<string,string>
     */
    private function getUrls(bool $hasQuote): array
    {
        return [
            'checkout'             => $this->urlBuilder->getUrl('checkout'),
            'continue'             => $this->urlBuilder->getBaseUrl(),
            'update_post'          => $this->urlBuilder->getUrl('checkout/cart/updatePost'),
            'delete'               => $this->urlBuilder->getUrl('checkout/cart/delete'),
            // Empty unless shipping to several addresses is both switched on and possible for this quote
            'multishipping'        => $hasQuote && $this->multishippingHelper->isMultishippingCheckoutAvailable()
                ? $this->urlBuilder->getUrl('multishipping/checkout', ['_secure' => true])
                : '',
        ];
    }

    /**
     * Every string the component shows, translated here: the storefront's language is a server-side matter
     *
     * @return array<string,string>
     */
    private function getLabels(): array
    {
        return [
            'cart'               => (string) __('Shopping Cart'),
            'empty'              => (string) __('You have no items in your shopping cart.'),
            'continueShopping'   => (string) __('Continue Shopping'),
            'each'               => (string) __('%1 each'),
            'outOfStock'         => (string) __('Out of stock'),
            'decreaseQty'        => (string) __('Decrease quantity'),
            'quantity'           => (string) __('Quantity'),
            'increaseQty'        => (string) __('Increase quantity'),
            'removeFromCart'     => (string) __('Remove item'),
            'remove'             => (string) __('Remove'),
            'couponCode'         => (string) __('Coupon Code'),
            'couponTitle'        => (string) __('Apply Discount Code'),
            'enterCode'          => (string) __('Enter discount code'),
            'apply'              => (string) __('Apply'),
            'orderSummary'       => (string) __('Summary'),
            'proceedToCheckout'  => (string) __('Proceed to Checkout'),
            'multiAddress'       => (string) __('Check Out with Multiple Addresses'),
            'clearCart'          => (string) __('Clear Shopping Cart'),
            // Short wording rather than core's "Update Shopping Cart"
            'updateCart'         => (string) __('Update Cart'),
            'confirmClearCart'   => (string) __('Are you sure you want to remove all items from your shopping cart?'),
            'pageOf'             => (string) __('Page %1 of %2'),
            'itemsCount'         => (string) __('%1 items'),
            'previous'           => (string) __('Previous'),
            'next'               => (string) __('Next'),
            'inclTax'            => (string) __('Incl. Tax'),
            'exclTax'            => (string) __('Excl. Tax'),
            'subtotalInclTax'    => (string) __('Subtotal (Incl. Tax)'),
            'subtotalExclTax'    => (string) __('Subtotal (Excl. Tax)'),
            'orderTotalInclTax'  => (string) __('Order Total Incl. Tax'),
            'orderTotalExclTax'  => (string) __('Order Total Excl. Tax'),
        ];
    }

    /**
     * The item's messages as core's cart item renderer lists them: its own (error, backorder notice) and queued ones
     *
     * @param Item $item
     * @return array<int, array{type: string, text: string}>
     */
    private function getItemMessages(Item $item): array
    {
        $messages = [];
        foreach ((array) $item->getMessage(false) as $message) {
            $messages[] = ['type' => $item->getHasError() ? 'error' : 'notice', 'text' => (string) $message];
        }

        $group = 'quote_item' . $item->getId();
        foreach ($this->messageManager->getMessages(true, $group)->getItems() as $message) {
            $messages[] = [
                'type' => $message->getType(),
                'text' => (string) $this->interpretationStrategy->interpret($message),
            ];
        }

        return array_values(array_filter(array_map(
            fn (array $message) => ['type' => $message['type'], 'text' => $this->toPlainText($message['text'])],
            $messages
        ), fn (array $message) => $message['text'] !== ''));
    }

    /**
     * The page's line items as the component renders them
     *
     * @param Item[] $quoteItems
     * @return array<int, array<string, mixed>>
     */
    private function getItems(array $quoteItems): array
    {
        $items = [];
        // Index in $items => sku, for the composite lines only
        $compositeSkus = [];
        foreach ($quoteItems as $item) {
            $product = $item->getProduct();
            // The product whose image the line shows, as core's cart renderers pick it
            $imageProduct = $this->itemResolver->getFinalProduct($item);

            $composite = $product->getTypeInstance()->isComposite($product);
            if ($composite) {
                // The product's own SKU: getSku() on a quote item's bundle joins the selected children's onto it
                $compositeSkus[\count($items)] = (string) $product->getData('sku');
            }

            $items[] = [
                'item_id'             => (int) $item->getItemId(),
                'name'                => $this->toPlainText((string) $item->getName()),
                'sku'                 => (string) $item->getSku(),
                'url'                 => $product->getProductUrl(),
                'image'               => $this->imageUrlBuilder->getUrl(
                    (string) ($imageProduct->getData('small_image') ?: 'no_selection'),
                    'cart_page_product_thumbnail'
                ),
                'qty'                 => (float) $item->getQty(),
                // getCalculationPrice(), not getPrice(): the latter is the base currency
                'price'               => (float) $item->getCalculationPrice(),
                'row_total'           => (float) $item->getRowTotal(),
                'price_incl_tax'      => (float) $item->getPriceInclTax(),
                'row_total_incl_tax'  => (float) $item->getRowTotalInclTax(),
                'is_salable'          => $composite ? false : (bool) $product->isSalable(),
                'messages'            => $this->getItemMessages($item),
                'options'             => $this->getItemOptions($item),
            ];
        }

        // Salability, asked of the stock index only for the lines that would otherwise cost a query
        $salable = $this->salableStatus->forSkus(array_values($compositeSkus));
        foreach ($compositeSkus as $i => $sku) {
            $items[$i]['is_salable'] = $salable[$sku] ?? false;
        }

        return $items;
    }

    /**
     * The quote-level error messages ("Some of the products below do not have all the required options."), deduplicated
     *
     * @param Quote $quote
     * @return array<int, string>
     */
    private function getQuoteErrors(Quote $quote): array
    {
        $texts = [];
        foreach ($quote->getMessages() as $message) {
            $text = $this->toPlainText((string) $message->getText());
            if ($text !== '') {
                $texts[$text] = $text;
            }
        }

        return array_values($texts);
    }

    /**
     * Selected options of a line item, through the pool rather than through one helper
     *
     * @param Item $item
     * @return array<int, array{label: string, value: string|array<int, string>, option_type: string}>
     */
    private function getItemOptions(Item $item): array
    {
        $configuration = $this->productConfigurationPool->getByProductType($item->getProductType());

        $options = [];
        foreach ($configuration->getOptions($item) as $option) {
            $value = $option['value'] ?? '';
            $options[] = [
                'label'       => $this->toPlainText((string) ($option['label'] ?? '')),
                'value'       => \is_array($value) ? array_map('strval', $value) : (string) $value,
                // Only custom options carry one; a bundle says the same thing by handing over a list
                'option_type' => (string) ($option['option_type'] ?? ''),
            ];
        }

        return $options;
    }
}
