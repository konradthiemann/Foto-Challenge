# Font: DejaVu Sans (Bold)

`DejaVuSans-Bold.ttf` is used by [`src/imageAnnotate.js`](../../src/imageAnnotate.js) to
render the task-text overlay on exported gallery photos. The Railway/Nixpacks runtime
has no system fonts installed, so this file — plus the `fontconfig` package added in
[`nixpacks.toml`](../../nixpacks.toml) — is what makes that text renderable in production
at all (without it, sharp/librsvg silently draws empty "tofu" boxes instead of glyphs).

Source: [DejaVu Fonts](https://dejavu-fonts.github.io/), extracted from Debian's
`fonts-dejavu-core` package (itself derived from Bitstream Vera Sans Bold).

License: Bitstream Vera License — free to use, copy, modify, and redistribute,
including embedded in software, provided this notice and the copyright below are
kept with the font.

> Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved. Bitstream Vera is a
> trademark of Bitstream, Inc. DejaVu changes are in the public domain. Full license
> text: https://dejavu-fonts.github.io/License.html
