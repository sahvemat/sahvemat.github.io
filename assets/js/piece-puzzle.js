/* Piece Puzzle — uses ChessPublica <puzzle> element */
(function () {
  'use strict';

  var NAMES = { wR: 'Kale', wB: 'Fil', wQ: 'Vezir', wN: 'At', wP: 'Piyon', wK: 'Şah' };
  var HINTS = {
    wR: 'Kale yatay veya dikey olarak istediği kadar ilerler.',
    wB: 'Fil çaprazda istediği kadar ilerler.',
    wQ: 'Vezir her yönde istediği kadar ilerler.',
    wN: 'At L şeklinde zıplar ve taşları atlayabilir.',
    wP: 'Piyon ileri hareket eder; çapraz saldırır.',
    wK: 'Şah her yöne tek kare hareket eder.'
  };

  function rand(n) { return Math.floor(Math.random() * n); }

  // ── Legal moves ───────────────────────────────────────────────
  function legalMoves(piece, r, c) {
    var m = [];
    function add(row, col) {
      if (row >= 0 && row < 8 && col >= 0 && col < 8) m.push([row, col]);
    }
    function slide(dr, dc) {
      for (var i = 1; i < 8; i++) {
        var nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
        m.push([nr, nc]);
      }
    }
    switch (piece) {
      case 'wR': slide(1,0); slide(-1,0); slide(0,1); slide(0,-1); break;
      case 'wB': slide(1,1); slide(1,-1); slide(-1,1); slide(-1,-1); break;
      case 'wQ':
        slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
        slide(1,1); slide(1,-1); slide(-1,1); slide(-1,-1); break;
      case 'wN':
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
          .forEach(function(d){ add(r+d[0], c+d[1]); }); break;
      case 'wK':
        for (var dr = -1; dr <= 1; dr++)
          for (var dc = -1; dc <= 1; dc++)
            if (dr || dc) add(r+dr, c+dc);
        break;
      case 'wP':
        if (r > 0) m.push([r-1, c]);
        if (r === 6) m.push([r-2, c]);
        if (r > 0 && c > 0) m.push([r-1, c-1]);
        if (r > 0 && c < 7) m.push([r-1, c+1]);
        break;
    }
    return m;
  }

  // ── Algebraic helpers ─────────────────────────────────────────
  function sq(r, c) { return String.fromCharCode(97 + c) + (8 - r); }

  function moveAlg(piece, pr, pc, tr, tc) {
    var prefix = { wR:'R', wB:'B', wQ:'Q', wN:'N', wK:'K', wP:'' };
    var to = sq(tr, tc);
    if (piece === 'wP') {
      return pc !== tc ? String.fromCharCode(97 + pc) + 'x' + to : to;
    }
    return prefix[piece] + to;
  }

  // ── FEN builder (1 white piece + kings in safe corners) ───────
  function buildFen(piece, pr, pc) {
    var board = [];
    var r, c;
    for (r = 0; r < 8; r++) { board.push([]); for (c = 0; c < 8; c++) board[r].push(null); }

    board[7][0] = 'K';   // white king a1
    board[0][7] = 'k';   // black king h8
    board[pr][pc] = piece[1]; // piece letter (uppercase = white)

    var rows = [];
    for (r = 0; r < 8; r++) {
      var s = '', empty = 0;
      for (c = 0; c < 8; c++) {
        var cell = board[r][c];
        if (!cell) { empty++; }
        else { if (empty) { s += empty; empty = 0; } s += cell; }
      }
      if (empty) s += empty;
      rows.push(s);
    }
    return rows.join('/') + ' w - - 0 1';
  }

  // ── PGN with arrow + yellow square annotation ─────────────────
  function makePgn(piece, pr, pc, tr, tc) {
    var fen  = buildFen(piece, pr, pc);
    var move = moveAlg(piece, pr, pc, tr, tc);
    var from = sq(pr, pc), to = sq(tr, tc);
    // [%cal G...] = green arrow, [%csl Y...] = yellow square (the sun)
    var ann  = '[%cal G' + from + to + '][%csl Y' + to + ']';
    return '[Event "Pratik"]\n[FEN "' + fen + '"]\n[Result "*"]\n\n{ ' + ann + ' } 1. ' + move + ' *\n';
  }

  // ── State helpers ─────────────────────────────────────────────
  var KING_SQUARES = { '7,0': true, '0,7': true }; // a1, h8

  function safeMoves(piece, pr, pc) {
    return legalMoves(piece, pr, pc).filter(function(m){
      return !KING_SQUARES[m[0] + ',' + m[1]];
    });
  }

  function newPiecePos(piece) {
    var pr, pc, tries = 0;
    do {
      pr = (piece === 'wP') ? 3 + rand(3) : rand(8);
      pc = (piece === 'wP') ? 1 + rand(6) : rand(8);
      tries++;
    } while ((KING_SQUARES[pr + ',' + pc] || safeMoves(piece, pr, pc).length < 2) && tries < 80);
    return [pr, pc];
  }

  function pickSun(piece, pr, pc) {
    var moves = safeMoves(piece, pr, pc);
    if (!moves.length) return null;
    var s = moves[rand(moves.length)];
    return { r: s[0], c: s[1] };
  }

  function newState(piece) {
    var pos = newPiecePos(piece);
    return { pr: pos[0], pc: pos[1], sun: pickSun(piece, pos[0], pos[1]), score: 0 };
  }

  // ── Puzzle class ──────────────────────────────────────────────
  function PiecePuzzle(el) {
    this.el = el;
    this.piece = el.dataset.piece || 'wN';
    this.state = newState(this.piece);
    this._blobUrl = null;
    this._observer = null;
    this.render();
  }

  PiecePuzzle.prototype._cleanup = function () {
    if (this._observer) { this._observer.disconnect(); this._observer = null; }
    if (this._blobUrl)  { URL.revokeObjectURL(this._blobUrl); this._blobUrl = null; }
  };

  PiecePuzzle.prototype.render = function () {
    var self = this;
    var st = this.state;
    this._cleanup();
    this.el.innerHTML = '';

    // ── Header bar
    var bar = document.createElement('div');
    bar.className = 'pp-bar';
    bar.innerHTML =
      '<span class="pp-bar-label">' + NAMES[this.piece] + '\'yi hareket ettir</span>' +
      '<span class="pp-bar-score">☀ <strong>' + st.score + '</strong></span>';
    this.el.appendChild(bar);

    // ── ChessPublica puzzle element
    var pgn = makePgn(this.piece, st.pr, st.pc, st.sun.r, st.sun.c);
    this._blobUrl = URL.createObjectURL(new Blob([pgn], { type: 'application/x-chess-pgn' }));

    var wrapper = document.createElement('div');
    wrapper.className = 'pp-puzzle-wrap';

    var puzzleEl = document.createElement('puzzle');
    puzzleEl.setAttribute('src', this._blobUrl);
    wrapper.appendChild(puzzleEl);
    this.el.appendChild(wrapper);

    // Initialize ChessPublica
    if (window.ChessPublica && window.ChessPublica.initAll) {
      window.ChessPublica.initAll();
    }

    // ── Apply overlays once the board squares are in the DOM
    var sunSq = sq(st.sun.r, st.sun.c);
    var overlayAttempts = 0;
    var overlayTimer = setInterval(function () {
      var boardSq = wrapper.querySelector('[data-square="' + sunSq + '"]');
      if (boardSq || ++overlayAttempts > 60) {
        clearInterval(overlayTimer);
        if (!boardSq) return;

        // Hide kings (kept in FEN for legality, invisible to user)
        ['a1', 'h8'].forEach(function (ksq) {
          var kel = wrapper.querySelector('[data-square="' + ksq + '"]');
          if (kel) {
            var img = kel.querySelector('img');
            if (img) img.style.opacity = '0';
          }
        });

        // Sun emoji overlay on target square
        if (!boardSq.querySelector('.pp-sun')) {
          var sunEl = document.createElement('div');
          sunEl.className = 'pp-sun';
          sunEl.textContent = '☀';
          boardSq.appendChild(sunEl);
        }
      }
    }, 50);

    // ── Watch for solve (.cp-fire-solved appears on the puzzle element)
    this._observer = new MutationObserver(function () {
      if (wrapper.querySelector('.cp-fire-solved') || puzzleEl.classList.contains('cp-fire-solved')) {
        self._onSolved();
      }
    });
    this._observer.observe(wrapper, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });

    // ── Hint
    var hint = document.createElement('div');
    hint.className = 'pp-hint';
    hint.textContent = HINTS[this.piece] || '';
    this.el.appendChild(hint);
  };

  PiecePuzzle.prototype._onSolved = function () {
    var self = this;
    var st = this.state;
    st.score++;

    // Piece is now on the sun square — continue from there
    var newPr = st.sun.r, newPc = st.sun.c;
    var nextSun = pickSun(this.piece, newPr, newPc);

    if (nextSun) {
      st.pr = newPr; st.pc = newPc; st.sun = nextSun;
    } else {
      // Edge case: regenerate from scratch
      var pos = newPiecePos(this.piece);
      st.pr = pos[0]; st.pc = pos[1]; st.sun = pickSun(this.piece, st.pr, st.pc);
    }

    setTimeout(function () { self.render(); }, 1000);
  };

  // ── Boot ──────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.piece-puzzle[data-piece]').forEach(function (el) {
      new PiecePuzzle(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
