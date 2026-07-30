// Pair up 2 consecutive "bare" game sections — a heading directly
// followed by a single .post-game div and nothing else before the next
// heading — into a side-by-side 2-column row, instead of each one
// wasting the other column's width. Runs first, before anything else
// below reads or hydrates .post-game elements, since this only moves
// the existing heading/div nodes into new wrapper elements.
(function () {
    var article = document.querySelector('.post-article');
    if (!article) return;

    var headings = Array.from(article.children).filter(function (el) {
        return el.tagName === 'H2' || el.tagName === 'H3';
    });

    function bareGameDiv(heading) {
        var next = heading.nextElementSibling;
        if (!next || !next.classList.contains('post-game')) return null;
        var after = next.nextElementSibling;
        if (after && after.tagName !== 'H2' && after.tagName !== 'H3') return null;
        return next;
    }

    function makeCol(heading, game) {
        var col = document.createElement('div');
        col.className = 'game-pair-col';
        col.appendChild(heading);
        col.appendChild(game);
        return col;
    }

    var i = 0;
    while (i < headings.length - 1) {
        var gameA = bareGameDiv(headings[i]);
        var gameB = gameA && bareGameDiv(headings[i + 1]);
        if (gameA && gameB) {
            var pair = document.createElement('div');
            pair.className = 'game-pair';
            headings[i].parentNode.insertBefore(pair, headings[i]);
            pair.appendChild(makeCol(headings[i], gameA));
            pair.appendChild(makeCol(headings[i + 1], gameB));
            i += 2;
        } else {
            i += 1;
        }
    }
})();

// Enforce the "ŞAHvMAT" wordmark's exact casing everywhere it appears in
// rendered text, regardless of any ancestor's text-transform (many headings
// on this site are visually uppercased via CSS) or of the source casing.
// Wraps each match in a span that opts back out of text-transform, and
// watches the DOM for content added after this first pass runs.
(function () {
    var CANONICAL = 'ŞAHvMAT';
    var PATTERN = /şahvmat/i;

    function isProtected(el) {
        while (el) {
            if (el.classList && el.classList.contains('brand-name')) return true;
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return true;
            el = el.parentElement;
        }
        return false;
    }

    function wrap(node) {
        var text = node.nodeValue;
        var m = PATTERN.exec(text);
        if (!m || !node.parentNode) return;
        var before = text.slice(0, m.index);
        var after = text.slice(m.index + m[0].length);
        var span = document.createElement('span');
        span.className = 'brand-name';
        span.textContent = CANONICAL;
        var frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(span);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
    }

    function normalize(root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var targets = [];
        var n;
        while ((n = walker.nextNode())) {
            if (PATTERN.test(n.nodeValue) && !isProtected(n.parentElement)) targets.push(n);
        }
        targets.forEach(wrap);
    }

    var pending = false;
    function scheduleNormalize() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
            pending = false;
            normalize(document.body);
        });
    }

    normalize(document.body);
    new MutationObserver(scheduleNormalize).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();

