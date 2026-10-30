/*********************************************************
 * Deck controls for reveal.js decks:
 *   - Bottom left: slide list (the sidebar), home (the first slide) and
 *     contents (the thumbnail slides)
 *   - Top right, reveal.js's own features: blackout, all slides (overview)
 *     and full screen
 *   - Sidebar: every slide as a tree, vertical slides under their stack.
 *     It stays open beside the slides until closed, on the left or right.
 *     On a narrow screen (a phone upright) it covers the slides instead
 *   - Contents slides, made automatically: a vertical stack of thumbnail
 *     grids, like PowerPoint's Summary Zoom. Fewer, bigger thumbnails
 *     when the screen is upright (portrait)
 *   - Numbering: sections 1, 2, 3 and the slides under them 2.1, 2.2
 *     (or one count, 1, 2, 3 ... through the whole deck), shown in the
 *     sidebar, the contents, the slide number and, if set, on the slide
 *     beside its heading. Type a number and press Enter to go there
 *     (4, 40 or 4.2)
 * None of it prints.
 *
 * Numbering, with HTML comments in a slide (in Markdown, under its heading):
 *   <!-- no-number -->   leave this slide out of the numbering
 *   <!-- no-list -->     leave it out of the sidebar and contents too
 *   <!-- number -->      number it even when autoNumber is false
 * The first slide (home) and the contents are never numbered. Every other
 * slide is numbered unless marked (autoNumber: true), or only the marked
 * ones are (autoNumber: false). A number typed into a heading ("1. Topic")
 * is dropped from the sidebar and contents, as the deck numbers them.
 *
 * Load after Reveal.initialize has finished (the slides must exist), and
 * before scripts that decorate slides (src/js/deck.js), so they see the
 * contents slides too. Settings, all optional, in Reveal.initialize:
 *   deckControls: {
 *     contents: true,              // make the contents slides
 *     contentsColumns: 3,          // thumbnails across each contents slide
 *     contentsRows: 3,             // ... and down
 *     contentsColumnsPortrait: 2,  // the same when the screen is upright
 *     contentsRowsPortrait: 2,
 *     contentsCaptions: true,      // the title under each thumbnail (it's also in the thumbnail)
 *     contentsTitle: 'Contents',
 *     contentsPageCount: true,     // "Contents (1 of 3)", or just "Contents" on every page
 *     contentsAfter: 0,            // put them after this slide (0 = the title slide)
 *     sidebar: true,
 *     sidebarSide: 'left',         // or 'right'; the viewer can switch, and it is remembered
 *     sidebarWidth: 340,           // pixels
 *     numbering: true,             // number the slides at all
 *     autoNumber: true,            // number every slide not marked <!-- no-number -->
 *     numberFormat: 'multilevel',  // 5, 5.1, 5.2 (a section and the slides under
 *                                  // it), or 'flat': 1, 2, 3 ... through the deck
 *     numberHeadings: false,       // also show the number on the slide itself:
 *                                  // 'bullet' "(5)" at the left of the heading line,
 *                                  // the title still centred; 'corner' in a circle
 *                                  // in the top left; true for "5 – " before it
 *     numberHeadingLevels: ['h1', 'h2'], // which headings show it: a slide's first
 *                                  // heading must be one of these. ['h1'] numbers
 *                                  // only section slides in a Markdown deck;
 *                                  // add 'h3' for decks that use h3 under h2
 *   }
 *********************************************************/
