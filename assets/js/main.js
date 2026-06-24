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
