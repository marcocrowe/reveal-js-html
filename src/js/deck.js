/*********************************************************
 * Shared behaviour for the reveal.js decks in this folder.
 * Load after Reveal.initialize(), with mouseWheel left off
 * and history: true.
 *
 * Mouse only, no keyboard needed:
 *   wheel           one notch, one slide
 *   left click      next slide (on empty space)
 *   right click     previous slide (the context menu stays on
 *                   links, code and selected text)
 *   middle click    next section, skipping the slides below
 *   back / forward  side buttons, previous / next slide
 * With a keyboard: Shift+click back, Alt+click next section.
 *
 * Footnote markers (a.ref, icons drawn in src/css/tna.css):
 *   a reference or media marker jumps to its line on the References or
 *   Media used slide. Right click or the back button returns.
 *   Hover either to see the full entry.
 *
 * Also: a copy icon on code boxes, GitHub style, and a position bar
 * under the heading inside a vertical stack.
 *
 * On a phone (under 435px wide) reveal.js switches to its scroll
 * view, where the deck is one long page. The mouse handlers stand
 * down there, so the page scrolls and taps work normally.
 * keep the slides instead with scrollActivationWidth: null.
 *
 * Touch screens, with tapZones: true in Reveal.initialize: tap the
 * left third of the slide to go back, the right third to go on. The
 * middle third does nothing, so text can still be selected.
 *********************************************************/
