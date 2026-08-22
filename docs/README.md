# PoiseAtHome Documentation

This folder contains the final technical documentation bundle for PoiseAtHome, following the same document and diagram structure used by the neighboring client projects.

## Documents

- [System documentation](system_documentation.pdf)
- [System documentation source](system_documentation.html)
- [Prototype explanation](poiseathome_prototype_explanation.docx)
- [Prototype explanation source](poiseathome_prototype_explanation.html)

## Diagrams

Each diagram is available as an editable SVG and a presentation-ready PNG:

- [System architecture](diagrams/poiseathome-architecture.png)
- [Core entity relationship diagram](diagrams/poiseathome-erd.png)
- [Roles and use cases](diagrams/poiseathome-use-case.png)
- [Booking, payment, and service sequence](diagrams/poiseathome-sequence.png)
- [Primary appointment activity](diagrams/poiseathome-activity.png)

The diagrams deliberately use a monochrome design: white backgrounds, black text and borders, and neutral gray grouping only. They contain no colored fills or accents.

## Regenerate

From the project root, run:

```bash
node docs/generate-docs.js
```

Generation requires Node.js, ImageMagick, Google Chrome or Chromium, and LibreOffice. Set `CHROME_BIN` if the Chrome executable has a different name.

