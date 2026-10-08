#!/usr/bin/env python3
"""Check local links, document structure, and canonical URL consistency."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://www.simplypray.io"


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.has_title = False
        self.canonicals = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "title":
            self.has_title = True
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href"))
        for name in ("href", "src"):
            if attrs.get(name):
                self.links.append(attrs[name])
        if attrs.get("srcset"):
            self.links.extend(item.strip().split()[0] for item in attrs["srcset"].split(","))



class LegalText(HTMLParser):
    """Visible title, date and policy paragraphs, excluding download/navigation UI."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = False
        self.section_depth = 0
        self.block = None
        self.text = []
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main":
            self.in_main = True
        if self.in_main and tag == "section":
            self.section_depth += 1
        if self.in_main and (tag == "h1" or
                (tag in ("h2", "p") and self.section_depth) or
                (tag == "p" and "effective-date" in attrs.get("class", "").split())):
            self.block = tag
            self.text = []
        if self.block and tag == "br":
            self.text.append(" ")

    def handle_data(self, data):
        if self.block:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == self.block:
            self.blocks.append(" ".join("".join(self.text).split()))
            self.block = None
        if self.in_main and tag == "section":
            self.section_depth -= 1
        if tag == "main":
            self.in_main = False


def check_legal_text(errors):
    for name in ("privacy", "terms"):
        asset = ROOT / "assets" / "legal" / f"{name}-2026-10-08.txt"
        expected = [" ".join(block.split()) for block in
                    asset.read_text(encoding="utf-8").strip().split("\n\n")]
        page = LegalText()
        page.feed((ROOT / f"{name}.html").read_text(encoding="utf-8"))
        if " ".join(page.blocks) != " ".join(expected):
            errors.append(f"{name}.html: visible legal text must match {asset.name}, including title/date")


def main():
    pages = {}
    errors = []
    for path in sorted(ROOT.glob("*.html")):
        page = Page()
        page.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = page
        if not page.has_title:
            errors.append(f"{path.name}: missing <title>")

    if not pages:
        errors.append("No root HTML pages found")

    config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    rewrites = {entry["source"]: entry["destination"] for entry in config.get("rewrites", [])}

    expected_urls = set()
    for path, page in pages.items():
        route = "/" if path.name == "index.html" else f"/{path.stem}"
        canonical = SITE_URL + route
        expected_urls.add(canonical)
        if page.canonicals != [canonical]:
            errors.append(f"{path.name}: expected one self-canonical URL: {canonical}")

    try:
        sitemap = ET.parse(ROOT / "sitemap.xml")
        sitemap_urls = [
            loc.text for loc in sitemap.findall("{*}url/{*}loc")
        ]
        if len(sitemap_urls) != len(set(sitemap_urls)):
            errors.append("sitemap.xml: duplicate URLs")
        if set(sitemap_urls) != expected_urls:
            errors.append("sitemap.xml: URLs must match the canonical HTML page URLs")
    except (ET.ParseError, OSError) as error:
        errors.append(f"sitemap.xml: {error}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    sitemap_directives = [
        line.split(":", 1)[1].strip()
        for line in robots.splitlines()
        if line.lower().startswith("sitemap:")
    ]
    if sitemap_directives != [f"{SITE_URL}/sitemap.xml"]:
        errors.append("robots.txt: sitemap must use the canonical www host")

    apex_redirect = {
        "source": "/:path*",
        "has": [{"type": "host", "value": "simplypray.io"}],
        "destination": f"{SITE_URL}/:path*",
        "permanent": True,
    }
    if apex_redirect not in config.get("redirects", []):
        errors.append("vercel.json: missing permanent, apex-only redirect to www")

    for path, page in pages.items():
        for link in page.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or link.startswith("//"):
                continue
            target = unquote(parsed.path)
            if not target and not parsed.fragment:
                continue
            if target.startswith("/"):
                target = rewrites.get(target, target).lstrip("/")
                destination = ROOT / target
            else:
                destination = path.parent / target
            if not target or destination.is_dir():
                destination = destination / "index.html"
            if not destination.exists() and config.get("cleanUrls") and not destination.suffix:
                destination = destination.with_suffix(".html")
            destination = destination.resolve()
            if not destination.is_relative_to(ROOT) or not destination.is_file():
                errors.append(f"{path.name}: broken local URL {link}")
            elif parsed.fragment and destination in pages and parsed.fragment not in pages[destination].ids:
                errors.append(f"{path.name}: missing anchor {link}")

    check_legal_text(errors)

    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        print(f"Site integrity failed: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print(f"Site integrity passed: {len(pages)} HTML pages, local URLs, anchors, and SEO URLs valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
