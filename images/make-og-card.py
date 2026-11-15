#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""
Generate the Open Graph share card for literacy.bayleaf.dev.

    ./images/make-og-card.py

Writes images/og-card.png at 1200x630 (the size Slack, Discord, Canvas,
Mastodon, and Bluesky all render as a large summary image).

Design notes:
  - Colors track css/theme.css (light scheme): the three threads are
    teach (BayLeaf blue), work (BayLeaf green) and argue (rust). They appear as
    a striped spine on the left edge and a segmented rule above the footer, the
    same three-voice motif the essay uses for its columns. If theme.css changes,
    change them here too.
  - Type follows the site's stacks: Charter for the essay voice, American
    Typewriter for the argument's voice. Each slot lists fallbacks resolved by
    path; the layout is measured, not hardcoded, so substitutions reflow.
  - The logo is images/bayleaf-logo.png, a copy of the canonical BayLeaf
    source at chat/models/basic/profile.png in the BayLeaf repository
    art (also used by landing/images/make-og-card.py). Read-only here.
  - Every text color is checked against the background for WCAG 2.1 AA
    (4.5:1) and the script refuses to write a card that fails.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent

LOGO = HERE / "bayleaf-logo.png"
OUT = HERE / "og-card.png"

W, H = 1200, 630
BG = "#fbfaf7"
FG = "#222222"
MUTED = "#5c5c5c"
TEACH = "#2a5298"
WORK = "#1e5a3a"
ARGUE = "#9a3412"

SUP = "/System/Library/Fonts/Supplemental"
# (path, ttc index) candidates, first available wins.
SERIF_BOLD = [(f"{SUP}/Charter.ttc", 3), (f"{SUP}/Iowan Old Style.ttc", 2),
              (f"{SUP}/Georgia Bold.ttf", 0), ("DejaVuSerif-Bold.ttf", 0)]
SERIF = [(f"{SUP}/Charter.ttc", 0), (f"{SUP}/Iowan Old Style.ttc", 0),
         (f"{SUP}/Georgia.ttf", 0), ("DejaVuSerif.ttf", 0)]
TYPEWRITER = [(f"{SUP}/AmericanTypewriter.ttc", 0), (f"{SUP}/Courier New.ttf", 0),
              ("DejaVuSansMono.ttf", 0)]
SANS = [("/System/Library/Fonts/Helvetica.ttc", 0),
        (f"{SUP}/Arial.ttf", 0), ("DejaVuSans.ttf", 0)]

TITLE = "AI Literacy for\nthe LLM Age"
TAGLINE = "Read, write and count with AI."
TAGLINE_ARGUE = "Then run your own."
SITE = "literacy.bayleaf.dev"
BYLINE = "A BayLeaf project at UC Santa Cruz"


def font(candidates: list[tuple[str, int]], size: int) -> ImageFont.FreeTypeFont:
    for path, index in candidates:
        try:
            return ImageFont.truetype(path, size, index=index)
        except OSError:
            continue
    raise SystemExit(f"no font found among {[p for p, _ in candidates]}")


def luminance(hex_color: str) -> float:
    def channel(c: int) -> float:
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def main() -> None:
    text_colors = {"title/fg": FG, "tagline/work": WORK, "argue": ARGUE,
                   "site/teach": TEACH, "byline/muted": MUTED}
    for name, color in text_colors.items():
        ratio = contrast(color, BG)
        print(f"contrast {name} {color} on {BG}: {ratio:.2f}:1")
        if ratio < 4.5:
            raise SystemExit(f"{name} fails WCAG AA")

    card = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(card)

    # Striped spine: the three threads, side by side, like the essay's columns.
    stripe = 14
    for i, color in enumerate((TEACH, WORK, ARGUE)):
        draw.rectangle([i * stripe, 0, (i + 1) * stripe - 1, H], fill=color)

    left = 3 * stripe + 80
    title_font = font(SERIF_BOLD, 84)
    tagline_font = font(SERIF, 40)
    argue_font = font(TYPEWRITER, 40)
    site_font = font(SANS, 30)
    byline_font = font(SANS, 24)

    y = 70
    draw.multiline_text((left, y), TITLE, font=title_font, fill=FG, spacing=8)
    y = draw.multiline_textbbox((left, y), TITLE, font=title_font, spacing=8)[3] + 40

    draw.text((left, y), TAGLINE, font=tagline_font, fill=WORK)
    y = draw.textbbox((left, y), TAGLINE, font=tagline_font)[3] + 18
    draw.text((left, y), TAGLINE_ARGUE, font=argue_font, fill=ARGUE)

    # Footer: segmented three-thread rule, then logo, site and byline.
    footer_top = H - 150
    seg = (W - 80 - left) // 3
    for i, color in enumerate((TEACH, WORK, ARGUE)):
        x0 = left + i * seg
        draw.rectangle([x0, footer_top, x0 + seg - 8, footer_top + 5], fill=color)

    logo_size = 88
    logo = Image.open(LOGO).convert("RGBA").resize(
        (logo_size, logo_size), Image.LANCZOS
    )
    logo_y = footer_top + 28
    card.paste(logo, (left, logo_y), logo)

    text_x = left + logo_size + 24
    site_h = draw.textbbox((0, 0), SITE, font=site_font)[3]
    byline_h = draw.textbbox((0, 0), BYLINE, font=byline_font)[3]
    block_y = logo_y + (logo_size - (site_h + 10 + byline_h)) // 2
    draw.text((text_x, block_y), SITE, font=site_font, fill=TEACH)
    draw.text((text_x, block_y + site_h + 10), BYLINE, font=byline_font, fill=MUTED)

    card.save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(HERE.parent)} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
