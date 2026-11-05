#!/usr/bin/env python3
"""Render the reviewed November 3 legal text into the existing page shell."""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADINGS = {'Who we are', 'Information we process', 'How we use information',
            'Providers and other disclosures', 'Sharing and church participation',
            'Analytics and communications', 'Retention and deletion', 'Security',
            'Children', 'Your privacy rights', 'Changes and contact'}


def linked(text):
    # Every anchor retains exactly the source text as its visible label.
    pattern = r'https://[^\s)]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}'
    result, previous = [], 0
    for match in re.finditer(pattern, text):
        token = match.group().rstrip('.,')
        result.append(html.escape(text[previous:match.start()]))
        href = token if token.startswith('https://') else 'mailto:' + token
        result.append('<a href="' + html.escape(href, quote=True) + '">' + html.escape(token) + '</a>')
        previous = match.start() + len(token)
    return ''.join(result) + html.escape(text[previous:])


def build(check=False):
    manifest = json.loads((ROOT / 'assets/legal/source-manifest-2026-11-03.json').read_text())
    for doc in manifest['documents']:
        data = (ROOT / 'assets/legal' / doc['content_file']).read_bytes()
        if hashlib.sha256(data).hexdigest() != doc['content_sha256'] or len(data) != doc['content_bytes']:
            raise ValueError('Source mismatch: ' + doc['kind'])
    for kind in ('privacy', 'terms'):
        source = ROOT / 'assets/legal' / (kind + '-2026-11-03.txt')
        blocks = source.read_text().strip().split('\n\n')
        title, date = blocks[:2]
        main = ['  <main class="page-wrap">', '    <div class="page-header">',
                '      <div class="page-label">Legal</div>',
                '      <h1>' + html.escape(title) + '</h1>',
                '      <p class="effective-date">' + html.escape(date) + '</p>',
                '      <p><a href="/assets/legal/' + source.name + '" download>Download ' +
                ('the Privacy Policy' if kind == 'privacy' else 'the Terms') + ' as text</a></p>',
                '    </div>']
        section = 0
        for block in blocks[2:]:
            heading = block in HEADINGS if kind == 'privacy' else re.match(r'^\d+\. [^\n]+$', block)
            if heading:
                if section:
                    main.append('    </section>')
                section += 1
                ident = kind + '-section-' + str(section)
                anchor = (' id="account-deletion"' if block == 'Retention and deletion' else
                          ' id="website-analytics"' if block == 'Analytics and communications' else '')
                main += ['    <section class="section"' + anchor + ' aria-labelledby="' + ident + '">',
                         '      <h2 id="' + ident + '">' + html.escape(block) + '</h2>']
            else:
                if not section:
                    raise ValueError('Paragraph before first section: ' + kind)
                main.append('      <p>' + linked(block) + '</p>')
        main += ['    </section>', '  </main><!-- /.page-wrap -->']
        path = ROOT / (kind + '.html')
        old = path.read_text()
        expected, count = re.subn(r'  <main class="page-wrap">.*?</main><!-- /\.page-wrap -->',
                                  lambda _: '\n'.join(main), old, flags=re.S)
        if count != 1:
            raise ValueError('Expected exactly one legal page shell')
        expected = re.sub(r'(<meta name="description" content=")[^"]*("\s*/?>)',
                          lambda m: m[1] + html.escape(title + ', effective November 3, 2026.', quote=True) + m[2], expected)
        if check:
            if old != expected:
                raise ValueError('Generated page is stale: ' + path.name)
        else:
            path.write_text(expected)
    print('Five legal download hashes and both November 3 page renderings verified.' if check
          else 'Rendered November 3 privacy and terms pages; no deployment performed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
