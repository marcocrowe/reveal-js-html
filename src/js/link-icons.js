/*********************************************************
 * Link icons: each website's own icon (favicon) beside links to it, so
 * "IMDb" or "Wikiquote" can be seen at a glance. Load after the slides
 * exist and after src/js/deck-markdown.js (the 'label' style uses its
 * field classes), before src/js/deck-controls.js. Styles in CSS, keyed on
 * data-links on each horizontal slide (see src/css/memes.css):
 *   favicon-before   icon, then the link
 *   favicon-after    the link, then the icon
 *   link-icon        the link, then a plain link icon
 *   favicon-label    the icon in place of a field label ("**IMDb:**")
 * Settings, all optional:
 *   linkIcons: {
 *     folder: 'src/img/favicons/',  // where the icons are
 *     style: 'favicon-before',      // one of the four, or 'compare': a
 *                                   // different style on each section in turn
 *     sites: { 'imdb.com': ['imdb.png', 'IMDb'], ... },  // added to the defaults
 *     labels: { 'imdb': 'imdb.com', ... },  // field label -> site, for favicon-label
 *     skip: 'a.person, .no-link-icon',      // links that never get an icon
 *   }
 * ?links=favicon-after in the address shows one style everywhere.
 * Links to sites with no icon get a plain link icon. Links that are
 * pictures (a QR code), and links matching skip, get nothing.
 *********************************************************/
(function () {
	'use strict';

	const STYLES = ['favicon-before', 'favicon-after', 'link-icon', 'favicon-label'];

	const DEFAULT_SITES = {
		'imdb.com': ['imdb.png', 'IMDb'],
		'chakoteya.net': ['chakoteya.png', 'chakoteya.net'],
		'springfieldspringfield.co.uk': ['springfield.png', 'Springfield! Springfield!'],
		'knowyourmeme.com': ['knowyourmeme.png', 'Know Your Meme'],
		'wikiquote.org': ['wikiquote.png', 'Wikiquote'],
		'wikimedia.org': ['commons.png', 'Wikimedia Commons'],
		'wikipedia.org': ['wikipedia.png', 'Wikipedia'],
		'youtube.com': ['youtube.png', 'YouTube'],
		'youtu.be': ['youtube.png', 'YouTube'],
		'imgflip.com': ['imgflip.png', 'imgflip'],
		'revealjs.com': ['revealjs.svg', 'reveal.js'],
		'irishstatutebook.ie': ['irishstatutebook.png', 'Irish Statute Book'],
		'incompetech.com': ['incompetech.png', 'Incompetech'],
		'github.com': ['github.svg', 'GitHub'],
	};

	const DEFAULT_LABELS = { 'imdb': 'imdb.com', 'meme-page': 'knowyourmeme.com', 'wikiquote': 'wikiquote.org' };

	const PLAIN_LINK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b5a8c' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E\")";

	const config = Reveal.getConfig().linkIcons || {};
	const settings = {
		folder: config.folder || 'src/img/favicons/',
		style: config.style || 'favicon-before',
		sites: Object.assign({}, DEFAULT_SITES, config.sites || {}),
		labels: Object.assign({}, DEFAULT_LABELS, config.labels || {}),
		skip: config.skip || 'a.person, .no-link-icon',
	};
	const forced = new URLSearchParams(window.location.search).get('links');

	function siteOf(href) {
		let host = '';
		try { host = new URL(href).hostname.replace(/^www\./, ''); } catch (e) { return null; }
		const key = Object.keys(settings.sites).find(k => host === k || host.endsWith('.' + k));
		return key ? settings.sites[key] : null;
	}

	// An absolute address: a relative one in a CSS variable is read from the CSS file
	function iconUrl(file) {
		return new URL(settings.folder + file, document.baseURI).href;
	}

	// 'compare' starts with the first style on the slide after the title
	function styleFor(section) {
		if (STYLES.indexOf(forced) >= 0) return forced;
		if (settings.style !== 'compare') return settings.style;
		return STYLES[(section - 1 + STYLES.length) % STYLES.length];
	}

	// The icon in place of a field label: "**IMDb:**" -> [IMDb icon]:
	function replaceLabels(top) {
		top.querySelectorAll('li.field').forEach(function (item) {
			const name = Array.from(item.classList).find(c => c.indexOf('field-') === 0 && c !== 'field');
			const domain = name && settings.labels[name.slice(6)];
			const label = item.querySelector(':scope > strong:first-child');
			if (!domain || !label || !settings.sites[domain]) return;
			const site = settings.sites[domain];
			const icon = document.createElement('img');
			icon.className = 'label-favicon';
			icon.src = iconUrl(site[0]);
			icon.alt = site[1];
			icon.title = site[1];
			label.replaceChildren(icon, ':');
			item.querySelectorAll('a.site-link').forEach(link => link.classList.add('labelled'));
		});
	}

	document.querySelectorAll('.reveal .slides > section').forEach(function (top, h) {
		const style = styleFor(h);
		top.dataset.links = style;
		top.querySelectorAll('a[href^="http"]:not(:has(img))').forEach(function (link) {
			if (link.matches(settings.skip)) return;
			const site = siteOf(link.href);
			link.classList.add('site-link');
			link.style.setProperty('--favicon', site ? 'url("' + iconUrl(site[0]) + '")' : PLAIN_LINK);
		});
		if (style === 'favicon-label') replaceLabels(top);
	});
})();
