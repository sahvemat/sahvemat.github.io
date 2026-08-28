---
title: Mat — Satranç Öğren
layout: default
permalink: /ogren/mat-kavrami/
---

<nav class="piece-breadcrumb">
  <a href="/">Ana Sayfa</a>
  <span class="piece-breadcrumb-sep">/</span>
  <a href="/ogren/">Satranç Öğren</a>
  <span class="piece-breadcrumb-sep">/</span>
  <span>Bölüm 3.2 · Mat</span>
</nav>

<div class="piece-page-hero">
  <div>
    <span class="piece-page-eyebrow">Bölüm 3 · Şah ve Mat — Oyunun tek amacı</span>
    <h1 class="piece-page-title">MAT</h1>
    <p class="piece-page-tagline">Kaçış yolu kalmayan şah tehdidi. Oyun biter, galip belirlenir.</p>
  </div>
  <div class="piece-page-symbol">♚</div>
</div>

<div class="piece-content">
  <div class="piece-text-col">
    <span class="piece-section-label">Mat Kavramı</span>
    <h2 class="piece-section-heading">MAT NEDİR?</h2>
    <p class="piece-text">Mat (checkmate) — şahın tehdit altında olduğu ve kaçacak yasal bir hamlenin kalmadığı durumdur. Mat olduğu anda oyun biter; mat olan taraf kaybeder, başka hamle gerekmez.</p>
    <p class="piece-text">Mat için üç koşulun aynı anda sağlanması gerekir: (1) şah tehdit altında olmalı, (2) şah kaçacak güvenli bir kareye sahip olmamalı, (3) tehdidi tıkamak ya da tehdidi oluşturan taşı almak da mümkün olmamalı.</p>
    <p class="piece-text">En hızlı mat "ahmak matı"dır ve yalnızca 2 hamlede gerçekleşir: 1.f3 e5 2.g4 Vh4#. Dört hamlede gerçekleşen "Scholar's mate" ise 1.e4 e5 2.Af3 Ac6 3.Fc4 Ac6 4.Vh5?? ... Vxf7# ile biten bilinen bir tuzaktır.</p>
    <ul class="move-rules">
      <li class="move-rule">
        <span class="move-rule-icon">♚</span>
        <span class="move-rule-text">Mat: şah tehdidi var ve kaçış yolu yok. Oyun anında biter.</span>
      </li>
      <li class="move-rule">
        <span class="move-rule-icon">🏁</span>
        <span class="move-rule-text">Mat olan taraf kaybeder — başka hamle ya da müzakere gerekmez.</span>
      </li>
      <li class="move-rule">
        <span class="move-rule-icon">🎓</span>
        <span class="move-rule-text">En hızlı mat: ahmak matı — yalnızca 2 hamle.</span>
      </li>
      <li class="move-rule">
        <span class="move-rule-icon">👁</span>
        <span class="move-rule-text">Mat için tüm kaçış kareleri kapatılmalı, tehdit tıkanamaz ve alınamaz olmalıdır.</span>
      </li>
    </ul>
  </div>
  <div class="piece-boards-col">
    <div class="fen-demo-item">
      <span class="fen-demo-label">Ahmak matı — 2 hamlede mat</span>
      <div class="position-card position-card--accent">
        <fen>rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3</fen>
      </div>
      <p class="fen-demo-caption">1.f3 e5 2.g4 Vh4# — Ahmak matı. Siyah vezir h4'ten e1'deki şahı tehdit ediyor; f3 piyonu tıkama imkânını ortadan kaldırdı, g4 ise şahın g1'e kaçmasını engelledi.</p>
    </div>
    <div class="fen-demo-item">
      <span class="fen-demo-label">Mat pozisyonu analizi</span>
      <div class="position-card position-card--dark">
        <fen>r1b2rk1/pppp1Qpp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 6</fen>
      </div>
      <p class="fen-demo-caption">Beyaz vezir f7'de mat uyguluyor. Şah g8'de; h6, h8, f8 hepsi kontrol altında. Veziri almak mümkün değil — şah kurtarılamıyor.</p>
    </div>
  </div>
</div>

<section class="special-rules-section">
  <h2 class="special-rules-title">MAT VE<br>ŞAH FARKI</h2>

  <div class="special-rule-item">
    <div class="special-rule-num">01</div>
    <div>
      <div class="special-rule-name">Şah Tehdidi ≠ Mat</div>
      <p class="special-rule-desc">Şah tehdidi kaçış yolu olduğu sürece mattan farklıdır. Şah altında olan taraf tehdidi yanıtlayarak oyuna devam eder. Mat yalnızca yanıt vermenin imkânsız olduğu anda gerçekleşir.</p>
    </div>
  </div>

  <div class="special-rule-item">
    <div class="special-rule-num">02</div>
    <div>
      <div class="special-rule-name">Mat ile Pat Farkı</div>
      <p class="special-rule-desc">Pat (stalemate) ise şahın tehdit altında olmadığı ama yapılacak yasal hamlenin de kalmadığı durumdur. Mat kaybettirirken pat beraberliğe yol açar. Bu fark son derece önemlidir — özellikle oyunsonu tekniğinde.</p>
    </div>
  </div>

  <div class="special-rule-item">
    <div class="special-rule-num">03</div>
    <div>
      <div class="special-rule-name">Teslim Olmak</div>
      <p class="special-rule-desc">Bir oyuncu mat olmadan da teslim olabilir (resign). Mat kaçınılmaz görüldüğünde ya da büyük materyal dezavantajı varsa teslim olmak standarttır. Şahı devirmek ya da "teslim oluyorum" demek yeterlidir.</p>
    </div>
  </div>
</section>

<div class="piece-pagination">
  <a href="/ogren/sah-tehdidi/" class="piece-prev">
    <span class="pagination-label">← Önceki</span>
    <span class="pagination-piece">Şah Tehdidi</span>
  </a>
  <a href="/ogren/piyon-terfisi/" class="piece-next">
    <span class="pagination-label">Sonraki →</span>
    <span class="pagination-piece">Piyon Terfisi</span>
  </a>
</div>