(function () {
	const deck = document.querySelector('.reveal');

	function scrollView() {
		return typeof Reveal.isScrollView === 'function' && Reveal.isScrollView();
	}

	/* Things the mouse handlers leave alone: links, buttons, form fields,
	 * code, the reveal.js controls. Add data-no-click to anything else. */
	const LEAVE_ALONE = 'a, button, input, textarea, select, label, pre, code, kbd, summary, .controls, .progress, .slide-number, [data-no-click]';

	/* ---------- Footnote jumps and the way back ---------- */

	let returnTo = null;
	const backLink = document.createElement('button');
	backLink.type = 'button';
	backLink.className = 'ref-back';

	// The number the slide shows: the deck's own numbering when slideNumber is a
	// function (src/js/deck-controls.js), otherwise reveal.js's h.v
	function slideLabel(indices) {
		const number = Reveal.getConfig().slideNumber;
		const own = typeof number === 'function' && number(Reveal.getSlide(indices.h, indices.v))[0];
		return own || (indices.h + 1) + (indices.v ? '.' + (indices.v + 1) : '');
	}

	function clearTarget() {
		document.querySelectorAll('.entry-target').forEach(function (el) { el.classList.remove('entry-target'); });
		backLink.remove();
	}

	function jumpTo(entry) {
		returnTo = Reveal.getIndices();
		const at = Reveal.getIndices(entry.closest('section'));
		clearTarget();
		entry.classList.add('entry-target');
		backLink.textContent = '↩ Back to slide ' + slideLabel(returnTo);
		entry.appendChild(backLink);
		Reveal.slide(at.h, at.v);
	}

	function goBack() {
		if (!returnTo) return false;
		const to = returnTo;
		returnTo = null;
		clearTarget();
		Reveal.slide(to.h, to.v);
		return true;
	}

	backLink.addEventListener('click', goBack);

	Reveal.on('slidechanged', function (event) {
		hideTip();
		// Moving off the footnote slide some other way cancels the way back.
		if (returnTo && !event.currentSlide.querySelector('.entry-target')) {
			returnTo = null;
			clearTarget();
		}
	});

	function back() {
		if (!goBack()) Reveal.prev();
	}

	/* ---------- Mouse wheel ----------
	 * reveal.js's own handler (mouseWheel: true) allows one step per second and
	 * reads the old wheelDelta value, so a notch is often ignored.
	 * Here a wheel gesture moves one slide straight away. Events that follow
	 * within GESTURE_GAP_MS belong to the same gesture (a trackpad swipe or a
	 * free-spinning wheel), so they don't skip several slides. */
	const GESTURE_GAP_MS = 200;
	let lastWheelEvent = 0;

	window.addEventListener('wheel', function (event) {
		if (scrollView()) return;
		if (event.ctrlKey) return; // Ctrl + wheel is browser zoom
		if (event.target.closest && event.target.closest('[data-no-click]')) return; // e.g. scrolling a sidebar
		const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
		if (delta === 0) return;
		event.preventDefault();

		const now = Date.now();
		const newGesture = now - lastWheelEvent > GESTURE_GAP_MS;
		lastWheelEvent = now;
		if (!newGesture) return;

		if (delta > 0) Reveal.next();
		else back();
	}, { passive: false });

	/* ---------- Left click: next ----------
	 * Double and triple click are not used: telling them apart would delay
	 * every single click, and they are how you select a word or a line. */
	const tapZones = !!Reveal.getConfig().tapZones;

	deck.addEventListener('click', function (event) {
		if (event.button !== 0 || event.defaultPrevented) return;
		if (scrollView() || Reveal.isOverview()) return;
		if (event.target.closest(LEAVE_ALONE)) return;
		if (String(window.getSelection())) return; // the user was selecting text

		// A tap: left third back, right third on, the middle nothing
		if (tapZones && event.pointerType === 'touch') {
			const box = deck.getBoundingClientRect();
			const x = (event.clientX - box.left) / box.width;
			if (x < 1 / 3) back();
			else if (x > 2 / 3) Reveal.next();
			return;
		}

		if (event.altKey && event.shiftKey) Reveal.left();
		else if (event.altKey) Reveal.right();
		else if (event.shiftKey) back();
		else Reveal.next();
	});

	/* ---------- Right click: back ----------
	 * The context menu is switched off on the slides, but kept on links, code
	 * and selected text, where you may want to open or copy something. */
	deck.addEventListener('contextmenu', function (event) {
		if (scrollView() || Reveal.isOverview()) return;
		if (event.target.closest(LEAVE_ALONE)) return;
		if (String(window.getSelection())) return;
		event.preventDefault();
		back();
	});

	/* ---------- Middle click: next section ----------
	 * Pressing the wheel normally starts auto-scroll, so that is stopped first. */
	deck.addEventListener('mousedown', function (event) {
		if (event.button !== 1 || scrollView()) return;
		if (event.target.closest(LEAVE_ALONE)) return;
		event.preventDefault();
	});

	deck.addEventListener('auxclick', function (event) {
		if (event.button !== 1 || scrollView()) return;
		if (event.target.closest(LEAVE_ALONE)) return;
		event.preventDefault();
		Reveal.right();
	});

	/* ---------- Mouse back and forward buttons (button 3 and 4) ----------
	 * Chrome and Edge run the browser's back or forward on mouseup, and let a
	 * page cancel it, so here those buttons move one slide.
	 * Firefox does not pass these buttons to the page. There, history: true in
	 * Reveal.initialize gives each slide its own history entry, so the
	 * browser's back and forward step through the slides you have seen,
	 * including back from a footnote. */
	window.addEventListener('mouseup', function (event) {
		if (event.button !== 3 && event.button !== 4) return;
		if (scrollView()) return;
		event.preventDefault();
		if (event.button === 3) back();
		else Reveal.next();
	});

	/* ---------- Footnote markers: tooltip and jump ----------
	 * The entries come from the lists at the end of the deck, so there is one
	 * place to edit:
	 *   - data-n="4" on a reference, matched by <a class="ref"><sup>4</sup></a>
	 *   - data-m="2" on a media item, matched by <a class="ref media"><sup>2</sup></a>
	 *   - data-cite="Noe, 2023" on a reference: the short citation, added
	 *     after the marker in the print version
	 *   - ol.links lists, numbered from their --start value (the FYP deck) */
	const entries = {};
	const tips = {};

	function addEntry(key, element) {
		entries[key] = element;
		tips[key] = element.textContent.replace(/\s+/g, ' ').trim();
	}

	document.querySelectorAll('[data-n]').forEach(function (el) { addEntry('n' + el.dataset.n, el); });
	document.querySelectorAll('[data-m]').forEach(function (el) { addEntry('m' + el.dataset.m, el); });
	document.querySelectorAll('ol.links').forEach(function (list) {
		const start = parseInt(getComputedStyle(list).getPropertyValue('--start'), 10) || 0;
		Array.from(list.children).forEach(function (item, i) { addEntry('n' + (start + i + 1), item); });
	});

	function keyOf(link) {
		const sup = link.querySelector('sup');
		return (link.classList.contains('media') ? 'm' : 'n') + (sup ? sup.textContent.trim() : '');
	}

	const tip = document.createElement('div');
	tip.id = 'ref-tip';
	tip.setAttribute('role', 'tooltip');
	document.body.appendChild(tip);

	function showTip(link) {
		const text = link.dataset.tip || tips[keyOf(link)];
		if (!text) return;

		tip.textContent = text;
		tip.style.fontSize = Math.max(16, 27 * Reveal.getScale()) + 'px';
		tip.classList.add('visible');

		const margin = 8;
		const box = link.getBoundingClientRect();
		const width = tip.offsetWidth;
		const height = tip.offsetHeight;
		const left = Math.min(Math.max(margin, box.left + box.width / 2 - width / 2), window.innerWidth - width - margin);
		const above = box.top - height - margin;
		tip.style.left = left + 'px';
		tip.style.top = (above >= margin ? above : box.bottom + margin) + 'px';
	}

	function hideTip() {
		tip.classList.remove('visible');
	}

	document.querySelectorAll('a.ref').forEach(function (link) {
		const entry = entries[keyOf(link)];
		if (entry && entry.dataset.cite) link.dataset.cite = entry.dataset.cite;

		link.addEventListener('mouseenter', function () { showTip(link); });
		link.addEventListener('focus', function () { showTip(link); });
		link.addEventListener('mouseleave', hideTip);
		link.addEventListener('blur', hideTip);
		link.addEventListener('click', function (event) {
			if (!entry || entry.contains(link)) return; // no list entry: follow the link
			event.preventDefault();
			hideTip();
			jumpTo(entry);
		});
	});

	/* Any other element with data-tip="..." shows that text on hover,
	 * e.g. a name or an email icon. These are not references, so no jump. */
	document.querySelectorAll('[data-tip]:not(a.ref)').forEach(function (el) {
		el.addEventListener('mouseenter', function () { showTip(el); });
		el.addEventListener('focus', function () { showTip(el); });
		el.addEventListener('mouseleave', hideTip);
		el.addEventListener('blur', hideTip);
	});

	/* ---------- Copy icon on code boxes ----------
	 * reveal.js core has no copy button (there is a third-party
	 * reveal.js-copycode plugin), so each <pre> gets a small one here,
	 * an icon only, like GitHub. It copies the <code> text. The clipboard
	 * API needs https, localhost or a file; anywhere else it falls back to
	 * a hidden copy, and failing that selects the text for Ctrl+C. */
	function hiddenCopy(text) {
		const area = document.createElement('textarea');
		area.value = text;
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.appendChild(area);
		area.select();
		const ok = document.execCommand('copy');
		area.remove();
		return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
	}

	function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) {
			return navigator.clipboard.writeText(text).catch(function () { return hiddenCopy(text); });
		}
		return hiddenCopy(text);
	}

	function label(button, text) {
		button.title = text;
		button.setAttribute('aria-label', text);
	}

	document.querySelectorAll('.reveal pre').forEach(function (pre) {
		const source = pre.querySelector('code') || pre;
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'copy-button';
		label(button, 'Copy');
		button.addEventListener('click', function () {
			copyText(source.innerText.trim()).then(function () {
				// The icon turns into a tick for a moment
				button.classList.add('copied');
				label(button, 'Copied');
				setTimeout(function () {
					button.classList.remove('copied');
					label(button, 'Copy');
				}, 1800);
			}, function () {
				// Copying was blocked: select the text so Ctrl+C works
				const range = document.createRange();
				range.selectNodeContents(source);
				window.getSelection().removeAllRanges();
				window.getSelection().addRange(range);
				label(button, 'Press Ctrl+C to copy');
			});
		});
		pre.classList.add('has-copy');
		pre.appendChild(button);
	});

	/* ---------- Position bar inside a vertical stack ----------
	 * Under the first heading of each slide in a stack, one bar per slide,
	 * the gold one marking where you are. With stackBarLinks: true in
	 * Reveal.initialize, each grey bar is a button to that slide, with its
	 * heading as a tooltip. Slides that are not in a stack keep the single
	 * gold bar. */
	const barLinks = !!Reveal.getConfig().stackBarLinks;

	function slideHeading(slide) {
		const heading = slide.querySelector('h1, h2, h3');
		return heading ? heading.textContent.trim() : '';
	}

	function addStackBars(stack) {
		const slides = Array.from(stack.children).filter(function (el) { return el.tagName === 'SECTION'; });
		if (slides.length < 2) return;

		slides.forEach(function (slide, index) {
			const heading = slide.querySelector('h1, h2');
			if (!heading) return;
			const bar = document.createElement('div');
			bar.className = 'stack-bar';
			bar.setAttribute('aria-label', 'Slide ' + (index + 1) + ' of ' + slides.length + ' in this section');
			slides.forEach(function (target, i) {
				const piece = document.createElement(i === index || !barLinks ? 'span' : 'button');
				if (i === index) {
					piece.className = 'on';
				} else if (barLinks) {
					piece.type = 'button';
					piece.dataset.tip = slideHeading(target);
					piece.setAttribute('aria-label', 'Go to ' + slideHeading(target));
					piece.addEventListener('mouseenter', function () { showTip(piece); });
					piece.addEventListener('focus', function () { showTip(piece); });
					piece.addEventListener('mouseleave', hideTip);
					piece.addEventListener('blur', hideTip);
					piece.addEventListener('click', function (event) {
						event.stopPropagation();
						// Found when clicked: slides added later move the stack along
						const h = Array.from(document.querySelectorAll('.reveal .slides > section')).indexOf(stack);
						Reveal.slide(h, i);
					});
				}
				bar.appendChild(piece);
			});
			heading.classList.add('has-stack-bar');
			heading.insertAdjacentElement('afterend', bar);
		});
	}

	document.querySelectorAll('.reveal .slides > section').forEach(addStackBars);

	// src/js/deck-controls.js rebuilds the contents when the screen turns
	document.addEventListener('deck:stack-rebuilt', function (event) {
		addStackBars(event.detail);
		Reveal.layout();
	});

	Reveal.layout();
})();
