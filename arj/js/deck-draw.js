/*********************************************************
 * Drawing button for TAP Reveal: opens and closes tldreveal's drawing
 * mode (tldraw on the slides). deck-start.js loads tldreveal; this adds
 * a pen button to the top right buttons (deck-controls.js), after the lock.
 *
 *   Pen button, or D     open drawing: tldraw's tools appear and the
 *                        mouse draws, writes and moves shapes
 *   Pen button again,    close it: the tools go, the drawings stay on
 *   or Esc               their slides, and the mouse is back to the slides
 *   V                    hide or show the drawings (tldreveal's own key)
 *
 * Each slide keeps its own drawings, so they come back with the slide.
 * While drawing, deck.js leaves the mouse alone (body.arj-drawing) and
 * the lock doesn't matter. The button only appears when tldreveal has
 * loaded: not with draw: false, not offline, not in the print version.
 * Load after deck-controls.js and deck.js.
 *********************************************************/
(function () {
	'use strict';

	if (!Reveal.hasPlugin || !Reveal.hasPlugin('tldreveal')) return;

	const deck = Reveal.getRevealElement();
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'deck-button deck-draw';

	function overlay() {
		return deck.querySelector('.tldreveal');
	}

	function isDrawing() {
		const box = overlay();
		return !!box && !box.classList.contains('tldreveal-inactive') && !box.classList.contains('tldreveal-hidden');
	}

	function show() {
		const on = isDrawing();
		document.body.classList.toggle('arj-drawing', on);
		button.classList.toggle('on', on);
		button.title = on ? 'Close drawing (Esc)' : 'Draw on the slides (D)';
		button.setAttribute('aria-label', button.title);
		button.setAttribute('aria-pressed', String(on));
	}

	// tldreveal has no API for this, only its keys: D opens (a reveal.js key
	// binding), Esc closes (its own listener on the window)
	function open() {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', keyCode: 68, which: 68, bubbles: true }));
	}

	function close() {
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
	}

	button.addEventListener('click', function (event) {
		event.stopPropagation();
		if (isDrawing()) close();
		else open();
	});

	// tldreveal adds its overlay when reveal.js is ready; follow its classes
	function watch() {
		const box = overlay();
		if (!box) return false;
		new MutationObserver(show).observe(box, { attributes: true, attributeFilter: ['class'] });
		show();
		return true;
	}
	if (!watch()) {
		const wait = new MutationObserver(function () { if (watch()) wait.disconnect(); });
		wait.observe(deck, { childList: true });
	}

	const dock = document.querySelector('.deck-dock-top-right');
	const lock = dock && dock.querySelector('.deck-lock');
	if (dock) dock.insertBefore(button, lock ? lock.nextSibling : dock.firstChild);
	show();
})();
