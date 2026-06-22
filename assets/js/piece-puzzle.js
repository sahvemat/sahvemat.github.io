/* Piece Puzzle — interactive movement trainer */
(function () {
  'use strict';

  var NAMES = { wR: 'Kale', wB: 'Fil', wQ: 'Vezir', wN: 'At', wP: 'Piyon', wK: 'Şah' };
  var TOTAL_SUNS = 3;

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
      if (piece === 'wP') {
        pr = 3 + rand(3); pc = 1 + rand(6);
      } else {
        pr = rand(8); pc = rand(8);
      }
      tries++;
    } while (legalMoves(piece, pr, pc).length < 2 && tries < 60);
    return [pr, pc];
  }

  function newSun(piece, pr, pc, excludeR, excludeC) {
    var moves = legalMoves(piece, pr, pc);
    var filtered = moves.filter(function(m) {
      return !(m[0] === excludeR && m[1] === excludeC);
    });
    var pool = filtered.length > 0 ? filtered : moves;
    if (pool.length === 0) return null;
    var s = pickFrom(pool);
    return { r: s[0], c: s[1] };
  }

  function newState(piece) {
    var pos = newPiecePos(piece);
    var pr = pos[0], pc = pos[1];
    var sun = newSun(piece, pr, pc, -1, -1);
    return { pr: pr, pc: pc, sun: sun, collected: 0, total: TOTAL_SUNS };
  }

  // ── SVG arrow ───────────────────────────────────────────────
  function drawArrow(svg, fr, fc, tr, tc) {
    var x1 = fc + 0.5, y1 = fr + 0.5;
    var x2 = tc + 0.5, y2 = tr + 0.5;
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    var ux = dx / len, uy = dy / len;
    var px = -uy, py = ux;

    var startOff = 0.28, endOff = 0.22, headLen = 0.3, hw = 0.15;
    var sx = x1 + ux * startOff, sy = y1 + uy * startOff;
    var baseX = x2 - ux * (endOff + headLen), baseY = y2 - uy * (endOff + headLen);
    var tipX = x2 - ux * endOff, tipY = y2 - uy * endOff;

    var color = '#4ade80';

    var shaft = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    shaft.setAttribute('x1', sx); shaft.setAttribute('y1', sy);
    shaft.setAttribute('x2', baseX); shaft.setAttribute('y2', baseY);
    shaft.setAttribute('stroke', color);
    shaft.setAttribute('stroke-width', '0.1');
    shaft.setAttribute('stroke-linecap', 'round');
    svg.appendChild(shaft);

    var head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('points',
      tipX + ',' + tipY + ' ' +
      (baseX + px * hw) + ',' + (baseY + py * hw) + ' ' +
      (baseX - px * hw) + ',' + (baseY - py * hw));
    head.setAttribute('fill', color);
    svg.appendChild(head);
  }

  // ── Puzzle class ─────────────────────────────────────────────
  function PiecePuzzle(el) {
    this.el = el;
    this.piece = el.dataset.piece || 'wN';
    this.state = newState(this.piece);
    this.render();
  }

  PiecePuzzle.prototype.render = function () {
    var self = this;
    var st = this.state;
    this.el.innerHTML = '';

    // ── Header bar
    var bar = document.createElement('div');
    bar.className = 'pp-bar';
    var sunDots = '';
    for (var i = 0; i < st.total; i++) {
      sunDots += '<span class="pp-dot' + (i < st.collected ? ' pp-dot--done' : '') + '">☀</span>';
    }
    bar.innerHTML =
      '<span class="pp-bar-label">' + NAMES[this.piece] + 'yi hareket ettir</span>' +
      '<span class="pp-bar-suns">' + sunDots + '</span>';
    this.el.appendChild(bar);

    // ── Board wrapper
    var wrap = document.createElement('div');
    wrap.className = 'pp-wrap';

    var board = document.createElement('div');
    board.className = 'pp-board';

    var moves = legalMoves(this.piece, st.pr, st.pc);
    var legalSet = {};
    moves.forEach(function(m){ legalSet[m[0] + ',' + m[1]] = true; });

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        (function(r, c) {
          var sq = document.createElement('div');
          var light = (r + c) % 2 === 0;
          sq.className = 'pp-sq ' + (light ? 'pp-sq--light' : 'pp-sq--dark');

          var isLegal = !!legalSet[r + ',' + c];
          var isSun = st.sun && st.sun.r === r && st.sun.c === c;
          var isPiece = st.pr === r && st.pc === c;

          if (isLegal) sq.classList.add('pp-sq--legal');
          if (isSun) sq.classList.add('pp-sq--sun');

          // Piece image
          if (isPiece) {
            var img = document.createElement('img');
            img.src = '/assets/img/pieces/' + self.piece + '.png';
            img.className = 'pp-piece';
            img.alt = NAMES[self.piece];
            sq.appendChild(img);
          }

          // Sun icon
          if (isSun) {
            var sunEl = document.createElement('div');
            sunEl.className = 'pp-sun';
            sunEl.textContent = '☀';
            sq.appendChild(sunEl);
          }

          if (isLegal) {
            sq.addEventListener('click', function() { self.move(r, c); });
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
    if (st.sun) {
      drawArrow(svg, st.pr, st.pc, st.sun.r, st.sun.c);
    }
    wrap.appendChild(svg);

    this.el.appendChild(wrap);

    // ── Hint text
    var hint = document.createElement('div');
    hint.className = 'pp-hint';
    if (this.piece === 'wP') {
      hint.textContent = 'Piyon ileri hareket eder, çapraz saldırır.';
    } else if (this.piece === 'wN') {
      hint.textContent = 'At L şeklinde zıplar ve taşları atlayabilir.';
    } else if (this.piece === 'wK') {
      hint.textContent = 'Şah her yöne tek kare hareket eder.';
    } else if (this.piece === 'wR') {
      hint.textContent = 'Kale yatay veya dikey olarak istediği kadar ilerler.';
    } else if (this.piece === 'wB') {
      hint.textContent = 'Fil çaprazda istediği kadar ilerler.';
    } else if (this.piece === 'wQ') {
      hint.textContent = 'Vezir her yönde istediği kadar ilerler.';
    }
    this.el.appendChild(hint);
  };

  PiecePuzzle.prototype.move = function (r, c) {
    var st = this.state;
    var wasSun = st.sun && st.sun.r === r && st.sun.c === c;

    st.pr = r;
    st.pc = c;

    if (wasSun) {
      st.collected++;
      if (st.collected >= st.total) {
        this.showSuccess();
        return;
      }
      // New sun from new position
      st.sun = newSun(this.piece, r, c, -1, -1);
    } else {
      // Keep old sun if still reachable, otherwise regenerate
      var moves = legalMoves(this.piece, r, c);
      var reachable = st.sun && moves.some(function(m){ return m[0] === st.sun.r && m[1] === st.sun.c; });
      if (!reachable) {
        st.sun = newSun(this.piece, r, c, -1, -1);
      }
    }

    this.render();
  };

  PiecePuzzle.prototype.showSuccess = function () {
    var self = this;
    this.el.innerHTML = '';

    var msg = document.createElement('div');
    msg.className = 'pp-success';
    msg.innerHTML =
      '<span class="pp-success-emoji">🎉</span>' +
      '<span class="pp-success-text">Tebrikler!</span>' +
      '<span class="pp-success-sub">Yeni bulmaca hazırlanıyor…</span>';
    this.el.appendChild(msg);

    setTimeout(function () {
      self.state = newState(self.piece);
      self.render();
    }, 1200);
  };

  // ── Boot ─────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.piece-puzzle[data-piece]').forEach(function(el) {
      new PiecePuzzle(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