// ChessPublica's puzzle mode ("[P]"/"[Pn]" PGN annotations) prints its own
// prompt into a ".puzzle-hint-text" element below the board — only in
// English, with no localization hook — so translate it in place once it
// appears (set via .textContent by ChessPublica, not read from markup).
(function () {
    var TRANSLATIONS = {
        'Find the best move for White.': 'Hamle sırası Beyazda. Beyazın en iyi hamlesini bulmayı deneyin.',
        'Find the best move for Black.': 'Hamle sırası Siyahta. Siyahın en iyi hamlesini bulmayı deneyin.'
    };

    function translate() {
        document.querySelectorAll('.puzzle-hint-text').forEach(function (el) {
            var tr = TRANSLATIONS[el.textContent.trim()];
            if (tr) el.textContent = tr;
        });
    }

    translate();
    new MutationObserver(translate).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();

(function () {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const now = new Date();
    const text = months[now.getMonth()] + ' ' + now.getFullYear();
    const el = document.getElementById('current-month-year');
    if (el) el.textContent = text;
    const footerEl = document.getElementById('footer-month-year');
    if (footerEl) footerEl.textContent = text;
})();

(function () {
    const container = document.getElementById('puzzle-rotator');
    if (!container) return;
    const src = container.dataset.pgnSrc;
    if (!src) return;

    const splitGames = (text) =>
        text.split(/\n(?=\[Event )/).map(s => s.trim()).filter(Boolean);

    const initAll = () => window.ChessPublica && window.ChessPublica.initAll && window.ChessPublica.initAll();

    let games = [];
    let index = 0;
    let currentBlobUrl = null;
    let observer = null;

    const cleanup = () => {
        if (observer) { observer.disconnect(); observer = null; }
        if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    };

    const advance = () => {
        index = (index + 1) % games.length;
        render();
    };

    const render = () => {
        cleanup();
        container.innerHTML = '';
        const blob = new Blob([games[index]], { type: 'application/x-chess-pgn' });
        currentBlobUrl = URL.createObjectURL(blob);
        const puzzle = document.createElement('puzzle');
        puzzle.setAttribute('src', currentBlobUrl);
        container.appendChild(puzzle);
        initAll();

        observer = new MutationObserver(() => {
            if (container.querySelector('.cp-fire-solved')) {
                cleanup();
                setTimeout(advance, 1500);
            }
        });
        observer.observe(container, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    };

    fetch(src)
        .then(r => r.text())
        .then(text => {
            games = splitGames(text);
            if (!games.length) return;
            render();
        })
        .catch(() => {});
})();

(function () {
    // Every game's PGN lives at a lichess.org/api/study/... URL, and Lichess
    // rejects concurrent requests from the same client. Board rendering,
    // article rendering, and the header-metadata parse below all want the
    // same PGN text, so route every fetch through one cache + strictly
    // serial queue: each URL is fetched at most once, and callers that ask
    // for a URL already in flight share that same pending promise.
    var pgnCache = {};
    var pgnQueue = [];
    var pgnBusy = false;

    // ChessPublica orients the board from Black's side when it sees an
    // [Orientation "Black"] header. Annotator-side games mark themselves
    // with [Annotator "Black"] instead, so mirror that into an Orientation
    // header (unless the PGN already sets one) before handing the text off.
    function applyAnnotatorOrientation(text) {
        if (/\[Orientation\s+"/.test(text)) return text;
        return text.replace(/\[Annotator\s+"Black"\]/, function (match) {
            return match + '\n[Orientation "Black"]';
        });
    }

    function runPgnQueue() {
        if (pgnBusy || !pgnQueue.length) return;
        pgnBusy = true;
        var job = pgnQueue.shift();
        fetch(job.src)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function (text) { return applyAnnotatorOrientation(text); })
            .then(job.resolve, job.reject)
            .then(function () {
                pgnBusy = false;
                runPgnQueue();
            });
    }

    window.__sahFetchPgn = function (src) {
        if (pgnCache[src]) return pgnCache[src];
        var promise = new Promise(function (resolve, reject) {
            pgnQueue.push({ src: src, resolve: resolve, reject: reject });
        });
        pgnCache[src] = promise;
        runPgnQueue();
        return promise;
    };
})();

(function () {
    // Make pgn-player boards responsive inside .post-game cards.
    //
    // ChessPublica's pgn-player uses chessboardjs under the hood, which
    // computes square sizes from the container's CSS width ONCE at init
    // and never re-reads them. The library doesn't listen for window
    // resize either. So we:
    //   1. Measure the card's actual width and set --board-size inline
    //      on the pgn-player so the board container shrinks.
    //   2. Reach into the (private) _engine.board and call chessboardjs's
    //      .resize() so it recomputes square pixel sizes.
    //   3. Repeat on viewport resize, on board↔article toggle, and via
    //      a ResizeObserver on the card itself.
    function refit(el) {
        const card = el.closest('.post-game');
        if (!card) return;
        // Measure pgn-player's own clientWidth and subtract its padding to get
        // the exact content area available to the board+evalbar row.
        const style = window.getComputedStyle(el);
        const padH = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
        const content = el.clientWidth - padH;
        if (!content) return;
        // board + 10px eval bar must fit in content; keep a generous safety
        // margin to absorb rounding/border discrepancies in ChessPublica's
        // own layout math. The ceiling itself switches at the site's shared
        // 768px mobile breakpoint: 380px on desktop (this card's own
        // 2-column-aware max, set in main.css), 247px on mobile — the same
        // ~0.65 ratio fil-v-at (260/400) and pgn-study (390/600) use, just
        // enforced here in JS since chessboardjs needs an actual measured
        // pixel value, not a CSS variable it'll never re-read.
        const ceiling = window.innerWidth < 768 ? 247 : 380;
        const target = Math.max(160, Math.min(ceiling, content - 25));
        el.style.setProperty('--board-size', target + 'px');
        const engine = el._engine;
        if (engine && engine.board && typeof engine.board.resize === 'function') {
            try { engine.board.resize(); } catch (e) {}
        }
    }

    function pollResize(el) {
        let attempts = 0;
        const tick = () => {
            refit(el);
            // Keep trying for ~5s until chessboardjs is initialized
            if ((!el._engine || !el._engine.board) && attempts++ < 50) {
                setTimeout(tick, 100);
            }
        };
        tick();
    }

    // `{[P]}` / `{[Pn]}` PGN comments are now a native ChessPublica
    // feature (PuzzleMode): the marked move becomes a drag-and-drop
    // puzzle on the same board, with its own pause/resume/shake-on-wrong-
    // move handling. We used to reimplement the pause+FEN-modal here by
    // hand; that's gone now that the library owns the whole flow.

    function setupOne(el) {
        pollResize(el);
        const card = el.closest('.post-game');
        if (card && window.ResizeObserver) {
            const ro = new ResizeObserver(() => refit(el));
            ro.observe(card);
        }
    }

    function makePlayer(src) {
        var player = document.createElement('pgn-player');
        player.setAttribute('src', src);
        return player;
    }

    // Lazy-initialize post-game boards using neutral placeholder divs.
    //
    // The markup uses <div class="pgn-placeholder" data-pgn-src="..."> instead
    // of <pgn-player src="...">. ChessPublica never sees these elements, so
    // zero boards are initialized on page load. When a placeholder scrolls
    // within 200px of the viewport it is queued; the queue activates one board
    // at a time to prevent a render stampede.
    //
    // The placeholder (and its CSS loading bar) stays in the DOM until the
    // PGN text has actually been fetched — not just until a <pgn-player> is
    // created — so the progress bar keeps animating for the full real wait
    // instead of vanishing the instant the DOM swap happens. The fetched
    // text is handed to ChessPublica via a blob: URL so it doesn't turn
    // around and re-fetch the same lichess.org URL itself.
    var initQueue = [];
    var initBusy = false;

    function activate(ph) {
        var src = ph.dataset.pgnSrc;
        if (!src || !ph.parentNode) return Promise.resolve(null);
        return window.__sahFetchPgn(src).then(function (text) {
            if (!ph.parentNode) return null;
            var blob = new Blob([text], { type: 'application/x-chess-pgn' });
            var player = makePlayer(URL.createObjectURL(blob));
            ph.parentNode.replaceChild(player, ph);
            if (window.ChessPublica && typeof window.ChessPublica.initAll === 'function') {
                window.ChessPublica.initAll();
            }
            setupOne(player);
            return player;
        }, function () {
            if (ph.parentNode) {
                ph.classList.add('pgn-placeholder--error');
                ph.textContent = 'Parti yüklenemedi.';
            }
            return null;
        });
    }

    function drainQueue() {
        if (initBusy || !initQueue.length) return;
        initBusy = true;
        var ph = initQueue.shift();
        activate(ph).then(function (player) {
            // Wait for chessboardjs to finish before starting the next player.
            var waited = 0;
            var poll = function () {
                if (!player || (player._engine && player._engine.board) || waited >= 30) {
                    initBusy = false;
                    drainQueue();
                } else {
                    waited++;
                    setTimeout(poll, 100);
                }
            };
            setTimeout(poll, 100);
        });
    }

    function enqueue(ph) {
        if (initQueue.indexOf(ph) === -1) initQueue.push(ph);
        drainQueue();
    }
    window.__sahEnqueue = enqueue;

    function initBoards() {
        // Scope to board placeholders only. The article view has its own
        // .pgn-placeholder--article, handled exclusively by
        // __sahActivateArticle on toggle click; if this observer also
        // picked it up, unhiding the article view would make it
        // "intersect" and get hijacked into a live pgn-player board
        // dropped inside the article, alongside the annotated content.
        var placeholders = document.querySelectorAll('.post-game .pgn-placeholder:not(.pgn-placeholder--article)');
        if (!placeholders.length) return;

        if (!window.IntersectionObserver) {
            placeholders.forEach(function (ph) { enqueue(ph); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    io.unobserve(entry.target);
                    enqueue(entry.target);
                }
            });
        }, { rootMargin: '200px 0px' });

        placeholders.forEach(function (ph) { io.observe(ph); });
    }

    window.__sahInitBoards = initBoards;

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            document.querySelectorAll('.post-game pgn-player').forEach(refit);
        }, 100);
    }, { passive: true });
})();

