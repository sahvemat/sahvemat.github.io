// The post-hero <h1 class="post-title"> is filled in by main.js's
// formatPostTitle() (reading data-title) once the DOM is ready — this
// page's own title starts with the ♗ (bishop) and ♘ (knight) glyphs, so
// swap those two characters for the site's actual piece-theme artwork
// right after that happens, instead of relying on the font's Unicode
// chess-symbol glyphs. The ⚔️ between them is wrapped in a span so it can
// be shrunk down from the title's own font-size (see .post-title-swords).
document.addEventListener('DOMContentLoaded', function () {
    var h1 = document.querySelector('.post-title[data-title]');
    if (!h1) return;
    h1.innerHTML = h1.innerHTML
        // Hardcoded, not templated: this is a static asset (no Liquid
        // processing), safe only because _config.yml's baseurl is "".
        .replace(/♗/g, '<img class="post-title-piece" src="/assets/img/pieces/wB.png" alt="Fil">')
        .replace(/♘/g, '<img class="post-title-piece" src="/assets/img/pieces/wN.png" alt="At">')
        .replace(/⚔️/g, '<span class="post-title-swords">⚔️</span>')
        // Chapter pages end their title in a two-digit number ("fil v.
        // at 04") — style it like the section headings' own chapter-num
        // (small, mono, accent-red) instead of the title's own huge
        // italic serif.
        .replace(/(\d{2})(<\/em>)/, '<span class="chapter-num">$1</span>$2');
});

// "Oyunu İncele" button + the <pgn> <-> <pgn-study> swap it triggers now
// live site-wide in main.js (originally built here for fil-v-at only;
// the swap itself was never actually fil-v-at-specific, so every post
// with a bare <pgn> card gets it automatically, this one included).
