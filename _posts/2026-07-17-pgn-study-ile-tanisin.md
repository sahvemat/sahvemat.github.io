---
layout: post
title: "Yeni Bir İnceleme Deneyimi: pgn-study"
author: "ŞAHvMAT Editörlüğü"
section: "Site Güncellemesi"
event: "Yeni Özellik"
excerpt: "Şimdiye kadar bir partiyi ya tahtada izliyor ya da yorumlarını metin olarak okuyorduk. ChessPublica'nın yeni pgn-study elementiyle ikisi artık aynı ekranda, birbirine bağlı: bir tarafa tıklayın, diğeri anında sizi izliyor."
date: 2026-07-17
FEN: 2r1k2r/1p3pp1/p2p3p/2nPp3/6Pq/4P3/PPPQ2BP/1K1R3R w k - 1 21
reading_time: 4
---

Bir parti okurken hep bir seçim yapmak zorunda kaldık: ya tahtayı hamle hamle izlemek, ya da "Analizi oku" düğmesine basıp yorumları ve varyantları düz metin olarak takip etmek. İkisi ayrı ayrı iyi çalışıyordu, ama aynı anda değil — yorumu okurken tahtaya, tahtaya bakarken yorumu kaçırmadan geri dönmek gerekiyordu.

ChessPublica'nın altyapısına yeni eklenen `pgn-study` elementi bu ayrımı ortadan kaldırıyor. Tahta ve analiz artık yan yana, birbirine bağlı iki panelde: sağdaki metinde bir hamleye tıkladığınızda soldaki tahta o ana atlıyor; tahtada ilerlerken sağdaki imleç aynı hamleyi ve yorumunu takip ediyor. İki panel arasındaki çizgiyi sürükleyerek genişliklerini de kendinize göre ayarlayabiliyorsunuz.

### Neler değişiyor?

- **Senkron okuma** — metindeki her hamle tıklanabilir; tahta ve yorum her zaman aynı anı gösteriyor, ayrı ayrı gezinmeye gerek yok.
- **Oynat / duraklat, hız ve çevir** — üstteki şerit klasik bir video oynatıcı gibi çalışıyor; ok tuşları ve boşluk tuşuyla da kontrol edilebiliyor.
- **Yeniden boyutlandırılabilir** — tahta ile metin arasındaki tutamacı sürükleyip alanı istediğiniz tarafa kaydırabilirsiniz.
- **Katlanabilir** — sağ üstteki simgeyle paneli küçük bir başlık çubuğuna indirip sayfanın geri kalanını okumaya devam edebilirsiniz.
- **Mobilde de çalışıyor** — küçük ekranlarda tahta ve metin üst üste diziliyor; "Metin" düğmesiyle ikisi arasında geçiş yapabiliyorsunuz.

Aşağıda tanıdık bir parti var: [Jan Timman: Batı'nın en iyisi]({% post_url 2026-07-02-timman-bati-nin-en-iyisi %}) yazısından, Timman'ın kendi favorisi dediği Karpov'a karşı 1982 Mar del Plata oyunu. Bu kez tahtayı ve yorumları ayrı ayrı değil, aynı anda okuyabilirsiniz — deneyin:

<pgn-study src="{{ '/assets/pgn/timman/05-karpov-timman-1982.pgn' | relative_url }}"></pgn-study>

Birkaç şey deneyin: 20...♛h4! hamlesine tıklayıp Timman'ın vezirini nasıl oyuna soktuğunu görün, ok tuşlarıyla ileri geri gidin, ya da sağdaki paneli sürükleyerek genişletip yorumları daha büyük punto ile okuyun.

`pgn-study`, önümüzdeki dönemde derinlemesine incelediğimiz partilerde mevcut kartların yanında yerini alacak — özellikle uzun varyantlı, yoğun yorumlu oyunlarda okuma deneyimini belirgin şekilde iyileştiriyor.