(function () {
    // Fix the <pgn> article view: remove the auto-generated game header
    // (player names, event, date) and apply sans-serif font.
    // ChessPublica renders <pgn> content inside a shadow root, so external
    // CSS cannot reach it — we have to patch it via JS.
    var SANS = "Outfit, ui-sans-serif, system-ui, sans-serif";
    // Match .post-article > p's font-size so article-view PGN text (and any
    // em-sized inline diagrams within it) reads at the same size as the
    // surrounding prose instead of ChessPublica's smaller default.
    var TEXT_SIZE = "1.1rem";

    function applyFont(el) {
        el.style.fontFamily = SANS;
        el.style.fontSize = TEXT_SIZE;
    }

    function cleanPgnElement(pgn) {
        // Determine which root to search: prefer shadow DOM if open, else light DOM.
        var root = (pgn.shadowRoot) || pgn;
        var container = root.querySelector('.pgn-container');

        if (container) {
            // Hide every node before .pgn-container (auto-generated header)
            var parent = container.parentNode;
            var node = parent.firstChild;
            while (node && node !== container) {
                var next = node.nextSibling;
                if (node.nodeType === 1) {
                    node.style.display = 'none';
                } else if (node.nodeType === 3 && node.textContent.trim()) {
                    var sp = document.createElement('span');
                    sp.style.display = 'none';
                    parent.insertBefore(sp, node);
                    sp.appendChild(node);
                }
                node = next;
            }

            // Apply font to every element inside the resolved root
            applyFont(root === pgn.shadowRoot ? root.host : pgn);
            root.querySelectorAll('*').forEach(applyFont);
        }

        // Open shadow DOM: inject a stylesheet so future dynamic content inherits it too.
        // Besides font matching, this also lays the article text out in two
        // newspaper-style columns (.pgn-container), and keeps diagrams from
        // ever splitting across a column break (their actual uniform sizing
        // is handled in JS by normalizeDiagrams() below — a CSS width/height
        // here can't win: each diagram sizes its own internal board widget
        // asynchronously after being inserted, same as pgn-study's diagrams,
        // see the "diagrams settled" comment further down — so it would just
        // get overwritten).
        if (pgn.shadowRoot && !pgn.shadowRoot.querySelector('[data-sah-font]')) {
            var s = document.createElement('style');
            s.setAttribute('data-sah-font', '');
            // !important on every one of these: ChessPublica's own stylesheet
            // for .pgn-container is presumably injected into this same shadow
            // root too (possibly after ours, and CSS columns only take effect
            // on a block/inline-block box in the first place — not a flex or
            // grid one — so both display and column-count need to win outright
            // rather than rely on selector specificity/source order).
            s.textContent = ':host, * { font-family: ' + SANS + ' !important; font-size: ' + TEXT_SIZE + ' !important; }' +
                '.pgn-container { display: block !important; column-count: 2 !important; ' +
                'column-gap: 2.5rem !important; column-rule: 1px solid rgba(0,0,0,0.15) !important; }' +
                '.cp-board-wrapper, .fen-container { column-span: all !important; break-inside: avoid !important; }';
            // Appended, not prepended: by the time .pgn-container exists (see
            // waitForPgnContainer below) ChessPublica has already rendered its
            // own stylesheet(s) into this shadow root, so appending ours after
            // theirs also wins any same-specificity/!important tie on source
            // order, instead of risking coming first and losing that tie.
            pgn.shadowRoot.append(s);
        }

        // Light DOM fallback: walk all children and stamp font-family directly
        // (covers cases where shadow DOM is closed or absent)
        pgn.querySelectorAll('*').forEach(applyFont);
        applyFont(pgn);

        normalizeDiagrams(pgn);
    }

    // Every diagram (.cp-board-wrapper / .fen-container — the same two
    // classes tallestDiagram() below reads for <pgn-study>) sizes its own
    // internal board widget asynchronously once inserted, and can settle at
    // a different size from the next diagram in the very same game — see
    // the near-identical "diagrams settled" ResizeObserver further down,
    // written for that exact reason on <pgn-study>. Wait for each diagram
    // here to stop resizing itself, then force it to one fixed size the
    // only way that's safe regardless of *how* it rendered internally
    // (a JS-positioned board widget, an SVG, ...): move its rendered content
    // into a plain wrapper at its own natural size, then transform: scale()
    // that wrapper down/up to the target — a CSS width/height override on
    // the diagram itself would just get fought (and overwritten) by its own
    // resize logic.
    var DIAGRAM_TARGET_PX = 400;

    function normalizeDiagrams(pgn) {
        var root = pgn.shadowRoot || pgn;
        var container = root.querySelector('.pgn-container');
        if (!container) return;
        var diagrams = container.querySelectorAll('.cp-board-wrapper, .fen-container');
        if (!diagrams.length) return;

        function fixSize(el) {
            if (el.dataset.sahDiagramFixed) return;
            var rect = el.getBoundingClientRect();
            var natural = Math.max(rect.width, rect.height);
            if (!natural) return;
            var inner = document.createElement('div');
            while (el.firstChild) inner.appendChild(el.firstChild);
            inner.style.width = natural + 'px';
            inner.style.height = natural + 'px';
            inner.style.transformOrigin = 'top left';
            inner.style.transform = 'scale(' + (DIAGRAM_TARGET_PX / natural) + ')';
            el.appendChild(inner);
            el.style.width = DIAGRAM_TARGET_PX + 'px';
            el.style.height = DIAGRAM_TARGET_PX + 'px';
            el.style.overflow = 'hidden';
            el.style.margin = '1.5rem auto';
            el.dataset.sahDiagramFixed = '1';
        }

        if (!window.ResizeObserver) {
            diagrams.forEach(fixSize);
            return;
        }
        var settled = false;
        var settleTimer;
        var observer = new ResizeObserver(function () {
            if (settled) return;
            clearTimeout(settleTimer);
            settleTimer = setTimeout(finish, 150);
        });
        function finish() {
            if (settled) return;
            settled = true;
            observer.disconnect();
            diagrams.forEach(fixSize);
        }
        diagrams.forEach(function (d) { observer.observe(d); });
        settleTimer = setTimeout(finish, 1600);
    }

    // Wait until ChessPublica has actually parsed the PGN and rendered
    // .pgn-container (the board/diagrams/arrows) inside a <pgn> element, or
    // give up after ~5s. Shared with activateArticle below so the article's
    // loading bar can stay up through this render pass too, not just
    // through the network fetch.
    //
    // A MutationObserver reacts to .pgn-container appearing within a
    // frame, instead of a fixed-interval poll that could leave our own
    // loading bar running for up to a whole extra poll tick after the
    // content (and ChessPublica's own loading UI) is already done. A slow
    // interval alongside it only exists to re-check whether pgn.shadowRoot
    // has become available to observe (shadow root attachment itself
    // isn't a mutation we can subscribe to).
    function waitForPgnContainer(pgn) {
        return new Promise(function (resolve) {
            var settled = false;
            var observer = null;
            var observedRoot = null;

            function finish() {
                if (settled) return;
                settled = true;
                if (observer) observer.disconnect();
                clearInterval(rootCheckId);
                clearTimeout(timeoutId);
                resolve();
            }

            function check() {
                var root = pgn.shadowRoot || pgn;
                if (root.querySelector('.pgn-container')) {
                    finish();
                    return;
                }
                if (root !== observedRoot) {
                    if (observer) observer.disconnect();
                    observedRoot = root;
                    observer = new MutationObserver(check);
                    observer.observe(root, { childList: true, subtree: true });
                }
            }

            check();
            var rootCheckId = setInterval(check, 250);
            var timeoutId = setTimeout(finish, 5000);
        });
    }
    window.__sahWaitPgnReady = waitForPgnContainer;

    function tryCleanAll() {
        // '.post-game-view--article pgn' covers the toggle-created <pgn>
        // (board <-> article view) used elsewhere on the site; '.post-article > pgn'
        // covers long-form posts (e.g. fil-v-at) that embed <pgn> directly
        // in the markdown, with no toggle wrapper around it at all.
        document.querySelectorAll('.post-game-view--article pgn, .post-article > pgn').forEach(function (pgn) {
            if (!pgn.dataset.sahCleaned) {
                waitForPgnContainer(pgn).then(function () {
                    var root = pgn.shadowRoot || pgn;
                    if (root.querySelector('.pgn-container')) {
                        cleanPgnElement(pgn);
                        pgn.dataset.sahCleaned = '1';
                    }
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryCleanAll);
    } else {
        tryCleanAll();
    }

    window.__sahCleanPgn = function (articleEl) {
        articleEl.querySelectorAll('pgn').forEach(function (pgn) {
            delete pgn.dataset.sahCleaned;
        });
        tryCleanAll();
    };
})();

(function () {
    const LABEL_BOARD = 'Analizi oku';
    const LABEL_ARTICLE = 'Tahtaya dön';

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.post-game-toggle');
        if (!btn) return;
        var game = btn.closest('.post-game');
        if (!game) return;
        var board = game.querySelector('.post-game-view--board');
        var article = game.querySelector('.post-game-view--article');
        if (!board || !article) return;
        var showArticle = btn.dataset.view === 'board';
        board.hidden = showArticle;
        article.hidden = !showArticle;
        btn.dataset.view = showArticle ? 'article' : 'board';
        btn.setAttribute('aria-pressed', showArticle ? 'true' : 'false');
        btn.textContent = showArticle ? LABEL_ARTICLE : LABEL_BOARD;
        if (showArticle) {
            var activateArticle = window.__sahActivateArticle
                ? window.__sahActivateArticle(article)
                : Promise.resolve();
            activateArticle.then(function () {
                if (window.__sahCleanPgn) window.__sahCleanPgn(article);
            });
        } else {
            // Switching to the board view: activate it now if it was never
            // scrolled into view yet, or just resize it if it already was
            // (chessboardjs computes square sizes once, from a container
            // that had zero width while hidden). Only do this when actually
            // switching to the board — this used to run unconditionally on
            // every toggle click, which meant clicking "Analizi oku" could
            // activate and render the board's pgn-player while the board
            // view was supposed to stay hidden.
            var placeholder = board.querySelector('.pgn-placeholder');
            var player = board.querySelector('pgn-player');
            if (placeholder && window.__sahEnqueue) {
                window.__sahEnqueue(placeholder);
            } else if (player && player._engine && player._engine.board &&
                    typeof player._engine.board.resize === 'function') {
                setTimeout(function () {
                    try { player._engine.board.resize(); } catch (e) {}
                }, 50);
            }
        }
    });
})();

(function () {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const root = document.documentElement;

    const setPressed = () => {
        btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
    };
    setPressed();

    btn.addEventListener('click', function () {
        const isDark = root.getAttribute('data-theme') === 'dark';
        if (isDark) {
            root.removeAttribute('data-theme');
            localStorage.setItem('sah-theme', 'light');
        } else {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('sah-theme', 'dark');
        }
        setPressed();
    });
})();

(function () {
    const header = document.getElementById('main-header');
    const headerLogo = header && header.querySelector('.logo-body');
    let isScrolled = false;
    const thresholdIn = 100;
    const thresholdOut = 40;
    const update = () => {
        const y = window.pageYOffset || document.documentElement.scrollTop;
        if (y > thresholdIn && !isScrolled) {
            isScrolled = true;
            header && header.classList.add('scrolled');
            headerLogo && headerLogo.classList.add('is-scrolled');
        } else if (y <= thresholdOut && isScrolled) {
            isScrolled = false;
            header && header.classList.remove('scrolled');
            headerLogo && headerLogo.classList.remove('is-scrolled');
        }
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => { update(); ticking = false; });
            ticking = true;
        }
    }, { passive: true });
})();

