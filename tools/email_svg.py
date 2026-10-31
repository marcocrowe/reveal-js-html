"""Draw an email address as an SVG picture that reads normally on screen but
not to a program scraping the page for addresses.

  python tools/email_svg.py "name@example.com" src/img/email.svg

Each character is its own <text>, placed in its column, but the characters
are written into the file in a shuffled order, so the file's text is
scrambled. Monospaced, each character centred in a cell of 0.6em, so any
monospace font lines up. The mailto link is built when it's clicked
(arj/js/deck.js, a[data-mail]), from the address written backwards.
"""
import random, sys
from xml.sax.saxutils import escape

address, out = sys.argv[1], sys.argv[2]
size, cell, pad, colour = 32, 0.6 * 32, 4, '#1b3a73'
width, height = len(address) * cell + 2 * pad, size * 1.4
order = list(range(len(address)))
random.Random(address).shuffle(order)
glyphs = ''.join('<text x="%.1f" y="%.1f">%s</text>' % (pad + (i + 0.5) * cell, size * 1.05, escape(address[i]))
                 for i in order)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" width="%.0f" height="%.0f" role="img" aria-label="Email address">'
       '<g fill="%s" font-family="Consolas, \'Courier New\', monospace" font-size="%d" text-anchor="middle">%s</g></svg>\n'
       % (width, height, width, height, colour, size, glyphs))
open(out, 'w', encoding='utf-8').write(svg)
print('saved', out, '| written order:', ''.join(address[i] for i in order))
