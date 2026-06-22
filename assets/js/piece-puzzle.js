/* Piece Puzzle — drag and drop movement trainer */
(function () {
  'use strict';

  var NAMES = { wR: 'Kale', wB: 'Fil', wQ: 'Vezir', wN: 'At', wP: 'Piyon', wK: 'Şah' };

  function rand(n) { return Math.floor(Math.random() * n); }

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

  function pickFrom(arr) { return arr[rand(arr.length)]; }

  function newPiecePos(piece) {
    var pr, pc, tries = 0;
    do {
      if (piece === 'wP') { pr = 3 + rand(3); pc = 1 + rand(6); }
      else                { pr = rand(8);      pc = rand(8); }
      tries++;
    } while (legalMoves(piece, pr, pc).length < 2 && tries < 60);
    return [pr, pc];
  }

  function newSun(piece, pr, pc) {
    var moves = legalMoves(piece, pr, pc);
    if (!moves.length) return null;
    var s = pickFrom(moves);
    return { r: s[0], c: s[1] };
  }

  function newState(piece) {
    var pos = newPiecePos(piece);
    var sun = newSun(piece, pos[0], pos[1]);
    return { pr: pos[0], pc: pos[1], sun: sun, score: 0 };
  }

  // ── Chess-style filled arrow ──────────────────────────────────
  function drawArrow(svg, fr, fc, tr, tc) {
    var x1 = fc + 0.5, y1 = fr + 0.5;
    var x2 = tc + 0.5, y2 = tr + 0.5;
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    var ux = dx / len, uy = dy / len;
    var px = -uy, py = ux;

    var startOff = 0.2, endOff = 0.15;
    var bodyW = 0.18, headW = 0.42, headLen = 0.42;
    var sx = x1 + ux * startOff, sy = y1 + uy * startOff;
    var tipX = x2 - ux * endOff,  tipY = y2 - uy * endOff;
    var bx = tipX - ux * headLen,  by = tipY - uy * headLen;

    var pts = [
      [sx + px * bodyW, sy + py * bodyW],
      [bx + px * bodyW, by + py * bodyW],
      [bx + px * headW, by + py * headW],
      [tipX, tipY],
      [bx - px * headW, by - py * headW],
      [bx - px * bodyW, by - py * bodyW],
      [sx - px * bodyW, sy - py * bodyW]
    ];

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M ' + pts.map(function(p){
      return p[0].toFixed(4) + ',' + p[1].toFixed(4);
    }).join(' L ') + ' Z');
    path.setAttribute('fill', 'rgba(74, 222, 128, 0.82)');
    path.setAttribute('stroke', 'rgba(20, 120, 60, 0.35)');
    path.setAttribute('stroke-width', '0.03');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }

  // ── Puzzle class ──────────────────────────────────────────────
  function PiecePuzzle(el) {
    this.el = el;
    this.piece = el.dataset.piece || 'wN';
    this.state = newState(this.piece);
    this.boardEl = null;
    this.render();
  }

  PiecePuzzle.prototype.render = function () {
    var self = this;
    var st = this.state;
    this.el.innerHTML = '';

    // ── Header bar
    var bar = document.createElement('div');
    bar.className = 'pp-bar';
    bar.innerHTML =
      '<span class="pp-bar-label">' + NAMES[this.piece] + '\'yi sürükle</span>' +
      '<span class="pp-bar-score">☀ <strong>' + st.score + '</strong></span>';
    this.el.appendChild(bar);

    // ── Board wrapper
    var wrap = document.createElement('div');
    wrap.className = 'pp-wrap';

    var board = document.createElement('div');
    board.className = 'pp-board';
    this.boardEl = board;

    var moves = legalMoves(this.piece, st.pr, st.pc);
    var legalSet = {};
    moves.forEach(function(m){ legalSet[m[0] + ',' + m[1]] = true; });

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        (function(r, c) {
          var sq = document.createElement('div');
          sq.className = 'pp-sq ' + ((r + c) % 2 === 0 ? 'pp-sq--light' : 'pp-sq--dark');
          sq.dataset.row = r;
          sq.dataset.col = c;

          var isLegal = !!legalSet[r + ',' + c];
          var isSun   = st.sun && st.sun.r === r && st.sun.c === c;
          var isPiece = st.pr === r && st.pc === c;

          if (isLegal) sq.classList.add('pp-sq--legal');
          if (isSun)   sq.classList.add('pp-sq--sun');

          if (isPiece) {
            var img = document.createElement('img');
            img.src = '/assets/img/pieces/' + self.piece + '.png';
            img.className = 'pp-piece';
            img.alt = NAMES[self.piece];
            // Attach drag handler to the piece
            img.addEventListener('pointerdown', function(e) {
              self.startDrag(e, img);
            });
            sq.appendChild(img);
          }

          if (isSun) {
            var sunEl = document.createElement('div');
            sunEl.className = 'pp-sun';
            sunEl.textContent = '☀';
            sq.appendChild(sunEl);
          }

          board.appendChild(sq);
        })(r, c);
      }
    }

    wrap.appendChild(board);

    // ── SVG arrow
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pp-svg');
    svg.setAttribute('viewBox', '0 0 8 8');
    if (st.sun) drawArrow(svg, st.pr, st.pc, st.sun.r, st.sun.c);
    wrap.appendChild(svg);

    this.el.appendChild(wrap);

    // ── Hint
    var hints = {
      wR: 'Kale yatay veya dikey olarak istediği kadar ilerler.',
      wB: 'Fil çaprazda istediği kadar ilerler.',
      wQ: 'Vezir her yönde istediği kadar ilerler.',
      wN: 'At L şeklinde zıplar ve taşları atlayabilir.',
      wP: 'Piyon ileri hareket eder; çapraz saldırır.',
      wK: 'Şah her yöne tek kare hareket eder.'
    };
    var hint = document.createElement('div');
    hint.className = 'pp-hint';
    hint.textContent = hints[this.piece] || '';
    this.el.appendChild(hint);
  };

  // ── Drag logic ────────────────────────────────────────────────
  PiecePuzzle.prototype.startDrag = function (e, pieceEl) {
    e.preventDefault();
    var self = this;

    // Ghost image that follows the pointer
    var ghost = document.createElement('img');
    ghost.src = pieceEl.src;
    ghost.className = 'pp-drag-ghost';
    ghost.style.pointerEvents = 'none';

    // Size ghost to match current square size
    var squarePx = this.boardEl.offsetWidth / 8;
    ghost.style.width  = Math.round(squarePx * 1.1) + 'px';
    ghost.style.height = Math.round(squarePx * 1.1) + 'px';
    document.body.appendChild(ghost);

    var startX = e.clientX, startY = e.clientY;
    var dragged = false;          // true once pointer moves past threshold
    var activeTarget = null;      // pp-sq currently hovered

    function posGhost(cx, cy) {
      var half = ghost.offsetWidth / 2;
      ghost.style.left = (cx - half) + 'px';
      ghost.style.top  = (cy - half) + 'px';
    }
    posGhost(startX, startY);

    function sqAt(cx, cy) {
      // Temporarily hide ghost so it doesn't block elementFromPoint
      ghost.style.visibility = 'hidden';
      var el = document.elementFromPoint(cx, cy);
      ghost.style.visibility = '';
      if (!el) return null;
      var sq = el.closest ? el.closest('.pp-sq') : null;
      if (!sq) {
        // Walk up manually for older browsers
        var cur = el;
        while (cur && cur !== document.body) {
          if (cur.classList && cur.classList.contains('pp-sq')) { sq = cur; break; }
          cur = cur.parentElement;
        }
      }
      return sq;
    }

    function onMove(e) {
      var cx = e.clientX, cy = e.clientY;
      if (!dragged) {
        var dx = cx - startX, dy = cy - startY;
        if (Math.sqrt(dx*dx + dy*dy) < 6) return;
        dragged = true;
        pieceEl.classList.add('pp-piece--dragging');
      }
      posGhost(cx, cy);

      var sq = sqAt(cx, cy);
      if (activeTarget && activeTarget !== sq) {
        activeTarget.classList.remove('pp-sq--drag-over');
        activeTarget = null;
      }
      if (sq && sq.classList.contains('pp-sq--legal')) {
        sq.classList.add('pp-sq--drag-over');
        activeTarget = sq;
      }
    }

    function onEnd(e) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onEnd);
      document.removeEventListener('pointercancel', onEnd);

      if (activeTarget) activeTarget.classList.remove('pp-sq--drag-over');
      pieceEl.classList.remove('pp-piece--dragging');
      ghost.remove();

      if (!dragged) return; // pure tap — ignore

      var sq = sqAt(e.clientX, e.clientY);
      if (sq && sq.classList.contains('pp-sq--legal')) {
        var r = parseInt(sq.dataset.row, 10);
        var c = parseInt(sq.dataset.col, 10);
        self.move(r, c);
      }
    }

    document.addEventListener('pointermove',   onMove);
    document.addEventListener('pointerup',     onEnd);
    document.addEventListener('pointercancel', onEnd);
  };

  // ── Move logic ────────────────────────────────────────────────
  PiecePuzzle.prototype.move = function (r, c) {
    var st = this.state;
    var wasSun = st.sun && st.sun.r === r && st.sun.c === c;

    st.pr = r;
    st.pc = c;
    if (wasSun) st.score++;

    // Keep sun if still reachable; otherwise generate fresh one
    var moves = legalMoves(this.piece, r, c);
    var sunOk = st.sun && !wasSun && moves.some(function(m){
      return m[0] === st.sun.r && m[1] === st.sun.c;
    });
    if (!sunOk) st.sun = newSun(this.piece, r, c);

    this.render();
  };

  // ── Boot ──────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.piece-puzzle[data-piece]').forEach(function(el){
      new PiecePuzzle(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
