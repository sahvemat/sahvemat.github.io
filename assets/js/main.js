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
        const inner = card.clientWidth - 2; // minus 1px border each side
        if (!inner) return;
        // 10px for the eval bar + a small buffer
        const target = Math.max(160, Math.min(380, inner - 12));
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
                return origGoTo(i);
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
                return result;
            };
        }
    }

    function moveSettingsToolbar(el) {
        const card = el.closest('.post-game');
        if (!card) return;
        const boardView = card.querySelector('.post-game-view--board') || el.parentNode;
        let attempts = 0;
        const tryMove = function () {
            const toolbar = el.querySelector('.board-toolbar');
            if (toolbar && !toolbar.dataset.moved) {
                toolbar.dataset.moved = '1';
                boardView.insertBefore(toolbar, el);
                return;
            }
            if (!toolbar && attempts++ < 50) setTimeout(tryMove, 100);
        };
        tryMove();
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
        moveSettingsToolbar(el);
        const card = el.closest('.post-game');
        if (card && window.ResizeObserver) {
            const ro = new ResizeObserver(() => refit(el));
            ro.observe(card);
        }
    }

    function initAll() {
        document.querySelectorAll('.post-game pgn-player').forEach(setupOne);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            document.querySelectorAll('.post-game pgn-player').forEach(refit);
        }, 100);
    }, { passive: true });
})();

(function () {
    const LABEL_BOARD = 'Makaleyi oku';
    const LABEL_ARTICLE = 'Tahtaya dön';

    document.querySelectorAll('.post-game-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const game = btn.closest('.post-game');
            if (!game) return;
            const board = game.querySelector('.post-game-view--board');
            const article = game.querySelector('.post-game-view--article');
            if (!board || !article) return;
            const showArticle = btn.dataset.view === 'board';
            board.hidden = showArticle;
            article.hidden = !showArticle;
            btn.dataset.view = showArticle ? 'article' : 'board';
            btn.setAttribute('aria-pressed', showArticle ? 'true' : 'false');
            btn.textContent = showArticle ? LABEL_ARTICLE : LABEL_BOARD;
            if (window.ChessPublica && typeof window.ChessPublica.initAll === 'function') {
                window.ChessPublica.initAll();
            }
            // After swapping back to the board, re-fit so chessboardjs
            // recomputes square sizes for the now-visible board.
            const player = board.querySelector('pgn-player');
            if (player && player._engine && player._engine.board &&
                typeof player._engine.board.resize === 'function') {
                setTimeout(function () {
                    try { player._engine.board.resize(); } catch (e) {}
                }, 50);
            }
        });
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