(function () {
	'use strict';

	const settings = Object.assign({
		contents: true,
		contentsColumns: 3,
		contentsRows: 3,
		contentsColumnsPortrait: 2,
		contentsRowsPortrait: 2,
		contentsCaptions: true,
		contentsTitle: 'Contents',
		contentsPageCount: true,
		contentsAfter: 0,
		sidebar: true,
		sidebarSide: 'left',
		sidebarWidth: 340,
		numbering: true,
		autoNumber: true,
		numberFormat: 'multilevel',
		numberHeadings: false,
		numberHeadingLevels: ['h1', 'h2'],
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

	function childSlides(top) {
		return Array.from(top.children).filter(el => el.tagName === 'SECTION');
	}

	function firstOf(slide) {
		return slide.querySelector(':scope > section') || slide;
	}

	function portrait() {
		return window.innerHeight > window.innerWidth;
	}

	/* ---------- Numbering ---------- */
	const numbers = new Map(); // slide -> "2" or "2.1", or "" when not numbered

	// The marks in a slide: <!-- no-number -->, <!-- no-list -->, <!-- number -->
	function marksOf(slide) {
		const marks = new Set();
		slide.childNodes.forEach(function (node) {
			if (node.nodeType !== Node.COMMENT_NODE) return;
			const mark = node.textContent.trim().toLowerCase();
			if (mark === 'no-number' || mark === 'no-list' || mark === 'number') marks.add(mark);
		});
		return marks;
	}

	function listed(slide) {
		return !marksOf(slide).has('no-list');
	}

	function counted(slide, isHome) {
		const marks = marksOf(slide);
		if (marks.has('no-list') || marks.has('no-number')) return false;
		if (marks.has('number')) return true;
		return settings.autoNumber && !isHome;
	}

	function numberSlides() {
		numbers.clear();
		if (!settings.numbering) return;
		const flat = settings.numberFormat === 'flat';
		let section = 0, count = 0;
		topSlides().forEach(function (top, h) {
			if (top.classList.contains('deck-contents-stack')) return;
			const slides = childSlides(top);
			const first = firstOf(top);
			const isCounted = counted(first, h === 0);
			if (flat) {
				numbers.set(first, isCounted ? String(++count) : '');
				slides.slice(1).forEach(function (slide) {
					numbers.set(slide, counted(slide, false) ? String(++count) : '');
				});
				return;
			}
			const label = isCounted ? String(++section) : '';
			numbers.set(first, label);
			let sub = 0;
			slides.slice(1).forEach(function (slide) {
				numbers.set(slide, label && counted(slide, false) ? label + '.' + (++sub) : '');
			});
		});
	}

	// Every slide, in deck order: each stack's slides, or the slide itself
	function allSlides() {
		return topSlides().flatMap(top => childSlides(top).length ? childSlides(top) : [top]);
	}

	function numberOf(slide) {
		return numbers.get(slide) || '';
	}

	// The heading, without a number typed into it ("1. Topic" or "1 – Topic")
	function titleOf(slide) {
		const heading = slide.querySelector('h1, h2, h3');
		if (!heading) return '';
		const copy = heading.cloneNode(true);
		copy.querySelectorAll('.heading-number, .stack-bar').forEach(el => el.remove());
		return copy.textContent.trim().replace(/^\d+(\.\d+)*\s*[.)–-]\s+/, '');
	}

	function labelled(slide) {
		const number = numberOf(slide);
		const title = titleOf(slide);
		return number ? number + ' – ' + title : title;
	}

	// The slide's number on the slide itself (numberHeadings), for slides whose
	// first heading is one of numberHeadingLevels:
	//   'bullet'  "(5.1)" at the left of the heading line, like a numbered
	//             bullet; the title stays centred (src/css/memes.css)
	//   'corner'  in a circle in the top left corner of the slide
	//   true      "5.1 – " before the heading
	function numberHeadings() {
		const style = settings.numberHeadings;
		if (!style) return;
		const levels = settings.numberHeadingLevels.map(l => l.toUpperCase());
		allSlides().forEach(function (first) {
			if (first.closest('.deck-contents-stack')) return;
			const number = numberOf(first);
			const heading = first.querySelector('h1, h2, h3, h4, h5, h6');
			if (!number || !heading || levels.indexOf(heading.tagName) < 0) return;
			if (first.querySelector('.heading-number')) return;
			heading.innerHTML = heading.innerHTML.replace(/^\s*\d+(\.\d+)*\s*[.)–-]\s+/, '');
			const span = document.createElement('span');
			if (style === 'bullet') {
				span.className = 'heading-number bullet';
				span.textContent = '(' + number + ')';
				const title = document.createElement('span');
				title.className = 'heading-title';
				title.append(...heading.childNodes);
				heading.append(span, title);
				heading.classList.add('has-heading-number');
				heading.dataset.number = span.textContent; // keeps the title centred
			} else if (style === 'corner') {
				span.className = 'heading-number corner';
				span.textContent = number;
				first.prepend(span);
			} else {
				span.className = 'heading-number';
				span.textContent = number + ' – ';
				heading.prepend(span);
			}
		});
	}

	// The slide number, bottom of the screen, follows the same numbering
	function useNumbersForSlideNumber() {
		if (!settings.numbering || !Reveal.getConfig().slideNumber) return;
		Reveal.configure({ slideNumber: slide => [numberOf(slide)] });
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
	 * One thumbnail for each horizontal slide after the contents (a vertical
	 * stack shows its first slide). The thumbnail is a scaled-down copy of the
	 * slide itself, so it always matches. The pages form one vertical stack.
	 * Turning a phone or tablet rebuilds them, with fewer per page upright. */
	let contentsStack = null, contentsGrid = '';

	// Columns and rows for the screen as it is now
	function gridNow() {
		const up = portrait();
		return {
			columns: Math.max(1, up ? settings.contentsColumnsPortrait : settings.contentsColumns),
			rows: Math.max(1, up ? settings.contentsRowsPortrait : settings.contentsRows),
		};
	}

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
		const all = topSlides();
		const after = all[settings.contentsAfter];
		const slides = all.slice(settings.contentsAfter + 1).filter(top => listed(firstOf(top)));
		const { columns, rows } = gridNow();
		const perSlide = columns * rows;
		const pages = Math.ceil(slides.length / perSlide);
		const config = Reveal.getConfig();
		contentsGrid = columns + 'x' + rows;

		// Size the thumbnails so a full grid fits under the heading
		const GAP_X = 24, GAP_Y = 14, HEADING = 170;
		const CAPTION = settings.contentsCaptions ? 30 : 0;
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
			const count = settings.contentsPageCount && pages > 1 ? ' (' + (page + 1) + ' of ' + pages + ')' : '';
			heading.textContent = settings.contentsTitle + count;
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
				link.title = labelled(firstOf(slide));
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

				if (settings.contentsCaptions) {
					const caption = document.createElement('span');
					caption.className = 'deck-thumb-title';
					caption.textContent = labelled(firstOf(slide));
					link.appendChild(caption);
				}

				item.appendChild(link);
				grid.appendChild(item);
			});

			section.appendChild(grid);
			contentsStack.appendChild(section);
		}

		if (after) after.after(contentsStack);
		else document.querySelector('.reveal .slides').prepend(contentsStack);
		Reveal.sync();
	}

	// Turned the screen: rebuild the contents if the number per page changes
	function rebuildContents() {
		if (!contentsStack || printing) return;
		const { columns, rows } = gridNow();
		if (columns + 'x' + rows === contentsGrid) return;
		const at = Reveal.getIndices();
		const onContents = Reveal.getCurrentSlide().closest('.deck-contents-stack') === contentsStack;
		contentsStack.remove();
		buildContents();
		if (onContents) goTo(contentsStack, 0);
		else Reveal.slide(at.h, at.v || 0);
		if (sidebar) {
			const list = buildSidebarList();
			sidebarList.replaceWith(list);
			sidebarList = list;
			markCurrent();
		}
		// src/js/deck.js adds the position bars to the new pages
		document.dispatchEvent(new CustomEvent('deck:stack-rebuilt', { detail: contentsStack }));
	}

	let resizeTimer = null;
	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(rebuildContents, 250);
	});

	// reveal.js drops an address it can't find yet, such as #/contents, so a
	// deck can note it before Reveal.initialize: window.deckStartHash = location.hash
	function goToAddress() {
		const start = window.deckStartHash || window.location.hash;
		window.deckStartHash = null;
		const hash = decodeURIComponent(start.replace(/^#\/?/, ''));
		const indices = hash.match(/^(\d+)(?:\/(\d+))?/);
		if (indices) {
			Reveal.slide(parseInt(indices[1], 10), parseInt(indices[2] || '0', 10));
			return;
		}
		const target = hash && document.getElementById(hash.split('/')[0]);
		if (!target) {
			Reveal.slide(Reveal.getIndices().h, Reveal.getIndices().v || 0);
			return;
		}
		const top = target.parentElement.matches('.slides') ? target : target.parentElement;
		const v = childSlides(top).indexOf(target);
		Reveal.slide(topSlides().indexOf(top), Math.max(v, 0));
	}

	/* ---------- Sidebar ----------
	 * A tree of every slide, numbered 5 or 5.1 (see Numbering), with a
	 * triangle to open and close each stack. Long titles are cut off; the
	 * tooltip shows the whole title. The current slide is marked and kept in
	 * view. While open it sits beside the slides, which shrink to fit, rather
	 * than over them; on a narrow screen it covers them. */
	let sidebar = null, sidebarList = null;

	function sidebarItem(slide, h, v) {
		const link = document.createElement('a');
		link.href = '#';
		link.className = 'deck-sidebar-link';
		link.dataset.h = h;
		link.dataset.v = v;
		const number = numberOf(slide);
		const title = titleOf(slide) || 'Slide ' + (h + 1) + (v ? '.' + (v + 1) : '');
		const scene = sceneOf(slide);
		link.title = (number ? number + ' – ' : '') + title + (scene ? ' – ' + scene : '');

		if (number) {
			const num = document.createElement('span');
			num.className = 'deck-sidebar-number';
			num.textContent = number;
			link.append(num, ' – ');
		}
		const text = document.createElement('span');
		text.className = 'deck-sidebar-title';
		text.textContent = title + (scene ? ' · ' + scene : '');
		link.append(text);

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
			const children = childSlides(top);
			const first = firstOf(top);
			if (!listed(first)) return;
			const item = document.createElement('li');
			if (children.length < 2) {
				item.appendChild(sidebarItem(first, h, 0));
			} else {
				const group = document.createElement('details');
				const summary = document.createElement('summary');
				summary.appendChild(sidebarItem(children[0], h, 0));
				group.appendChild(summary);
				const sub = document.createElement('ol');
				children.forEach(function (child, v) {
					if (v === 0 || !listed(child)) return;
					const subItem = document.createElement('li');
					subItem.appendChild(sidebarItem(child, h, v));
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

		// Close first: on the outer edge, away from the other buttons
		const toolbar = document.createElement('div');
		toolbar.className = 'deck-sidebar-toolbar';
		toolbar.append(
			button('close', 'Close the slide list', function () { setSidebar(false); }),
			button('expand', 'Open all sections', function () {
				sidebar.querySelectorAll('details').forEach(d => { d.open = true; });
			}),
			button('collapse', 'Close all sections', function () {
				sidebar.querySelectorAll('details').forEach(d => { d.open = false; });
				markCurrent();
			}),
			button('side', 'Move the slide list to the other side', function () {
				setSide(document.body.classList.contains('deck-sidebar-left') ? 'right' : 'left');
			})
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
	 * With numbering: 4 then Enter goes to section 4, 4.2 to the second slide
	 * under it; 40 goes to the last section if there are fewer, 0 to the first
	 * slide. Without numbering, the same with reveal.js's own slide numbers.
	 * Backspace corrects, Esc cancels. */
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

	// Numbered slides as [{ h, v, number }] in deck order
	function numberedSlides() {
		const found = [];
		topSlides().forEach(function (top, h) {
			childSlides(top).concat(childSlides(top).length ? [] : [top]).forEach(function (slide, v) {
				const number = numberOf(slide);
				if (number) found.push({ h: h, v: v, number: number });
			});
		});
		return found;
	}

	function jumpToTyped() {
		const parts = typed.split('.');
		const section = parseInt(parts[0], 10);
		const sub = parts[1] ? parseInt(parts[1], 10) : 0;
		const numbered = numberedSlides();

		if (numbered.length) {
			if (section === 0) { Reveal.slide(0, 0); return; }
			const sections = numbered.filter(s => s.number.indexOf('.') < 0);
			const target = sections[Math.min(section, sections.length) - 1];
			const under = numbered.filter(s => s.number.indexOf(target.number + '.') === 0);
			const to = sub && under.length ? under[Math.min(sub, under.length) - 1] : target;
			Reveal.slide(to.h, to.v);
			return;
		}

		const slides = topSlides();
		const h = Math.min(Math.max(section - 1, 0), slides.length - 1);
		const stackSize = childSlides(slides[h]).length;
		const v = Math.min(Math.max(sub - 1, 0), Math.max(stackSize - 1, 0));
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
	numberSlides();
	numberHeadings();
	useNumbersForSlideNumber();
	// Not in the print version: reveal.js may already have laid out its pages
	if (settings.contents && !printing) {
		buildContents();
		// reveal.js read the address (#/4/2) before the contents went in, so
		// read it again now that the slide indices include them
		goToAddress();
	}

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
