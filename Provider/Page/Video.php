<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Provider\Page;

use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxComponent\Model\AbstractComponentProvider;
use OOCS\LynxThemeComponent\Helper\MediaUrl;

/**
 * The Video block's player address and poster, from a YouTube or Vimeo link
 */
class Video extends AbstractComponentProvider
{
    // watch?v=, embed/, shorts/, live/ and youtu.be links, on youtube.com or youtube-nocookie.com
    private const YOUTUBE_PATTERN = '#(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)'
        . '|youtu\.be/)([\w-]{11})#i';

    /**
     * Media url, localized text
     *
     * @param MediaUrl $mediaUrl
     * @param LocalizedText $localizedText
     */
    public function __construct(
        private readonly MediaUrl $mediaUrl,
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
        $title = $this->localizedText->get($props['title'] ?? '');
        [$platform, $id] = $this->parse((string) ($props['url'] ?? ''));

        // YouTube thumbnails have a fixed address; Vimeo's would take a request per render, so it needs a poster set
        $poster = $this->mediaUrl->url((string) ($props['poster'] ?? ''));
        if ($poster === '' && $platform === 'youtube') {
            $poster = 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg';
        }

        return [
            ...$props,
            'title'   => $title,
            'embed'   => match ($platform) {
                'youtube' => 'https://www.youtube-nocookie.com/embed/' . $id . '?autoplay=1&rel=0',
                'vimeo'   => 'https://player.vimeo.com/video/' . $id . '?autoplay=1&dnt=1',
                default   => '',
            },
            'poster'  => $poster,
            'aspect'  => (string) ($props['aspect'] ?? '16_9'),
            'rounded' => (string) ($props['rounded'] ?? 'none'),
            'labels'  => [
                'play' => (string) __('Play video: %1', $title !== '' ? $title : $platform),
            ],
        ];
    }

    /**
     * Platform and video id of a YouTube or Vimeo link; empty strings for anything else
     *
     * @param string $url
     * @return array{0: string, 1: string}
     */
    private function parse(string $url): array
    {
        $url = trim($url);
        if (preg_match(self::YOUTUBE_PATTERN, $url, $m)) {
            return ['youtube', $m[1]];
        }
        if (preg_match('#vimeo\.com/(?:.*/)?(\d+)#i', $url, $m)) {
            return ['vimeo', $m[1]];
        }

        return ['', ''];
    }
}
