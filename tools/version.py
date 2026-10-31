"""Version numbers for the meme bank deck and for TAP (the scripts in src/js).

  python tools/version.py           show both versions for today
  python tools/version.py --write   write them into memes.md and arj/js/deck-start.js
  python tools/version.py --link C:/path/to/reveal-js-html
                                    link "Version 1.8.3" on the title slide to the
                                    commit on GitHub that first published it

A version is year.tenth.day, for content rather than software:
  year   1 for 2026, 2 for 2027 ...
  tenth  which tenth of the year today falls in, 0 to 9 (days 1-36 are 0,
         20 October to 25 November is 8, and so on)
  day    how many days in that tenth have had changes, counting today
So 1.8.3 is the third day of changes between 20 October and 25 November 2026.
Changes are the git commits that touch each one's files. Run it before you
commit; running it twice on the same day gives the same number.

The title slide shows the month ("October 2026"); the page's metadata gets
the full date and time.

--link: the deck is published by copying it into the public repository
(marcocrowe/reveal-js-html). This looks there for the first commit whose
memes.md has this version, checks that commit has been pushed, and only then
links the version to it. Until then "Version 1.8.3" stays plain text, so the
slide never points at a commit that doesn't exist. Run it after you push.
"""
import datetime, os, re, subprocess, sys
from urllib.parse import quote

DECK = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FIRST_YEAR = 2026

PARTS = {
    # name: (files whose commits count, file to write, pattern to replace)
    'deck': (['memes.md', 'memes.html', 'src/css/memes.css', 'src/img/topics'],
             'memes.md', [(r'(<span class="deck-version">)[^<]*(</span>)', r'\g<1>{v}\g<2>'),
                          (r'<time class="deck-date" datetime="[^"]*">[^<]*</time>',
                           '<time class="deck-date" datetime="{stamp}">{month}</time>')]),
    'deck page': (['memes.md', 'memes.html', 'src/css/memes.css', 'src/img/topics'],
                  'memes.html', [(r'<meta name="version" content="[^"]*" />', '<meta name="version" content="{v}" />'),
                                 (r'<meta name="dcterms.modified" content="[^"]*" />', '<meta name="dcterms.modified" content="{stamp}" />'),
                                 (r'<meta property="article:modified_time" content="[^"]*" />',
                                  '<meta property="article:modified_time" content="{stamp}" />')]),
    'TAP': (['arj', 'src/js', 'src/css/tna.css', 'src/css/deck-controls.css'],
            'arj/js/deck-start.js', [(r"version: '[^']*', date: '[^']*'", "version: '{v}', date: '{iso}'")]),
    'TAP page': (['arj', 'src/js', 'src/css/tna.css', 'src/css/deck-controls.css'],
                 'memes.html', [(r'and TAP [0-9.]+, The Apocalypse Plugin', 'and TAP {v}, The Apocalypse Plugin')]),
}


def tenth(day):
    days = 366 if datetime.date(day.year, 12, 31).timetuple().tm_yday == 366 else 365
    return (day.timetuple().tm_yday - 1) * 10 // days


def version(paths, today):
    log = subprocess.run(['git', 'log', '--format=%ad', '--date=short', '--'] + paths,
                         cwd=DECK, capture_output=True, text=True).stdout.split()
    days = {datetime.date.fromisoformat(d) for d in log}
    days = {d for d in days if d.year == today.year and tenth(d) == tenth(today) and d <= today}
    days.add(today)
    return '%d.%d.%d' % (today.year - FIRST_YEAR + 1, tenth(today), len(days))


def main(write):
    now = datetime.datetime.now().astimezone().replace(microsecond=0)
    today = now.date()
    for name, (paths, target, swaps) in PARTS.items():
        v = version(paths, today)
        print('%-5s %s' % (name, v))
        if not write:
            continue
        path = os.path.join(DECK, target)
        text = open(path, encoding='utf-8', newline='').read()
        for pattern, template in swaps:
            new = template.format(v=v, iso=today.isoformat(), stamp=now.isoformat(), month=today.strftime('%B %Y'))
            text, n = re.subn(pattern, new, text)
            if not n:
                print('  not found in', target, ':', pattern)
        open(path, 'w', encoding='utf-8', newline='').write(text)


GITHUB = 'https://github.com/marcocrowe/reveal-js-html/commit/'


def link(public):
    """Link the title slide's version to the pushed commit that first has it."""
    path = os.path.join(DECK, 'memes.md')
    text = open(path, encoding='utf-8', newline='').read()
    v = re.search(r'<span class="deck-version">([^<]*)</span>', text).group(1)
    git = lambda *args: subprocess.run(['git'] + list(args), cwd=public, capture_output=True, text=True).stdout
    commits = git('log', '--reverse', '--format=%H', '-S', '<span class="deck-version">%s</span>' % v, '--', 'memes.md').split()
    pushed = [c for c in commits if git('branch', '-r', '--contains', c).strip()]
    if not pushed:
        print('No pushed commit in %s has version %s yet: the version stays unlinked' % (public, v))
        return
    url = GITHUB + quote(pushed[0])
    text, n = re.subn(r'<a class="version-link[^"]*"[^>]*>', '<a class="version-link ext" href="%s">' % url, text, count=1)
    open(path, 'w', encoding='utf-8', newline='').write(text)
    print('Version', v, '->', url if n else 'no <a class="version-link"> on the title slide')


if __name__ == '__main__':
    if '--link' in sys.argv:
        link(sys.argv[sys.argv.index('--link') + 1])
    else:
        main('--write' in sys.argv)
