#!/usr/bin/env python3
"""Check local links and basic document structure in the static site."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import sys


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.has_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "title":
            self.has_title = True
        for name in ("href", "src"):
            if attrs.get(name):
                self.links.append(attrs[name])
        if attrs.get("srcset"):
            self.links.extend(item.strip().split()[0] for item in attrs["srcset"].split(","))


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

    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        print(f"Site integrity failed: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print(f"Site integrity passed: {len(pages)} HTML pages, local URLs and anchors valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
