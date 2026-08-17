// ChessPublica renders <pgn> by calling replaceWith() on it with a new
// <div class="pgn-container ...">, discarding the original element (and
// with it, the raw PGN source text) in the process — there is no other
// way to read that source back out once it's rendered. This script tag
// sits earlier in the page than ChessPublica's own <script> (see
// _layouts/default.html), so patching replaceWith() here runs before
// ChessPublica ever calls it: every time *any* <pgn> element is replaced,
// its original textContent is stashed on the replacement node itself
// (a plain JS property, not a DOM attribute, so it survives untouched
// regardless of what the PGN text contains). The "Oyunu İncele" button
// below reads it back from there to build a <pgn-study> on demand.
(function () {
    var nativeReplaceWith = Element.prototype.replaceWith;
    Element.prototype.replaceWith = function (replacement) {
        if (this.tagName === 'PGN' && replacement && replacement.nodeType === 1) {
            replacement.__rawPgn = this.textContent;
        }
        return nativeReplaceWith.apply(this, arguments);
    };
})();

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

// "Oyunu İncele" button, top-right of each game's header (see
// .pgn-study-btn above) — mirrors the site's existing .post-game-toggle
// interaction (a button that swaps the article view for a richer one),
// but here it swaps the annotated-article <pgn> card for ChessPublica's
// synced board+text <pgn-study> viewer (see the 2026-07-17 "pgn-study
// ile tanışın" post), built lazily from the raw PGN text the replaceWith
// patch above stashed on the card. Collapsing that <pgn-study> (its own
// built-in top-right icon) swaps it back to the plain <pgn> article
// view instead of leaving ChessPublica's own little collapsed ribbon
// behind, via window.ChessPublica.initAll() — the same entry point
// ChessPublica's own DOMContentLoaded listener calls, safe to call
// again since every renderer it runs skips elements already marked
// dataset.cpRendered.
//
// This has to wait for the window 'load' event, not DOMContentLoaded:
// ChessPublica itself only renders <pgn> inside its *own*
// DOMContentLoaded listener, registered when its <script> tag runs —
// which is after this include's script tag (earlier in the page, see
// _layouts/default.html) has already registered this listener. Same
// event, so registration order decides firing order: DOMContentLoaded
// here would run before ChessPublica's own handler ever creates the
// .pgn-container cards this loop looks for. 'load' fires strictly after
// every DOMContentLoaded listener (ChessPublica's included) has already
// run to completion, so the cards are guaranteed to exist by then.
window.addEventListener('load', function () {
    // ChessPublica's <pgn-study> wires its own controls (collapse toggle,
    // ribbon title, settings, download/flip/speed icons, ...) through
    // hardcoded page-wide element ids (pgnStudyCollapseToggle,
    // pgnStudyRibbonTitle, etc.), not scoped to the individual <pgn-study>
    // instance — with two open at once, document.getElementById always
    // resolves to the *first* one's elements, so the second instance's
    // own icons and buttons silently do nothing when clicked. Keeping
    // only one open at a time (closing any previously open one first)
    // sidesteps the duplicate-id collision entirely.
    var openStudy = null; // { study, rawPgn, observer }

    function restoreToArticle(entry) {
        entry.observer.disconnect();
        if (entry.tocObserver) entry.tocObserver.disconnect();
        var pgn = document.createElement('pgn');
        pgn.textContent = entry.rawPgn;
        entry.study.replaceWith(pgn);
        window.ChessPublica.initAll();
        if (openStudy === entry) openStudy = null;
    }

    // ChessPublica's TOC ribbon button is always shown and enabled, even
    // for a game with no recognized named openings/sub-variations to
    // list — most of this series' games are annotated middlegame
    // excerpts (a custom FEN, not the start position), so that lookup
    // never finds anything and the button just pops open a permanently
    // empty accordion. The lookup itself is async (it fetches an ECO
    // opening-name table and only then, if anything matched, appends a
    // heading + list to #pgnStudyTocAccordion — see the pgn-study
    // element's own script), so there is no synchronous way to know in
    // advance whether it'll be empty. Hide the button as soon as the
    // study opens and reveal it again only once that lookup actually
    // adds something to the accordion.
    function hideTocButtonUntilPopulated(entry) {
        var tocBtn = document.querySelector('.pgn-study-ribbon-btn[data-ribbon-action="toc"]');
        var accordion = document.getElementById('pgnStudyTocAccordion');
        if (!tocBtn || !accordion) return;
        tocBtn.style.display = 'none';
        entry.tocObserver = new MutationObserver(function () {
            if (accordion.childElementCount === 0) return;
            tocBtn.style.display = '';
            entry.tocObserver.disconnect();
        });
        entry.tocObserver.observe(accordion, { childList: true });
    }

    function enhanceCard(card) {
        if (card.__enhanced) return;
        card.__enhanced = true;
        var rawPgn = card.__rawPgn;
        var header = card.querySelector('.video-title.pgn-title');
        if (!rawPgn || !header) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pgn-study-btn';
        btn.textContent = 'Oyunu İncele';
        header.appendChild(btn);

        btn.addEventListener('click', function () {
            if (openStudy) restoreToArticle(openStudy);

            var study = document.createElement('pgn-study');
            study.textContent = rawPgn;
            card.replaceWith(study);

            var entry = { study: study, rawPgn: rawPgn, observer: null, tocObserver: null };
            hideTocButtonUntilPopulated(entry);
            entry.observer = new MutationObserver(function () {
                // ChessPublica's own collapse-toggle icon adds this class
                // to the <pgn-study> — react to it the same way a switch
                // to a different game's study does (see restoreToArticle
                // above and window.ChessPublica.initAll()'s doc comment
                // there), instead of leaving its own mini collapsed
                // ribbon behind.
                if (study.classList.contains('pgn-study-collapsed')) restoreToArticle(entry);
            });
            entry.observer.observe(study, { attributes: true, attributeFilter: ['class'] });
            openStudy = entry;
        });
    }

    // Enhance every card already on the page, and — since collapsing a
    // <pgn-study> above rebuilds a brand new .pgn-container rather than
    // reusing the old one — any later one too.
    var postArticle = document.querySelector('.post-article');
    document.querySelectorAll('.post-article > .pgn-container').forEach(enhanceCard);
    new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1 && node.classList.contains('pgn-container')) enhanceCard(node);
            });
        });
    }).observe(postArticle, { childList: true });
});
