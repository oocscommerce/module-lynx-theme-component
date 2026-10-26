<?php
/**
 * Copyright © OOCS Commerce (https://www.oocscommerce.com). All rights reserved.
 * See LICENSE.txt for license details.
 */
declare(strict_types=1);

namespace OOCS\LynxThemeComponent\Test\Unit\Provider\Page;

use Magento\Framework\Locale\ResolverInterface;
use OOCS\LynxComponent\Helper\LocalizedText;
use OOCS\LynxThemeComponent\Helper\MediaUrl;
use OOCS\LynxThemeComponent\Provider\Page\Video;
use PHPUnit\Framework\TestCase;

/**
 * The Video block: player address from YouTube or Vimeo links, poster, defaults
 */
class VideoTest extends TestCase
{
    /**
     * @var Video
     */
    private Video $video;

    /**
     * Media URLs get a /media/ prefix; locale en_US
     *
     * @return void
     */
    protected function setUp(): void
    {
        $media = $this->createMock(MediaUrl::class);
        $media->method('url')->willReturnCallback(fn ($value) => $value === '' ? '' : '/media/' . $value);
        $locale = $this->createMock(ResolverInterface::class);
        $locale->method('getLocale')->willReturn('en_US');

        $this->video = new Video($media, new LocalizedText($locale));
    }

    /**
     * Every YouTube link form gives the privacy-enhanced player and the thumbnail poster
     *
     * @return void
     */
    public function testYoutubeLinks(): void
    {
        foreach ([
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=5',
            'https://youtu.be/dQw4w9WgXcQ?si=x',
            'https://www.youtube.com/shorts/dQw4w9WgXcQ',
            'https://www.youtube.com/live/dQw4w9WgXcQ',
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        ] as $url) {
            $props = $this->video->resolve(['url' => $url]);
            $this->assertSame(
                'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
                $props['embed'],
                $url
            );
            $this->assertSame('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', $props['poster'], $url);
        }
    }

    /**
     * Vimeo links give the do-not-track player and no poster unless one is set
     *
     * @return void
     */
    public function testVimeo(): void
    {
        $props = $this->video->resolve(['url' => 'https://vimeo.com/channels/staffpicks/76979871']);

        $this->assertSame('https://player.vimeo.com/video/76979871?autoplay=1&dnt=1', $props['embed']);
        $this->assertSame('', $props['poster']);
        $this->assertSame(
            '/media/wysiwyg/poster.jpg',
            $this->video->resolve(['url' => 'https://vimeo.com/76979871', 'poster' => 'wysiwyg/poster.jpg'])['poster']
        );
    }

    /**
     * Other links give no player; title, defaults and the play label
     *
     * @return void
     */
    public function testUnknownLinkAndDefaults(): void
    {
        $props = $this->video->resolve(['url' => 'https://example.com/video.mp4', 'extra' => 1]);

        $this->assertSame('', $props['embed']);
        $this->assertSame('16_9', $props['aspect']);
        $this->assertSame('none', $props['rounded']);
        $this->assertSame(1, $props['extra']);

        $titled = $this->video->resolve(['url' => 'https://youtu.be/dQw4w9WgXcQ', 'title' => ['default' => 'Tour']]);
        $this->assertSame('Tour', $titled['title']);
        $this->assertSame('Play video: Tour', $titled['labels']['play']);
        $untitled = $this->video->resolve(['url' => 'https://youtu.be/dQw4w9WgXcQ']);
        $this->assertSame('Play video: youtube', $untitled['labels']['play']);
    }
}