(function () {
    var n = 0;
    document.querySelectorAll('.post-article p > img[title]').forEach(function (img) {
        var p = img.parentNode;
        if (p.childNodes.length !== 1) return;
        n++;
        var fig = document.createElement('figure');
        var caption = document.createElement('figcaption');
        caption.innerHTML = '<span>Foto ' + n + '</span> · ' + img.title;
        img.removeAttribute('title');
        p.parentNode.replaceChild(fig, p);
        fig.appendChild(img);
        fig.appendChild(caption);
    });
})();

(function () {
    // Turn <div class="video-embed" data-caption="..."> into a <figure>,
    // the same treatment photos above get, so video embeds pick up the
    // same figure/figcaption styling and "Video N" numbering.
    var n = 0;
    document.querySelectorAll('.post-article > .video-embed[data-caption]').forEach(function (div) {
        n++;
        var fig = document.createElement('figure');
        fig.className = 'video-embed';
        while (div.firstChild) fig.appendChild(div.firstChild);
        var caption = document.createElement('figcaption');
        caption.innerHTML = '<span>Video ' + n + '</span> · ' + div.dataset.caption;
        fig.appendChild(caption);
        div.parentNode.replaceChild(fig, div);
    });
})();

(function () {
    // Turn a markdown table followed by a blockquote caption into a
    // <figure>, the same treatment photos/videos above get, so tables
    // pick up the same figure/figcaption styling and "Tablo N" numbering.
    var n = 0;
    document.querySelectorAll('.post-article > table').forEach(function (table) {
        var bq = table.nextElementSibling;
        if (!bq || bq.tagName !== 'BLOCKQUOTE') return;
        n++;
        var fig = document.createElement('figure');
        fig.className = 'table-figure';
        var caption = document.createElement('figcaption');
        caption.innerHTML = '<span>Tablo ' + n + '</span> · ' + bq.textContent.trim();
        table.parentNode.insertBefore(fig, table);
        fig.appendChild(table);
        fig.appendChild(caption);
        bq.remove();
    });
})();

(function () {
    var months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    document.querySelectorAll('[data-date]').forEach(function (el) {
        var parts = el.dataset.date.split('-');
        if (parts.length < 3) return;
        el.textContent = months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
    });
})();

(function () {
    function formatPostTitle(h1) {
        var title = h1.dataset.title;
        if (!title) return;
        var up = function (s) { return s.toLocaleUpperCase('tr-TR'); };

        var before, after;
        var colonIdx = title.indexOf(':');
        if (colonIdx !== -1) {
            before = title.slice(0, colonIdx + 1);
            after = title.slice(colonIdx + 1).trim();
        } else {
            var words = title.split(' ');
            var veIdx = words.indexOf('ve');
            if (veIdx !== -1) {
                before = words.slice(0, veIdx).join(' ');
                after = words.slice(veIdx).join(' ');
            } else if (words.length > 1) {
                before = words[0];
                after = words.slice(1).join(' ');
            } else {
                h1.textContent = up(title);
                return;
            }
        }
        h1.innerHTML = up(before) + '<br><em>' + after + '</em>';
    }

    document.querySelectorAll('.post-title[data-title]').forEach(formatPostTitle);
})();

