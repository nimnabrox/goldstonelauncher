# Minimal Christmas website assets

The welcome uses the existing Goldstone County logo, a loading ring and progress animation. The music control is one small circle with a code-native gold jingle bell and red bow. Clicking the bell toggles playback directly; its ringing animation runs only while music plays. Hover, keyboard focus or tapping exposes mute and volume controls. There is no full-width player bar or large raster corner artwork. The supplied winter video and Christmas MP3 remain unchanged; visible falling snow uses one cached SVG texture with dots and small crystals repeated on two layers at different fall speeds.

A shallow connected SVG light cord, pine sprigs, twinkling bulbs and swaying star/bauble provide visible Christmas decoration above the marquee. Reserved vertical space and a right inset keep the moving text clear of the decorations and fixed bell on phone and desktop widths. Decorative SVGs ignore pointer input.

Previous generated pine artwork and its generation notes are preserved locally under `backups/website-before-minimal-header-20261118/` at the workspace root. They are excluded from the active website, build output and prepared publishing package.

The fixed music circle and its controls popover fit desktop and mobile widths. All decorative motion respects reduced motion; scenery motion also pauses in hidden tabs and with the scenery control. The opaque welcome has a bounded load time and does not wait for audio or video downloads.
