/*********************************************************
 * Classes and fitting for decks written in Markdown, so the CSS can style
 * what Markdown can't mark up. Load after Reveal.initialize has finished
 * (src/js/deck-start.js does), and before src/js/deck-controls.js, so the
 * contents thumbnails show the same thing. Settings, all optional:
 *   deckMarkdown: {
 *     fieldClasses: true,      // "- **Use it for:** ..." gets li.field.field-use-it-for
 *     h1Class: 'topic',        // a slide whose heading is a level 1 heading
 *     sceneLabel: 'Scene',     // a "**Scene: ...**" line gets p.scene ('' = off)
 *     externalLinksNewTab: true, // links to other websites open a new tab
 *     fit: true,               // shrink a slide's text until it fits:
 *     fitMin: 0.55,            //   no smaller than this,
 *     fitStep: 0.05,           //   in steps of this
 *   }
 * Fitting sets --fit (1 down to fitMin) on the slide; the CSS multiplies
 * font sizes by it, e.g. font-size: calc(30px * var(--fit, 1)).
 *********************************************************/
(function () {
	'use strict';

	const settings = Object.assign({
		fieldClasses: true,
		h1Class: 'topic',
		sceneLabel: 'Scene',
		externalLinksNewTab: true,
		fit: true,
		fitMin: 0.55,
		fitStep: 0.05,
	}, Reveal.getConfig().deckMarkdown || {});

	const slides = document.querySelector('.reveal .slides');

	// "**Use it for:** ..." -> li.field.field-use-it-for
	if (settings.fieldClasses) {
		slides.querySelectorAll('li').forEach(function (item) {
			const label = item.querySelector(':scope > strong:first-child');
			if (!label || !/:\s*$/.test(label.textContent)) return;
			const name = label.textContent.replace(/:\s*$/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
			item.classList.add('field', 'field-' + name);
		});
	}

	if (settings.h1Class) {
		slides.querySelectorAll('section').forEach(function (slide) {
			if (slide.querySelector(':scope > h1')) slide.classList.add(settings.h1Class);
		});
	}

	// "**Scene: ...**" on its own line
	if (settings.sceneLabel) {
		const pattern = new RegExp('^' + settings.sceneLabel + ':');
		slides.querySelectorAll('section > p').forEach(function (line) {
			if (pattern.test(line.textContent.trim()) && line.children.length === 1) line.classList.add('scene');
		});
	}

	// Links to other websites open in a new tab, so the deck stays open
	if (settings.externalLinksNewTab) {
		slides.querySelectorAll('a[href^="http"]').forEach(function (link) {
			link.target = '_blank';
			link.rel = 'noopener';
		});
	}

	// Long slides: shrink the text until it fits the slide's height
	if (settings.fit) {
		const room = Reveal.getConfig().height - 30;
		const fit = function (slide) {
			if (!slide || slide.dataset.fitted) return;
			let size = 1;
			while (slide.scrollHeight > room && size > settings.fitMin) {
				size -= settings.fitStep;
				slide.style.setProperty('--fit', size.toFixed(2));
			}
			slide.dataset.fitted = 'yes';
		};
		fit(Reveal.getCurrentSlide());
		Reveal.on('slidechanged', function (event) { fit(event.currentSlide); });
		// Slides added later (the contents) can change the current slide
		// without a slidechanged event, so check again once everything is in
		document.addEventListener('deck:ready', function () { fit(Reveal.getCurrentSlide()); });
	}
})();
