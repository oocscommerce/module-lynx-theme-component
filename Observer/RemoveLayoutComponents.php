<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;

/**
 * Takes every component out of whole parts of the page
 */
class RemoveLayoutComponents implements ObserverInterface
{
    /**
     * Removed
     *
     * @param array $removed
     */
    public function __construct(
        private readonly array $removed = [],
    ) {
    }

    /**
     * Execute
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer): void
    {
        // Request::getFullActionName() keeps the casing of the URL, so camelCase actions arrive as e.g
        $action = strtolower((string) $observer->getEvent()->getData('action'));
        if (empty($this->removed[$action])) {
            return;
        }

        $transport = $observer->getEvent()->getData('transport');
        $layout = $transport->getData('layout');

        foreach ($this->removed[$action] as $part) {
            $layout[$part] = [];
        }

        $transport->setData('layout', $layout);
    }
}