// Straight quotes/apostrophes ("..."/') come from YAML front matter and
// other places that never pass through kramdown's markdown converter
// (which already smartens quotes in post body text). Sweep the rendered
// page once to curl them up too, skipping code and chess game content.
(function () {
    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, IFRAME: 1, SVG: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, PGN: 1, PUZZLE: 1, 'PGN-PLAYER': 1, FEN: 1 };

    function smartQuotes(str) {
        return str
            .replace(/(^|[\s ([{—–-])"/g, '$1“')
            .replace(/"/g, '”')
            .replace(/(^|[\s ([{—–-])'/g, '$1‘')
            .replace(/'/g, '’');
    }

    document.title = smartQuotes(document.title);

    var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (node.nodeType === 1) {
                    if (SKIP_TAGS[node.tagName] || node.classList.contains('post-game')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) textNodes.push(n);
    textNodes.forEach(function (t) {
        if (t.nodeValue.indexOf('"') !== -1 || t.nodeValue.indexOf("'") !== -1) {
            t.nodeValue = smartQuotes(t.nodeValue);
        }
    });
})();

// Inline PGN: a .post-game with no data-pgn attribute can instead carry its
// PGN as the text of a child <script type="application/x-chess-pgn">, for
// games that don't warrant a whole separate .pgn asset file. That <script>
// is inert to the browser and already sits outside the quote-smartening
// sweep above (SCRIPT is in its original SKIP_TAGS, not something added for
// this), so header tags like [White "..."] keep their literal straight
// quotes intact. Converted to a blob: URL and stashed as data-pgn so the
// rest of the pipeline below — lazy loading, header parsing, board/article
// views — doesn't need to know the difference from a fetched file.
// Registered before the pipeline's own DOMContentLoaded handler below, so
// it always runs first.
(function () {
    function inlineToBlob() {
        document.querySelectorAll('.post-game:not([data-pgn])').forEach(function (game) {
            var inline = game.querySelector('script[type="application/x-chess-pgn"]');
            if (!inline) return;
            var blob = new Blob([inline.textContent], { type: 'application/x-chess-pgn' });
            game.dataset.pgn = URL.createObjectURL(blob);
            inline.remove();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inlineToBlob);
    } else {
        inlineToBlob();
    }
})();

(function () {
    var resultMap = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½' };

    function parseHeader(pgn, tag) {
        var m = pgn.match(new RegExp('\\[' + tag + '\\s+"([^"]*)"\\]'));
        return m ? m[1] : '';
    }

    function injectGameViews() {
        document.querySelectorAll('.post-game[data-pgn]').forEach(function (game) {
            if (game.querySelector('.post-game-view')) return;
            var src = game.dataset.pgn;
            var board = document.createElement('div');
            board.className = 'post-game-view post-game-view--board';
            board.innerHTML = '<div class="pgn-placeholder" data-pgn-src="' + src + '"></div>';
            var article = document.createElement('div');
            article.className = 'post-game-view post-game-view--article';
            article.hidden = true;
            // The <pgn> element is created lazily (on first "Analizi oku"
            // click) rather than here, so it doesn't fire its own lichess.org
            // fetch for all 27 games right at page load — see activateArticle.
            article.innerHTML = '<div class="pgn-placeholder pgn-placeholder--article" data-pgn-src="' + src + '"></div>';
            game.appendChild(board);
            game.appendChild(article);
        });
    }

    function activateArticle(articleEl) {
        var ph = articleEl.querySelector('.pgn-placeholder');
        if (!ph) return Promise.resolve();
        var src = ph.dataset.pgnSrc;
        if (!src) return Promise.resolve();
        return window.__sahFetchPgn(src).then(function (text) {
            if (!ph.parentNode) return;
            var blob = new Blob([text], { type: 'application/x-chess-pgn' });
            var pgn = document.createElement('pgn');
            pgn.setAttribute('src', URL.createObjectURL(blob));
            // Parsing the PGN and drawing each diagram/arrow is a real CPU
            // cost for heavily annotated games (a couple of seconds), not
            // just a network wait. Let it render normally, in flow, from
            // the start — ChessPublica's own size calculations need real
            // layout, and .pgn-placeholder--article is an absolute overlay
            // (see main.css) stretched to physically cover it the whole
            // time, loading bar and all. That way whatever ChessPublica
            // shows while it works — including its own loading UI — stays
            // hidden behind the overlay rather than depending on some
            // opacity/visibility trick on <pgn> itself, which its internal
            // markup could otherwise defeat.
            ph.parentNode.insertBefore(pgn, ph);
            if (window.ChessPublica && typeof window.ChessPublica.initAll === 'function') {
                window.ChessPublica.initAll();
            }
            return (window.__sahWaitPgnReady ? window.__sahWaitPgnReady(pgn) : Promise.resolve()).then(function () {
                if (ph.parentNode) ph.parentNode.removeChild(ph);
            });
        }, function () {
            if (ph.parentNode) {
                ph.classList.add('pgn-placeholder--error');
                ph.textContent = 'Parti yüklenemedi.';
            }
        });
    }
    window.__sahActivateArticle = activateArticle;

    function injectGameHeaders() {
        document.querySelectorAll('.post-game').forEach(function (game) {
            if (game.querySelector('.post-game-header')) return;
            var header = document.createElement('div');
            header.className = 'post-game-header';
            header.innerHTML =
                '<span class="post-game-round"></span>' +
                '<span class="post-game-players"></span>' +
                '<span class="post-game-result"></span>' +
                '<button class="post-game-toggle" type="button" data-view="board" aria-pressed="false">Analizi oku</button>';
            game.insertBefore(header, game.firstChild);
        });
    }

    function populateGames() {
        var games = Array.from(document.querySelectorAll('.post-game'));
        if (!games.length) return;

        var promises = games.map(function (game) {
            var src = game.dataset.pgn;
            if (!src) {
                var ph = game.querySelector('.pgn-placeholder');
                src = ph && ph.dataset.pgnSrc;
            }
            if (!src) return Promise.resolve(null);
            return window.__sahFetchPgn(src)
                .then(function (pgn) {
                    var white = parseHeader(pgn, 'White');
                    var black = parseHeader(pgn, 'Black');
                    var whiteElo = parseHeader(pgn, 'WhiteElo');
                    var blackElo = parseHeader(pgn, 'BlackElo');
                    var result = parseHeader(pgn, 'Result');
                    var round = parseHeader(pgn, 'Round');
                    var wp = white + (whiteElo && whiteElo !== '-1' ? ' (' + whiteElo + ')' : '');
                    var bp = black + (blackElo && blackElo !== '-1' ? ' (' + blackElo + ')' : '');
                    var players = wp + ' — ' + bp;
                    var displayResult = resultMap[result] || result;
                    var roundLabel = round ? round + '. Tur' : '';

                    var roundEl = game.querySelector('.post-game-round');
                    var playersEl = game.querySelector('.post-game-players');
                    var resultEl = game.querySelector('.post-game-result');
                    if (roundEl) roundEl.textContent = roundLabel;
                    if (playersEl) playersEl.textContent = players;
                    if (resultEl) resultEl.textContent = displayResult;

                    return {
                        id: game.id,
                        roundDisplay: roundLabel,
                        players: players,
                        result: displayResult
                    };
                }, function () { return null; });
        });

        Promise.all(promises).then(function (data) {
            var archive = document.querySelector('.post-archive');
            if (!archive) return;
            var valid = data.filter(Boolean);
            if (!valid.length) return;

            var n = valid.length;
            var turLabel = n === 1 ? 'turun' : 'turun';
            archive.innerHTML =
                '<h3 class="post-archive-title">Tüm Partiler</h3>' +
                '<div class="archive-grid">' +
                valid.map(function (g) {
                    return '<a class="archive-card" href="#' + g.id + '">' +
                        '<span class="archive-card-round">' + g.roundDisplay + '</span>' +
                        '<span class="archive-card-players">' + g.players + '</span>' +
                        '<span class="archive-card-result">' + g.result + '</span>' +
                        '</a>';
                }).join('') +
                '</div>';
        });
    }

    function init() {
        injectGameViews();
        if (window.__sahInitBoards) window.__sahInitBoards();
        injectGameHeaders();
        populateGames();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

(function () {
    // pgn-study sets its own initial --left-col-width to a fixed ~638px
    // cap the moment it becomes ready, regardless of how wide the board
    // itself actually rendered — inside our article width (capped well
    // below ChessPublica's own 90vw full-page assumption), the board can
    // render considerably narrower than that, leaving dead space in the
    // board column and needlessly squeezing the article column. Once a
    // study is ready (board already sized), point the divider at the
    // board's own real width instead — the same place a reader dragging
    // it to fit would land on anyway. Only the initial position is
    // corrected; a reader's own drag afterward is left alone.
    //
    // --board-size includes a `94cqw` term measured against pgn-player's
    // own inline-size — which --left-col-width itself controls. Naively
    // setting the column to exactly the board's current width makes 94cqw
    // resolve smaller than the board itself, so the container query
    // shrinks the board again — chasing a shrinking target down to a tiny
    // fraction of what it should be. Read the board's width once, while
    // ChessPublica's own (wide, non-constraining) default column is still
    // in effect, then size the column so 94cqw comfortably clears that
    // width instead of pinching it — same 94% divisor CSS uses, run in
    // reverse, plus a rounding buffer so it can't land exactly on the
    // boundary either.
    // The article's diagrams (see capHeight's own diagram-floor logic
    // below, and the board-size floor in fitWidth/the resizer clamp) are
    // square, so a single "size" — the larger of the two axes, in case a
    // margin or subpixel rounding makes them not perfectly equal —
    // describes them fully. Shared by every place that needs to know how
    // big the largest one currently is, so they can't disagree with each
    // other about it.
    function tallestDiagram(study) {
        var pgnContainer = study.querySelector('.pgn-container');
        if (!pgnContainer) return null;
        var diagrams = pgnContainer.querySelectorAll('.cp-board-wrapper, .fen-container');
        var tallest = null;
        diagrams.forEach(function (d) {
            var rect = d.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height);
            if (!tallest || size > tallest.size) {
                var dStyle = getComputedStyle(d);
                tallest = {
                    size: size,
                    marginTop: parseFloat(dStyle.marginTop || 0),
                    marginBottom: parseFloat(dStyle.marginBottom || 0),
                };
            }
        });
        return tallest;
    }

    function fitWidth(study) {
        if (window.matchMedia && !window.matchMedia('(min-width: 900px)').matches) return;
        var player = study.querySelector('pgn-player');
        var wrap = study.querySelector('.board-wrap');
        var board = wrap && wrap.querySelector('[class*="board-"]');
        if (!player || !board) return;
        var boardWidth = board.getBoundingClientRect().width;
        if (!boardWidth) return;
        // The board must never be smaller than the article's largest
        // diagram (see the resizer's own matching clamp below, which
        // keeps this true through a manual drag too) — sizing the
        // column for whichever of the two needs more room keeps that
        // true from the very first, automatic fit as well.
        var diagram = tallestDiagram(study);
        var targetBoardWidth = diagram ? Math.max(boardWidth, diagram.size) : boardWidth;
        var pad = parseFloat(getComputedStyle(player).paddingLeft || 0) +
            parseFloat(getComputedStyle(player).paddingRight || 0);
        var contentBoxNeeded = targetBoardWidth / 0.94 + 2;
        study.style.setProperty('--left-col-width', (contentBoxNeeded + pad) + 'px');
    }

    // The left column (board + ribbon, and — once playback reaches a
    // [P]/[Pn] move — the puzzle hint row below the board, or once a move
    // with variations is clicked — the variation picker) must never need
    // its own scroll; the panel grows to fit it instead of clipping it.
    // But it must also never grow past what the viewport can actually
    // show at once — the whole element, ribbon included, has to be
    // visible without scrolling the page — so there's a ceiling: if the
    // board's natural size would make the panel taller than the visible
    // viewport (minus the sticky header, which still eats into it), the
    // board itself is capped down until the panel just clears it.
    //
    // The cap is applied as --sah-max-board-h, a CSS custom property
    // --board-size itself folds into a min() (see main.css) alongside
    // ChessPublica's own width-based min(600px, 94cqw) — rather than
    // overriding --board-size directly. That means the ceiling applies
    // live to *any* width change automatically, including a reader
    // dragging the resizer wider (see the drag handling in ready() below)
    // — the board just stops growing once it hits the ceiling, with no
    // need to re-run this whole measurement on every pointermove.
    //
    // resetColumn is true for automatic fits (initial load, content
    // changes) and false while a reader is actively dragging the
    // resizer — dragging must never fight the reader by resetting
    // --left-col-width out from under their cursor; only --sah-max-board-h
    // is touched in that case, and fitWidth() is skipped entirely so the
    // column stays exactly where they put it.
    //
    // Always clear the previous --sah-max-board-h before re-measuring —
    // otherwise a stale (possibly now-too-restrictive) cap would read
    // back a board smaller than the current width could actually
    // support, and content that later needs less room (a puzzle hint row
    // going away) — or a column dragged wider — would never be able to
    // grow the board back.
    //
    // .player-wrapper's own rendered size is used instead of
    // pgn-player's scrollHeight: scrollHeight does not reliably reflect
    // a --board-size change here (confirmed by direct measurement —
    // chessboardjs's internal square elements lag behind the resize()
    // call by at least a frame, even though the container's own CSS
    // width/height and getBoundingClientRect() already reflect it).
    // Trusting scrollHeight sent an earlier version of this function
    // into a runaway shrink spiral: it read the still-stale, larger
    // scrollHeight as "content grew", capped the board smaller in
    // response, and kept doing so every iteration since scrollHeight
    // never actually caught up — bottoming out at the floor for no
    // reason. A ResizeObserver on .player-wrapper keeps the automatic
    // path in sync for as long as the page is open — the hint row and
    // variation picker can both appear well after the initial fit,
    // mid-interaction.
    function capHeight(study, resetColumn) {
        if (window.matchMedia && !window.matchMedia('(min-width: 900px)').matches) return;
        if (study.classList.contains('pgn-study-collapsed')) {
            // Collapsed rides on ChessPublica's own height: auto (see
            // main.css) — an inline height left over from before
            // collapsing (or one this very function set moments
            // earlier) would override that regardless of specificity,
            // since an inline style always wins over any stylesheet
            // rule. That's what left a tall blank gap below the
            // now-collapsed ribbon where the hidden board/article used
            // to be. Collapsing hides pgn-player, which is itself a
            // resize of the .player-wrapper ResizeObserver below — so
            // this runs right away rather than waiting on some
            // unrelated later re-fit to clear the stale value.
            study.style.removeProperty('height');
            return;
        }
        var player = study.querySelector('pgn-player');
        var wrapper = study.querySelector('.player-wrapper');
        if (!player || !wrapper) return;

        function resizeBoard() {
            // --board-size only reactively resizes .player-wrapper's CSS
            // width — chessboardjs (the actual board underneath) computes
            // its square pixel sizes from that container once and doesn't
            // re-read them on its own (same limitation the .post-game
            // pgn-player refit() above works around).
            var engine = player._engine;
            if (engine && engine.board && typeof engine.board.resize === 'function') {
                try { engine.board.resize(); } catch (e) {}
            }
        }

        function measure() {
            var playerStyle = getComputedStyle(player);
            var playerPad = parseFloat(playerStyle.paddingTop || 0) +
                parseFloat(playerStyle.paddingBottom || 0);
            var studyTop = study.getBoundingClientRect().top;
            var playerTop = player.getBoundingClientRect().top;
            var padBottom = parseFloat(getComputedStyle(study).paddingBottom || 0);
            var wrapperHeight = wrapper.getBoundingClientRect().height;
            // The move-picker is .player-wrapper's last block child, and
            // .player-wrapper (overflow: visible, no BFC of its own) can't
            // stop the picker's own bottom margin from collapsing straight
            // through its own bottom edge — regardless of whether the
            // picker currently has any content. That margin never shows up
            // in wrapper's rect height, only to reappear as trapped,
            // unaccounted-for scroll space once pgn-player's own
            // overflow: auto (which *does* form a BFC) finally stops it
            // escaping any further. Add it back in by hand so player never
            // ends up needing to scroll just to show it.
            var picker = wrapper.querySelector('.pgn-study-move-picker');
            if (picker) {
                wrapperHeight += parseFloat(getComputedStyle(picker).marginBottom || 0);
            }
            return (playerTop - studyTop) + playerPad + wrapperHeight + padBottom;
        }

        study.style.removeProperty('--sah-max-board-h');
        if (resetColumn) study.style.removeProperty('--left-col-width');
        resizeBoard();

        var total = measure();
        if (!total) return;

        var header = document.querySelector('.main-header');
        var available = window.innerHeight -
            (header ? header.getBoundingClientRect().height : 0) - 16;

        // The move-picker only exists in the height budget once it's
        // actually showing real content (measure() above only accounts
        // for its collapsed margin while empty) — so a board grown (by
        // hand, or automatically) while no variation choice happens to be
        // on screen yet can end up bigger than what's left once one
        // appears, forcing a much later, more dramatic shrink right as
        // the reader clicks into it. Reserve headroom for it ahead of
        // time instead: once we've actually seen it with content, cache
        // its real height on the study (so future reservations use this
        // game's actual picker size, not a guess); until then, fall back
        // to a conservative default close to a typical single-row picker.
        // This only tightens the *cap* — the study's own committed height
        // below still comes from the real, uninflated measurement, so a
        // game that never has a variation to show never grows an unused
        // gap for one.
        var picker = wrapper.querySelector('.pgn-study-move-picker');
        var pickerHeight = picker ? picker.getBoundingClientRect().height : 0;
        if (picker) {
            if (pickerHeight) {
                study.dataset.sahPickerReserve = pickerHeight;
            } else {
                available -= parseFloat(study.dataset.sahPickerReserve || 40);
            }
        }

        if (total > available) {
            var wrap = study.querySelector('.board-wrap');
            var board = wrap && wrap.querySelector('[class*="board-"]');
            // Shrinking the board to make room can itself change how much
            // room is needed: the variation picker below the board wraps
            // onto more lines at a narrower width, needing *more* height
            // right as the cap tries to give it less. Iterate a few times
            // so the cap accounts for its own effect on the content
            // instead of a single pass based on the pre-shrink layout —
            // each round only shrinks further (more wrapping needs more
            // overhead, never less), so this settles rather than
            // oscillating. No floor beyond "not zero/negative": a study
            // never scrolling its left column takes priority over
            // keeping the board above some comfortable minimum size, on
            // the rare viewport short enough to force that choice.
            for (var attempt = 0; board && attempt < 6 && total > available; attempt++) {
                var boardHeight = board.getBoundingClientRect().height;
                if (!boardHeight) break;
                var overhead = total - boardHeight;
                var cappedBoard = Math.max(40, available - overhead);
                study.style.setProperty('--sah-max-board-h', cappedBoard + 'px');
                resizeBoard();
                total = measure();
            }
        }

        // The right column's article text can include inline diagrams
        // (comment annotations like [%csl]/[%cal] rendered as small board
        // images) — unlike ordinary prose, a diagram that's taller than
        // the article's own visible height looks broken once scrolled to
        // (cut off mid-board) rather than just being normal reading
        // behavior, so the panel must always be tall enough for
        // .pgn-container's visible area to show the tallest one whole,
        // even past the viewport-fit cap above if it has to — the same
        // "never partially show content" priority the left column's own
        // board already gets. The article's *entire* HTML (every
        // diagram in the game, not just the currently-scrolled-to one)
        // is rendered into the DOM up front regardless of scroll
        // position, so this can be measured directly off the real
        // elements rather than reserved for in advance the way the
        // move-picker above has to be (that one doesn't exist in the DOM
        // with real content until a reader actually reaches it).
        var pgnContainer = study.querySelector('.pgn-container');
        var diagram = tallestDiagram(study);
        if (diagram) {
            // +2px buffer: .pgn-container's clientHeight rounds to a
            // whole pixel while this is computed from several
            // fractional measurements, and the two can land a pixel
            // apart — the same kind of slop fitWidth()'s own buffer
            // below exists to absorb.
            var requiredForDiagram = (pgnContainer.getBoundingClientRect().top -
                study.getBoundingClientRect().top) + diagram.size +
                diagram.marginTop + diagram.marginBottom +
                parseFloat(getComputedStyle(study).paddingBottom || 0) + 2;
            if (requiredForDiagram > total) total = requiredForDiagram;

            // The board itself (see fitWidth() and the resizer's own
            // matching clamp) must never be smaller than this same
            // diagram either — --board-size folds this in as a floor
            // (see main.css) so it holds even when something *other*
            // than the column width would otherwise push the board
            // smaller, e.g. the viewport-fit cap above on a short
            // screen.
            study.style.setProperty('--sah-min-board-w', diagram.size + 'px');
        } else {
            study.style.removeProperty('--sah-min-board-w');
        }
        // resetColumn's own resizeBoard() below only runs conditionally;
        // this one makes sure chessboard.js picks up a --sah-min-board-w
        // change on every path, including a drag that isn't touching the
        // column at all.
        resizeBoard();

        // Round up, not to nearest: a fractional pixel rounded away is
        // exactly the kind of shortfall that trips pgn-player's own
        // overflow: auto into showing a scrollbar for content that
        // otherwise fits.
        study.style.height = Math.ceil(total) + 'px';
        if (resetColumn) {
            // We just reset the column above, so it must always be
            // re-fitted to the board's final size here — not only when
            // the height changed, or a run that decides "no change
            // needed" would still leave the column stuck at that wide
            // reset.
            fitWidth(study);
            resizeBoard();
        }
    }

    function fitHeight(study) {
        // Once a reader has manually dragged a study's divider (flagged
        // on the element itself, below, so it's visible from both the
        // per-study drag handlers and this shared function), every
        // *automatic* re-fit from here on — the ResizeObserver reacting
        // to a puzzle hint row or variation picker appearing, or the
        // scroll listener below reacting to the sticky header shrinking —
        // must stop resetting --left-col-width back to the auto-computed
        // value. Content changes still need to keep adjusting the height
        // and board cap, just never the column position the reader chose.
        capHeight(study, !study.dataset.sahManualWidth);
    }

    var readyStudies = [];

    function watch(study) {
        if (study.dataset.sahDividerFit) return;
        study.dataset.sahDividerFit = '1';

        function ready() {
            fitWidth(study);
            fitHeight(study);
            readyStudies.push(study);

            // Dragging is tracked here (ahead of where it's needed
            // below) so the diagram-settling and .player-wrapper
            // ResizeObservers can both check it: while a reader is
            // actively dragging, they defer to the lighter drag-time
            // cap instead of running the full automatic fit, which
            // resets and re-fits the column, fighting the drag.
            var dragging = false;

            // The panel stays invisible (see main.css:
            // .cp-ready:not(.sah-fitted)) from the moment ChessPublica
            // marks it ready until this class lands, so a reader never
            // sees ChessPublica's own unfitted defaults painted even for
            // a moment before the fit above corrects it — and revealing
            // only happens once *every* input the fit depends on has
            // actually had a chance to settle, not just the first one
            // that happens to resolve. Revealing against any one of
            // these still pending would just trade "starts oversized,
            // shrinks into place" for a smaller version of the same
            // thing once the rest land.
            var revealed = false;
            var pendingBeforeReveal = 0;
            function maybeReveal() {
                if (revealed || pendingBeforeReveal > 0) return;
                revealed = true;
                study.classList.add('sah-fitted');
            }
            function settled() {
                pendingBeforeReveal--;
                maybeReveal();
            }

            // 1) Custom web fonts: the ribbon/title's text metrics
            //    factor into the fit, and a fit computed against
            //    fallback-font metrics visibly reflows once the real
            //    font swaps in.
            if (document.fonts && document.fonts.status !== 'loaded') {
                pendingBeforeReveal++;
                var fontsDone = false;
                var onFontsSettled = function () {
                    if (fontsDone) return;
                    fontsDone = true;
                    fitWidth(study);
                    fitHeight(study);
                    settled();
                };
                // document.fonts.ready never resolving (a blocked font
                // CDN, an ad-blocker, a flaky connection) must not hide
                // the panel forever — fall back on a timer instead of
                // waiting indefinitely for fonts that may never arrive.
                setTimeout(onFontsSettled, 1500);
                document.fonts.ready.then(onFontsSettled);
            }

            // 2) Diagrams embedded in the article (see capHeight's own
            //    diagram-floor logic below): inserted into the DOM
            //    before their own internal board widget has necessarily
            //    finished sizing itself — the same "doesn't have its
            //    final size immediately" issue chessboard.js has for the
            //    main board (see resizeBoard() above), just for these
            //    smaller ones, and just as variable in how long it
            //    takes. Watched directly rather than via .pgn-container:
            //    that element has its own fixed height (from the grid)
            //    and overflow-y: auto, so a diagram growing *inside* it
            //    changes its scrollHeight, never its own box size —
            //    .pgn-container's ResizeObserver would only ever fire
            //    its one mandatory initial-observation notification and
            //    then stay silent no matter what the diagram does. A
            //    single notification from the diagrams themselves isn't
            //    enough to trust as "done" on its own either, since one
            //    can resize more than once while settling, so wait for a
            //    short quiet period with no further resize before
            //    treating it as settled.
            var pgnContainerEl = study.querySelector('.pgn-container');
            var diagramEls = pgnContainerEl
                ? pgnContainerEl.querySelectorAll('.cp-board-wrapper, .fen-container')
                : [];
            if (diagramEls.length && window.ResizeObserver) {
                pendingBeforeReveal++;
                var diagramsDone = false;
                var onDiagramsSettled = function () {
                    if (diagramsDone) return;
                    diagramsDone = true;
                    settled();
                };
                var diagramSettleTimer = setTimeout(onDiagramsSettled, 1500);
                var diagramResizeObserver = new ResizeObserver(function () {
                    if (dragging) return;
                    fitHeight(study);
                    clearTimeout(diagramSettleTimer);
                    diagramSettleTimer = setTimeout(onDiagramsSettled, 120);
                });
                diagramEls.forEach(function (d) { diagramResizeObserver.observe(d); });
            }

            // Both registrations above are synchronous (they only ever
            // *schedule* async work), so pendingBeforeReveal already
            // holds its final starting count by this point — if neither
            // condition needed to register a wait, this reveals right
            // away instead of waiting on a settled() call that will
            // never come.
            maybeReveal();

            var wrapper = study.querySelector('.player-wrapper');
            if (wrapper && window.ResizeObserver) {
                new ResizeObserver(function () {
                    if (dragging) return;
                    fitHeight(study);
                }).observe(wrapper);
            }

            var resizer = study.querySelector('.pgn-study-resizer');
            if (resizer) {
                var dragCapPending = false;
                // ChessPublica's own pointermove handler on this same
                // element (registered first, when the component was set
                // up, so it runs before ours on every event) writes
                // --left-col-width straight from the pointer position,
                // clamped only by its own container-width-based ceiling —
                // it knows nothing about our viewport-height cap, or
                // about the board never being allowed smaller than the
                // article's largest diagram. Left alone, the reader
                // could drag the divider well past the point the board
                // actually stops growing (into dead space), or narrow it
                // past the point the board would end up smaller than
                // that diagram. maxColWidthDuringDrag/minColWidthDuringDrag
                // are the column-width equivalents of those two ceilings/
                // floors; clampColumnWidth() pulls a too-wide or too-
                // narrow column back to whichever it violates,
                // synchronously, in the same tick as ChessPublica's own
                // write, so the divider itself stops right there instead
                // of the board just quietly refusing to follow it.
                var maxColWidthDuringDrag = null;
                var minColWidthDuringDrag = null;

                function computeMaxColWidth(cappedBoardPx) {
                    var player = study.querySelector('pgn-player');
                    var pad = parseFloat(getComputedStyle(player).paddingLeft || 0) +
                        parseFloat(getComputedStyle(player).paddingRight || 0);
                    return cappedBoardPx / 0.94 + 2 + pad;
                }

                // Same conversion as computeMaxColWidth (and fitWidth()'s
                // own board-width-to-column-width math) — kept separate
                // since the two ceilings/floors come from unrelated
                // sources and are refreshed on different schedules below.
                var computeMinColWidth = computeMaxColWidth;

                function refreshMinColWidth() {
                    // The article column narrows as the board column
                    // widens, which can shrink the diagram itself (it's
                    // capped at its own natural size, not a fixed one) —
                    // so this floor isn't a constant for the whole drag
                    // and has to be re-measured from the diagram's
                    // *current* rendered size, not just computed once.
                    var diagram = tallestDiagram(study);
                    minColWidthDuringDrag = diagram ? computeMinColWidth(diagram.size) : null;
                }

                function clampColumnWidth() {
                    var current = parseFloat(
                        getComputedStyle(study).getPropertyValue('--left-col-width')
                    );
                    var clamped = current;
                    if (maxColWidthDuringDrag != null && clamped > maxColWidthDuringDrag) {
                        clamped = maxColWidthDuringDrag;
                    }
                    if (minColWidthDuringDrag != null && clamped < minColWidthDuringDrag) {
                        clamped = minColWidthDuringDrag;
                    }
                    if (clamped !== current) {
                        study.style.setProperty('--left-col-width', clamped + 'px');
                    }
                }

                resizer.addEventListener('pointerdown', function () {
                    dragging = true;
                    maxColWidthDuringDrag = null;
                    // Unlike the height ceiling above (which only ever
                    // matters once a drag has actually made the board
                    // tall enough to trigger it), the diagram floor is
                    // knowable immediately — measure it right away so
                    // even the very first pointermove is already
                    // protected, rather than waiting one throttled frame
                    // for it to catch up.
                    refreshMinColWidth();
                });
                resizer.addEventListener('pointermove', function () {
                    if (!dragging) return;
                    study.dataset.sahManualWidth = '1';
                    clampColumnWidth();
                    if (dragCapPending) return;
                    dragCapPending = true;
                    requestAnimationFrame(function () {
                        dragCapPending = false;
                        if (!dragging) return;
                        capHeight(study, false);
                        // capHeight just recomputed --sah-max-board-h (or
                        // cleared it, if the column no longer needs
                        // capping) from the column's current width —
                        // convert it to the equivalent column-width
                        // ceiling so the very next raw pointermove above
                        // can clamp against it immediately, rather than
                        // waiting a full frame for this throttled pass to
                        // come back around.
                        var maxBoardH = parseFloat(
                            getComputedStyle(study).getPropertyValue('--sah-max-board-h')
                        );
                        maxColWidthDuringDrag = maxBoardH ? computeMaxColWidth(maxBoardH) : null;
                        refreshMinColWidth();
                        clampColumnWidth();
                    });
                });
                var stopDrag = function () {
                    if (!dragging) return;
                    clampColumnWidth();
                    // Final settle now that throttling is done — the
                    // column itself is left exactly where the reader put
                    // it (resetColumn: false), only the height/cap are
                    // confirmed. Crucially, `dragging` stays true through
                    // this call: it resizes .player-wrapper itself (via
                    // --sah-max-board-h/resizeBoard()), which re-triggers
                    // the very same ResizeObserver this flag guards.
                    // Clearing the flag first let that self-triggered
                    // notification through, which ran the *full* auto-fit
                    // and reset the column right back — undoing the drag
                    // a moment after releasing it. Per spec, a resize
                    // observer fires *after* this frame's rAF callbacks,
                    // so a single rAF isn't late enough to be sure we've
                    // been notified and ignored it; a rAF nested inside
                    // another one is guaranteed to land in the *next*
                    // frame, after this one's delivery has already
                    // happened.
                    capHeight(study, false);
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            dragging = false;
                        });
                    });
                };
                resizer.addEventListener('pointerup', stopDrag);
                resizer.addEventListener('pointercancel', stopDrag);
            }
        }

        if (study.classList.contains('cp-ready')) { ready(); return; }
        var mo = new MutationObserver(function () {
            if (study.classList.contains('cp-ready')) {
                mo.disconnect();
                ready();
            }
        });
        mo.observe(study, { attributes: true, attributeFilter: ['class'] });
    }

    // fitHeight's viewport-fit budget depends on the sticky header's
    // current height, which shrinks once the page scrolls (see the
    // header-scroll handler above) — typically well after a study has
    // already run its initial, more conservative fit against the
    // header's still-full-size height. Re-run it as scrolling settles so
    // the board can grow into the room the header frees up, without
    // recalculating on every scroll tick.
    var scrollFitPending = false;
    window.addEventListener('scroll', function () {
        if (scrollFitPending) return;
        scrollFitPending = true;
        requestAnimationFrame(function () {
            scrollFitPending = false;
            readyStudies.forEach(fitHeight);
        });
    }, { passive: true });

    document.querySelectorAll('pgn-study').forEach(watch);
    new MutationObserver(function (records) {
        records.forEach(function (r) {
            r.addedNodes.forEach(function (n) {
                if (n.nodeType !== 1) return;
                if (n.tagName === 'PGN-STUDY') watch(n);
                if (n.querySelectorAll) n.querySelectorAll('pgn-study').forEach(watch);
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
})();
