/*********************************************************
 * Deck controls for reveal.js decks:
 *   - Bottom left: slide list (the sidebar), home (the first slide) and
 *     contents (the thumbnail slides)
 *   - Top right, reveal.js's own features: blackout, all slides (overview)
 *     and full screen
 *   - Sidebar: every slide as a tree, vertical slides under their stack.
 *     It stays open beside the slides until closed, on the left or right
 *   - Contents slides, made automatically: a vertical stack of thumbnail
 *     grids, like PowerPoint's Summary Zoom
 *   - Type a slide number and press Enter to go there (4, 40, or 4.2)
 * None of it prints.
 *
 * Load after Reveal.initialize has finished (the slides must exist), and
 * before scripts that decorate slides (src/js/deck.js), so they see the
 * contents slides too. Settings, all optional, in Reveal.initialize:
 *   deckControls: {
 *     contents: true,        // make the contents slides
 *     contentsPerSlide: 9,   // thumbnails on each contents slide
 *     contentsTitle: 'Contents',
 *     contentsAfter: 0,      // put them after this slide (0 = the title slide)
 *     sidebar: true,
 *     sidebarSide: 'left',   // or 'right'; the viewer can switch, and it is remembered
 *     sidebarWidth: 340,     // pixels
 *   }
 *********************************************************/
