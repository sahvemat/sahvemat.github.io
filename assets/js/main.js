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
        // own layout math.
        const target = Math.max(160, Math.min(380, content - 25));
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

    // ChessPublica draws [%cal] arrows and [%csl] squares synchronously
    // right after board.position() starts chessboardjs's piece animation
    // (~200ms). Result: arrows pop in before the piece arrives. Defer
    // the overlay render until the animation finishes, and clear the
    // previous arrow immediately on each move so it doesn't linger.
    // A `{...[P]...}` PGN comment makes ChessPublica pause autoplay on its
    // own the moment it reaches that move (see goTo's native
    // commentBox.update()-triggered pause() call) — no extra JS is needed
    // for the pause itself. This only adds a visual cue for it: dim the
    // board while it's sitting at one of those marker positions.
    function updateMarkerPauseClass(engine) {
        const comment = engine.state && engine.state.comments && engine.state.comments[engine.state.index - 1];
        const isMarkerPause = !engine.state.playing && !!comment && /\[P\]/.test(comment);
        engine.container.classList.toggle('post-game-marker-paused', isMarkerPause);
    }

    const ANIM_MS = 220;
    function patchOverlayTiming(el) {
        const engine = el._engine;
        if (!engine || engine.__sahOverlayPatched) return;
        engine.__sahOverlayPatched = true;
        const origDraw = typeof engine._drawLastMoveArrow === 'function'
            ? engine._drawLastMoveArrow.bind(engine) : null;
        const origRender = typeof engine.renderAnnotations === 'function'
            ? engine.renderAnnotations.bind(engine) : null;
        const origGoTo = typeof engine.goTo === 'function'
            ? engine.goTo.bind(engine) : null;
        const clear = typeof engine.clearOverlay === 'function'
            ? engine.clearOverlay.bind(engine) : null;
        if (origDraw) {
            engine._drawLastMoveArrow = function (idx) {
                const targetIdx = idx;
                setTimeout(function () {
                    if (engine.state && engine.state.index === targetIdx) {
                        origDraw(targetIdx);
                    }
                }, ANIM_MS);
            };
        }
        if (origRender) {
            engine.renderAnnotations = function (idx) {
                const targetIdx = idx;
                setTimeout(function () {
                    if (engine.state && engine.state.index === targetIdx) {
                        origRender(targetIdx);
                    }
                }, ANIM_MS);
            };
        }
        if (origGoTo && clear) {
            engine.goTo = function (i) {
                clear();
                const result = origGoTo(i);
                updateMarkerPauseClass(engine);
                return result;
            };
        }

        // ChessPublica's autoplay loop seeds _loopLastTick to the first
        // RAF timestamp, so the very first move is delayed by a full
        // `1000 / speed` ms after pressing play — that's the long pause
        // before anything happens. Backdate _loopLastTick when play()
        // is invoked so the next RAF fires the first move immediately,
        // while leaving subsequent ticks at the natural cadence.
        if (typeof engine.play === 'function') {
            const origPlay = engine.play.bind(engine);
            engine.play = function () {
                const result = origPlay.apply(this, arguments);
                if (engine.state && engine.state.playing) {
                    engine._loopLastTick = -1e9;
                }
                updateMarkerPauseClass(engine);
                return result;
            };
        }

        updateMarkerPauseClass(engine);
    }

    function setupOne(el) {
        pollResize(el);
        // Patch overlay timing once the engine is ready
        let patchAttempts = 0;
        const tryPatch = function () {
            if (el._engine) {
                patchOverlayTiming(el);
                return;
            }
            if (patchAttempts++ < 50) setTimeout(tryPatch, 100);
        };
        tryPatch();
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
    var initQueue = [];
    var initBusy = false;

    function activate(ph) {
        var src = ph.dataset.pgnSrc;
        if (!src || !ph.parentNode) return null;
        var player = makePlayer(src);
        ph.parentNode.replaceChild(player, ph);
        if (window.ChessPublica && typeof window.ChessPublica.initAll === 'function') {
            window.ChessPublica.initAll();
        }
        setupOne(player);
        return player;
    }

    function drainQueue() {
        if (initBusy || !initQueue.length) return;
        initBusy = true;
        var ph = initQueue.shift();
        var player = activate(ph);
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
    }

    function enqueue(ph) {
        if (initQueue.indexOf(ph) === -1) initQueue.push(ph);
        drainQueue();
    }
    window.__sahEnqueue = enqueue;

    function initBoards() {
        var placeholders = document.querySelectorAll('.post-game .pgn-placeholder');
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

    function applyFont(el) {
        el.style.fontFamily = SANS;
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

        // Open shadow DOM: inject a stylesheet so future dynamic content inherits it too
        if (pgn.shadowRoot && !pgn.shadowRoot.querySelector('[data-sah-font]')) {
            var s = document.createElement('style');
            s.setAttribute('data-sah-font', '');
            s.textContent = ':host, * { font-family: ' + SANS + ' !important; }';
            pgn.shadowRoot.prepend(s);
        }

        // Light DOM fallback: walk all children and stamp font-family directly
        // (covers cases where shadow DOM is closed or absent)
        pgn.querySelectorAll('*').forEach(applyFont);
        applyFont(pgn);
    }

    function tryCleanAll() {
        document.querySelectorAll('.post-game-view--article pgn').forEach(function (pgn) {
            if (!pgn.dataset.sahCleaned) {
                // Poll until .pgn-container exists (async PGN load)
                var attempts = 0;
                var poll = function () {
                    var root = pgn.shadowRoot || pgn;
                    if (root.querySelector('.pgn-container')) {
                        cleanPgnElement(pgn);
                        pgn.dataset.sahCleaned = '1';
                    } else if (attempts++ < 50) {
                        setTimeout(poll, 100);
                    }
                };
                poll();
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
        if (showArticle && window.__sahCleanPgn) {
            window.__sahCleanPgn(article);
        }
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
        var words = title.split(' ');
        var veIdx = words.indexOf('ve');
        var up = function (w) { return w.toLocaleUpperCase('tr-TR'); };
        if (veIdx === -1) {
            h1.textContent = words.map(up).join(' ');
            return;
        }
        var before = words.slice(0, veIdx).map(up).join(' ');
        var after = ['ve'].concat(words.slice(veIdx + 1).map(up)).join(' ');
        h1.innerHTML = before + '<br><em>' + after + '</em>';
    }

    document.querySelectorAll('.post-title[data-title]').forEach(formatPostTitle);
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
            article.innerHTML = '<pgn src="' + src + '"></pgn>';
            game.appendChild(board);
            game.appendChild(article);
        });
    }

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
            return fetch(src)
                .then(function (r) { return r.text(); })
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
                    var roundLabel = round + '. Tur';

                    var roundEl = game.querySelector('.post-game-round');
                    var playersEl = game.querySelector('.post-game-players');
                    var resultEl = game.querySelector('.post-game-result');
                    if (roundEl) roundEl.textContent = roundLabel;
                    if (playersEl) playersEl.textContent = players;
                    if (resultEl) resultEl.textContent = displayResult;

                    return { id: game.id, roundLabel: roundLabel, players: players, result: displayResult };
                });
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
                        '<span class="archive-card-round">' + g.roundLabel + '</span>' +
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
