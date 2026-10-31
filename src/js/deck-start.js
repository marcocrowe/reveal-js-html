/*********************************************************
 * TAP, The Apocalypse Plugin: the scripts in src/js that sit on top of
 * reveal.js ("all will be revealed"). Version: year.tenth.day, where the
 * year counts from 2026 = 1, the tenth is which tenth of the year (0 to 9),
 * and the day counts the days with changes in that tenth. Set by
 * tools/version.py; shown wherever a slide has <span data-tap-version>.
 *
 * Starts a reveal.js deck, then loads the deck's own scripts in order.
 *
 *   <script src="src/js/deck-start.js"></script>
 *   <script>
 *     startDeck({
 *       width: 1280, height: 720, ...       // any reveal.js setting
 *       plugins: [RevealMarkdown, RevealNotes],
 *       deckScripts: [                        // loaded one after another,
 *         'src/js/deck-markdown.js',          // once the slides exist
 *         'src/js/deck-controls.js',
 *         'src/js/deck.js',
 *       ],
 *     });
 *   </script>
 *
 * It also:
 *   - notes the address (#/contents) before reveal.js reads it, as some
 *     slides are only added later (src/js/deck-controls.js reads it back)
 *   - explains what to do when a deck that loads a Markdown file is
 *     opened straight from disk, where browsers block the file
 * Returns a promise that resolves once every script has loaded, when it
 * also fires a deck:ready event on the document.
 *********************************************************/
(function () {
	'use strict';

	window.TAP = { name: 'The Apocalypse Plugin', version: '1.8.5', date: '2026-10-31' };

	function loadInOrder(sources) {
		return sources.reduce(function (previous, src) {
			return previous.then(function () {
				return new Promise(function (resolve, reject) {
					const script = document.createElement('script');
					script.src = src;
					script.onload = resolve;
					script.onerror = function () { reject(new Error('Could not load ' + src)); };
					document.body.appendChild(script);
				});
			});
		}, Promise.resolve());
	}

	// Opened from disk: a Markdown deck can't fetch its file, so say how to open it
	function explainFileProtocol() {
		const markdown = document.querySelector('.reveal .slides [data-markdown]');
		if (window.location.protocol !== 'file:' || !markdown) return;
		const file = markdown.getAttribute('data-markdown');
		const page = window.location.pathname.split('/').pop();
		document.querySelector('.reveal .slides').innerHTML =
			'<section><h2>Open this through a web server</h2>' +
			'<p>This deck loads <code>' + file + '</code>, and browsers block that from a file.</p>' +
			'<p>In this folder run <code>python -m http.server</code>, then open ' +
			'<code>http://localhost:8000/' + page + '</code>. Or use VS Code Live Server.</p>' +
			'<p>Or read <a href="' + file + '">' + file + '</a> directly.</p></section>';
	}

	function showVersion() {
		document.querySelectorAll('[data-tap-version]').forEach(function (el) {
			el.textContent = window.TAP.version;
			el.title = window.TAP.name + ', ' + window.TAP.date;
		});
	}

	window.startDeck = function (config) {
		explainFileProtocol();
		document.addEventListener('deck:ready', showVersion);
		window.deckStartHash = window.location.hash;
		const scripts = config.deckScripts || [];
		return Reveal.initialize(config)
			.then(function () { return loadInOrder(scripts); })
			.then(function () { document.dispatchEvent(new CustomEvent('deck:ready')); });
	};
})();