(function () {
	'use strict';

	const settings = Object.assign({
		contents: true,
		contentsPerSlide: 9,
		contentsTitle: 'Contents',
		contentsAfter: 0,
		sidebar: true,
		sidebarSide: 'left',
		sidebarWidth: 340,
	}, Reveal.getConfig().deckControls || {});

	const printing = /print-pdf/i.test(window.location.search);

	function store(name, value) {
		try {
			if (value === undefined) return localStorage.getItem('deck-' + name);
			localStorage.setItem('deck-' + name, value);
		} catch (e) { /* private window or blocked storage */ }
		return null;
	}

	function topSlides() {
		return Array.from(document.querySelectorAll('.reveal .slides > section'));
	}

	function firstOf(slide) {
		return slide.querySelector(':scope > section') || slide;
	}

	function titleOf(slide) {
		const heading = slide.querySelector('h1, h2, h3');
		return heading ? heading.textContent.trim() : '';
	}

	// A scene line ("**Scene: ...**") adds to the title in the sidebar's tooltip
	function sceneOf(slide) {
		const scene = slide.querySelector(':scope > p.scene');
		return scene ? scene.textContent.replace(/^Scene:\s*/, '').trim() : '';
	}

	function goTo(slide, v) {
		Reveal.slide(topSlides().indexOf(slide), v || 0);
	}

	/* ---------- Contents slides ----------
	 * One thumbnail for each horizontal slide (a vertical stack shows its first
	 * slide). The thumbnail is a scaled-down copy of the slide itself, so it
	 * always matches. The pages form one vertical stack: 2, 2.2, 2.3 ... */
	let contentsStack = null;

	// A <div>, not a <section>, so reveal.js and the sidebar don't count it as a slide
	function makeThumbnail(slide) {
		const original = firstOf(slide);
		const copy = document.createElement('div');
		copy.innerHTML = original.innerHTML;
		copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
		copy.querySelectorAll('.stack-bar, .ref-back, aside.notes').forEach(el => el.remove());
		copy.className = 'deck-thumb-slide ' + original.className.replace(/\b(present|past|future|stack)\b/g, '');
		copy.setAttribute('aria-hidden', 'true');
		return copy;
	}

	function buildContents() {
		const slides = topSlides();
		const perSlide = Math.max(1, settings.contentsPerSlide);
		const pages = Math.ceil(slides.length / perSlide);
		const config = Reveal.getConfig();

		// Size the thumbnails so a full grid fits under the heading
		const columns = Math.ceil(Math.sqrt(perSlide));
		const rows = Math.ceil(perSlide / columns);
		const GAP_X = 24, GAP_Y = 14, CAPTION = 30, HEADING = 170;
		const ratio = config.height / config.width;
		const byWidth = (config.width * 0.92 - (columns - 1) * GAP_X) / columns;
		const byHeight = (config.height - HEADING - (rows - 1) * GAP_Y - rows * CAPTION) / rows / ratio;
		const thumbWidth = Math.floor(Math.min(byWidth, byHeight));

		contentsStack = document.createElement('section');
		contentsStack.className = 'deck-contents-stack';

		for (let page = 0; page < pages; page++) {
			const section = document.createElement('section');
			section.className = 'deck-contents';
			if (page === 0) section.id = 'contents';

			const heading = document.createElement('h2');
			heading.textContent = settings.contentsTitle + (pages > 1 ? ' (' + (page + 1) + ' of ' + pages + ')' : '');
			section.appendChild(heading);

			const grid = document.createElement('ol');
			grid.className = 'deck-thumbs';
			grid.style.gridTemplateColumns = 'repeat(' + columns + ', ' + thumbWidth + 'px)';
			grid.style.setProperty('--thumb-scale', thumbWidth / config.width);
			grid.style.setProperty('--gap-x', GAP_X + 'px');
			grid.style.setProperty('--gap-y', GAP_Y + 'px');

			slides.slice(page * perSlide, (page + 1) * perSlide).forEach(function (slide) {
				const item = document.createElement('li');
				const link = document.createElement('a');
				link.href = '#';
				link.className = 'deck-thumb';
				link.title = titleOf(firstOf(slide));
				link.addEventListener('click', function (event) {
					event.preventDefault();
					event.stopPropagation();
					goTo(slide);
				});

				const frame = document.createElement('span');
				frame.className = 'deck-thumb-frame';
				frame.style.aspectRatio = config.width + ' / ' + config.height;
				frame.style.setProperty('--slide-width', config.width + 'px');
				frame.style.setProperty('--slide-height', config.height + 'px');
				frame.appendChild(makeThumbnail(slide));
				link.appendChild(frame);

				const caption = document.createElement('span');
				caption.className = 'deck-thumb-title';
				caption.textContent = titleOf(firstOf(slide));
				link.appendChild(caption);

				item.appendChild(link);
				grid.appendChild(item);
			});

			section.appendChild(grid);
			contentsStack.appendChild(section);
		}

		const after = slides[settings.contentsAfter];
		if (after) after.after(contentsStack);
		else document.querySelector('.reveal .slides').prepend(contentsStack);
		Reveal.sync();
		// reveal.js read the address (#/4/2) before the contents went in, so
		// read it again now that the slide numbers include them
		goToAddress();
	}

	// reveal.js drops an address it can't find yet, such as #/contents, so a
	// deck can note it before Reveal.initialize: window.deckStartHash = location.hash
	function goToAddress() {
		const start = window.deckStartHash || window.location.hash;
		window.deckStartHash = null;
		const hash = decodeURIComponent(start.replace(/^#\/?/, ''));
		const numbers = hash.match(/^(\d+)(?:\/(\d+))?/);
		if (numbers) {
			Reveal.slide(parseInt(numbers[1], 10), parseInt(numbers[2] || '0', 10));
			return;
		}
		const target = hash && document.getElementById(hash.split('/')[0]);
		if (!target) {
			Reveal.slide(Reveal.getIndices().h, Reveal.getIndices().v || 0);
			return;
		}
		const top = target.parentElement.matches('.slides') ? target : target.parentElement;
		const v = Array.from(top.children).filter(el => el.tagName === 'SECTION').indexOf(target);
		Reveal.slide(topSlides().indexOf(top), Math.max(v, 0));
	}

	/* ---------- Sidebar ----------
	 * A tree of every slide, numbered as reveal.js numbers them (5, or 5.2 in
	 * a stack), with a triangle to open and close each stack. Long titles are
	 * cut off; the tooltip shows the whole title. The current slide is marked
	 * and kept in view. While open it sits beside the slides, which shrink to
	 * fit, rather than over them. */
	let sidebar = null, sidebarList = null;

	function slideNumber(h, v, inStack) {
		return inStack ? (h + 1) + '.' + (v + 1) : String(h + 1);
	}

	function sidebarItem(slide, h, v, inStack) {
		const link = document.createElement('a');
		link.href = '#';
		link.className = 'deck-sidebar-link';
		link.dataset.h = h;
		link.dataset.v = v;
		const number = slideNumber(h, v, inStack);
		const title = titleOf(slide) || 'Slide ' + number;
		const scene = sceneOf(slide);
		link.title = number + ' – ' + title + (scene ? ' – ' + scene : '');

		const num = document.createElement('span');
		num.className = 'deck-sidebar-number';
		num.textContent = number;
		const text = document.createElement('span');
		text.className = 'deck-sidebar-title';
		text.textContent = title + (scene ? ' · ' + scene : '');
		link.append(num, ' – ', text);

		link.addEventListener('click', function (event) {
			event.preventDefault();
			Reveal.slide(h, v);
		});
		return link;
	}

	function buildSidebarList() {
		const list = document.createElement('ol');
		list.className = 'deck-sidebar-tree';
		topSlides().forEach(function (top, h) {
			const item = document.createElement('li');
			const children = Array.from(top.children).filter(el => el.tagName === 'SECTION');
			if (children.length < 2) {
				item.appendChild(sidebarItem(firstOf(top), h, 0, false));
			} else {
				const group = document.createElement('details');
				const summary = document.createElement('summary');
				summary.appendChild(sidebarItem(children[0], h, 0, true));
				group.appendChild(summary);
				const sub = document.createElement('ol');
				children.slice(1).forEach(function (child, i) {
					const subItem = document.createElement('li');
					subItem.appendChild(sidebarItem(child, h, i + 1, true));
					sub.appendChild(subItem);
				});
				group.appendChild(sub);
				item.appendChild(group);
			}
			list.appendChild(item);
		});
		return list;
	}

	function markCurrent() {
		if (!sidebar) return;
		const at = Reveal.getIndices();
		sidebar.querySelectorAll('.deck-sidebar-link.current').forEach(el => el.classList.remove('current'));
		const link = sidebar.querySelector('.deck-sidebar-link[data-h="' + at.h + '"][data-v="' + (at.v || 0) + '"]');
		if (!link) return;
		link.classList.add('current');
		const group = link.closest('details');
		if (group) group.open = true;
		if (sidebarOpen()) link.scrollIntoView({ block: 'nearest' });
	}

	function sidebarOpen() {
		return document.body.classList.contains('deck-sidebar-open');
	}

	function setSidebar(open) {
		document.body.classList.toggle('deck-sidebar-open', open);
		store('sidebar-open', open ? 'yes' : 'no');
		Reveal.layout();
		if (open) markCurrent();
	}

	function setSide(side) {
		document.body.classList.remove('deck-sidebar-left', 'deck-sidebar-right');
		document.body.classList.add('deck-sidebar-' + side);
		store('sidebar-side', side);
		Reveal.layout();
	}

	function buildSidebar() {
		sidebar = document.createElement('nav');
		sidebar.className = 'deck-sidebar';
		sidebar.setAttribute('aria-label', 'Slides');
		sidebar.setAttribute('data-no-click', '');
		document.documentElement.style.setProperty('--deck-sidebar-width', settings.sidebarWidth + 'px');

		const toolbar = document.createElement('div');
		toolbar.className = 'deck-sidebar-toolbar';
		toolbar.append(
			button('expand', 'Open all sections', function () {
				sidebar.querySelectorAll('details').forEach(d => { d.open = true; });
			}),
			button('collapse', 'Close all sections', function () {
				sidebar.querySelectorAll('details').forEach(d => { d.open = false; });
				markCurrent();
			}),
			button('side', 'Move the slide list to the other side', function () {
				setSide(document.body.classList.contains('deck-sidebar-left') ? 'right' : 'left');
			}),
			button('close', 'Close the slide list', function () { setSidebar(false); })
		);
		sidebar.appendChild(toolbar);

		sidebarList = buildSidebarList();
		sidebar.appendChild(sidebarList);
		document.body.appendChild(sidebar);

		setSide(store('sidebar-side') || settings.sidebarSide);
		Reveal.on('slidechanged', markCurrent);
		markCurrent();
		if (store('sidebar-open') === 'yes') setSidebar(true);
	}

	/* ---------- Buttons ---------- */
	function button(name, label, action) {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = 'deck-button deck-' + name;
		el.setAttribute('aria-label', label);
		el.title = label;
		el.addEventListener('click', function (event) {
			event.stopPropagation(); // not a click on the slide
			action(el);
		});
		return el;
	}

	function dock(position, buttons) {
		const box = document.createElement('div');
		box.className = 'deck-dock deck-dock-' + position;
		box.setAttribute('data-no-click', '');
		buttons.forEach(b => b && box.appendChild(b));
		document.body.appendChild(box);
		return box;
	}

	// Full screen. Esc also leaves full screen; the button follows either way.
	function fullScreenOn() {
		return !!(document.fullscreenElement || document.webkitFullscreenElement);
	}

	function toggleFullScreen() {
		const page = document.documentElement;
		if (fullScreenOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
		else (page.requestFullscreen || page.webkitRequestFullscreen).call(page);
	}

	const canFullScreen = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
	const fullScreenButton = canFullScreen ? button('fullscreen', 'Full screen (F)', toggleFullScreen) : null;

	function showFullScreenState() {
		if (!fullScreenButton) return;
		const on = fullScreenOn();
		fullScreenButton.classList.toggle('on', on);
		fullScreenButton.title = on ? 'Exit full screen (Esc)' : 'Full screen (F)';
		fullScreenButton.setAttribute('aria-label', fullScreenButton.title);
	}
	document.addEventListener('fullscreenchange', showFullScreenState);
	document.addEventListener('webkitfullscreenchange', showFullScreenState);

	// Blackout: reveal.js's pause (the B, . or / key). The button stays above
	// the black screen, so a click brings the slides back.
	const blackoutButton = button('blackout', 'Blackout (B)', () => Reveal.togglePause());
	Reveal.on('paused', () => blackoutButton.classList.add('on'));
	Reveal.on('resumed', () => blackoutButton.classList.remove('on'));

	function goHome() {
		if (Reveal.isOverview()) Reveal.toggleOverview(false);
		Reveal.slide(0, 0);
	}

	function goContents() {
		if (Reveal.isOverview()) Reveal.toggleOverview(false);
		if (contentsStack) goTo(contentsStack, 0);
	}

	/* ---------- Type a slide number, then Enter ----------
	 * 4 then Enter goes to slide 4; 40 goes to slide 40, or the last slide if
	 * there are fewer. 4.2 goes to the second slide of stack 4. Backspace
	 * corrects, Esc cancels. */
	let typed = '', typedTimer = null;
	const typedBox = document.createElement('div');
	typedBox.className = 'deck-typed';
	typedBox.setAttribute('aria-live', 'polite');
	typedBox.setAttribute('data-no-click', '');

	function showTyped() {
		typedBox.textContent = typed ? 'Go to slide ' + typed + ' ↵' : '';
		typedBox.classList.toggle('on', !!typed);
		clearTimeout(typedTimer);
		if (typed) typedTimer = setTimeout(function () { typed = ''; showTyped(); }, 4000);
	}

	function jumpToTyped() {
		const parts = typed.split('.');
		const slides = topSlides();
		const h = Math.min(Math.max(parseInt(parts[0], 10) - 1, 0), slides.length - 1);
		let v = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
		const stackSize = Array.from(slides[h].children).filter(el => el.tagName === 'SECTION').length;
		v = Math.min(Math.max(v || 0, 0), Math.max(stackSize - 1, 0));
		Reveal.slide(h, v);
	}

	// Capture phase, so the "." in 4.2 doesn't reach reveal.js as the pause key
	window.addEventListener('keydown', function (event) {
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.target.closest && event.target.closest('input, textarea, select, [contenteditable]')) return;
		const key = event.key;
		if (/^[0-9]$/.test(key)) {
			typed += key;
		} else if (key === '.' && typed && typed.indexOf('.') < 0) {
			typed += '.';
		} else if (key === 'Backspace' && typed) {
			typed = typed.slice(0, -1);
		} else if (key === 'Escape' && typed) {
			typed = '';
		} else if (key === 'Enter' && /\d/.test(typed)) {
			jumpToTyped();
			typed = '';
		} else {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		showTyped();
	}, true);

	/* ---------- Start ---------- */
	if (settings.contents) buildContents();

	if (!printing) {
		if (settings.sidebar) buildSidebar();
		dock('bottom-left', [
			sidebar ? button('menu', 'Slide list', () => setSidebar(!sidebarOpen())) : null,
			button('home', 'First slide (Home)', goHome),
			contentsStack ? button('toc', 'Contents', goContents) : null,
		]);
		dock('top-right', [
			blackoutButton,
			button('overview', 'All slides (Esc or O)', () => Reveal.toggleOverview()),
			fullScreenButton,
		]);
		document.body.appendChild(typedBox);
		showFullScreenState();
	}
})();
