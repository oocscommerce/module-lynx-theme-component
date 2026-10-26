<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Helper;

use Magento\Framework\UrlInterface;
use Magento\Quote\Model\Quote;
use Magento\Quote\Model\QuoteIdMaskFactory;
use Magento\Quote\Model\ResourceModel\Quote\QuoteIdMask as QuoteIdMaskResource;
use Magento\Store\Model\StoreManagerInterface;

/**
 * Web API prefix for the visitor's own quote
 */
class CartApiUrl
{
    /**
     * Masked id per quote id
     *
     * @var array<int, string>
     */
    private array $maskedIds = [];

    /**
     * Store manager, url builder, quote id mask factory, quote id mask resource
     *
     * @param StoreManagerInterface $storeManager
     * @param UrlInterface $urlBuilder
     * @param QuoteIdMaskFactory $quoteIdMaskFactory
     * @param QuoteIdMaskResource $quoteIdMaskResource
     */
    public function __construct(
        private readonly StoreManagerInterface $storeManager,
        private readonly UrlInterface $urlBuilder,
        private readonly QuoteIdMaskFactory $quoteIdMaskFactory,
        private readonly QuoteIdMaskResource $quoteIdMaskResource,
    ) {
    }

    /**
     * Endpoint prefix for this quote, or an empty string when it has no id yet
     *
     * @param Quote $quote
     * @return string
     */
    public function getBaseUrl(Quote $quote): string
    {
        $quoteId = (int) $quote->getId();
        if ($quoteId === 0) {
            return '';
        }

        $path = (int) $quote->getCustomerId() > 0
            ? 'carts/mine'
            : 'guest-carts/' . $this->getMaskedId($quoteId);

        return $this->urlBuilder->getBaseUrl()
            . 'rest/' . $this->storeManager->getStore()->getCode() . '/V1/' . $path;
    }

    /**
     * One endpoint of this quote, e.g
     *
     * @param Quote $quote
     * @param string $path
     * @return string
     */
    public function getUrl(Quote $quote, string $path): string
    {
        $base = $this->getBaseUrl($quote);

        return $base === '' ? '' : $base . '/' . $path;
    }

    /**
     * The masked id of a guest quote, created here when the quote does not have one yet
     *
     * @param int $quoteId
     * @return string
     */
    private function getMaskedId(int $quoteId): string
    {
        if (isset($this->maskedIds[$quoteId])) {
            return $this->maskedIds[$quoteId];
        }

        $maskedId = (string) $this->quoteIdMaskResource->getMaskedQuoteId($quoteId);
        if ($maskedId === '') {
            $quoteIdMask = $this->quoteIdMaskFactory->create();
            // masked_id is filled in by QuoteIdMask::beforeSave().
            $quoteIdMask->setQuoteId($quoteId);
            $this->quoteIdMaskResource->save($quoteIdMask);
            $maskedId = (string) $quoteIdMask->getMaskedId();
        }

        return $this->maskedIds[$quoteId] = $maskedId;
    }
}
