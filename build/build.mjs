// Builds site/index.html (en), site/de/index.html, site/hr/index.html and site/i18n.js
// Run: node build/build.mjs
import { I18N } from './i18n.mjs';
import { REVIEWS } from './reviews.mjs';
import { PRICES } from './prices.mjs';
// Link to the Google Business profile (reviews)
const GOOGLE_REVIEWS_URL = 'https://maps.app.goo.gl/eMY9RNvuRiQBUFsK9';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const DOMAIN = 'https://amphoraboat.com';
const LANGS = ['en', 'de', 'hr'];
// Version tag for style and script links: it changes whenever any of them changes,
// so visitors' browsers fetch the new files right after a deploy instead of using old cached ones.
const VER = (() => {
  const h = createHash('sha1');
  for (const f of ['site.css', 'site.js', 'scrollcraft.css', 'scrollcraft.js', 'diag.js']) { try { h.update(readFileSync(join(OUT, f))); } catch (e) {} }
  h.update(JSON.stringify(I18N)); h.update(JSON.stringify(PRICES));
  return h.digest('hex').slice(0, 10);
})();
const pathOf = l => (l === 'en' ? '/' : `/${l}/`);
const fill = v => typeof v === 'string' ? v.replace(/\{full\}/g, PRICES.full).replace(/\{half\}/g, PRICES.half) : v;
const get = (o, p) => fill(p.split('.').reduce((a, k) => (a == null ? a : a[k]), o));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const CH_IMG = ['step1', 'step2', 'step3', null, 'step5', 'step6', null, 'step8', 'step9'];

function template(lang) {
  const base = lang === 'en' ? '' : '../';
  const chapters = CH_IMG.map((img, i) => `
          <li class="page" data-page>
            <article class="page__sheet">
              ${img
                ? `<figure class="page__print"><img class="page__img" src="${base}assets/${img}.webp" width="1000" height="750" loading="lazy" decoding="async" alt="" data-i18n-a="alt:story.c.${i}.alt"></figure>`
                : `<figure class="page__print page__print--soon"><div class="page__img page__img--soon"><span data-i18n="story.soon"></span></div></figure>`}
              <div class="page__text">
                <h3 class="page__h" data-i18n="story.c.${i}.h"></h3>
                <p class="page__p" data-i18n="story.c.${i}.p"></p>
              </div>
            </article>
          </li>`).join('');

  const faq = I18N.en.faq.q.map((_, i) => `
        <details class="faq__item">
          <summary data-i18n="faq.q.${i}.0"></summary>
          <p data-i18n="faq.q.${i}.1"></p>
        </details>`).join('');

  const langLinks = LANGS.map(l =>
    `<a href="${base}${l === 'en' ? (base ? '' : './') : l + '/'}" hreflang="${l}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`
  ).join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{{meta.title}}</title>
<meta name="description" content="{{meta.desc}}">
<meta name="theme-color" content="#06202b">
<link rel="canonical" href="${DOMAIN}${pathOf(lang)}">
${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${DOMAIN}${pathOf(l)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${DOMAIN}/">
<meta property="og:type" content="website">
<meta property="og:title" content="{{meta.title}}">
<meta property="og:description" content="{{meta.desc}}">
<meta property="og:image" content="${DOMAIN}/assets/hero.webp">
<link rel="icon" href="${base}assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Figtree:wght@400;500;600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="${base}assets/hero-m.webp" media="(max-width: 720px)">
<link rel="preload" as="image" href="${base}assets/hero.webp" media="(min-width: 721px)">
<link rel="stylesheet" href="${base}scrollcraft.css?v=${VER}">
<link rel="stylesheet" href="${base}site.css?v=${VER}">
<noscript><style>[data-sc-in],[data-sc-stagger]>*{opacity:1!important;transform:none!important}</style></noscript>
</head>
<body>

<span data-sc-progress></span>

<header class="bar">
  <a class="bar__brand" href="#top" aria-label="Amphora Boat">
    <img src="${base}assets/logo.webp" width="40" height="40" alt="">
    <span>Amphora Boat</span>
  </a>
  <nav class="bar__lang" aria-label="{{nav.lang}}" data-i18n-a="aria-label:nav.lang">${langLinks}</nav>
  <a class="btn btn--sm bar__cta" href="#book" data-i18n="nav.cta"></a>
</header>

<main id="top">

  <!-- 1 · HERO: layered still, flow -->
  <section class="hero" data-sc-act="flow">
    <div class="hero__back" data-sc-parallax="1.6">
      <picture>
        <source media="(max-width: 720px)" srcset="${base}assets/hero-m.webp">
        <img src="${base}assets/hero.webp" width="1280" height="959" alt="" data-i18n-a="alt:hero.alt" fetchpriority="high">
      </picture>
    </div>
    <div class="hero__sea" aria-hidden="true" data-sc-parallax="-0.5"></div>
    <div class="hero__copy">
      <p class="kicker" data-i18n="hero.kicker"></p>
      <h1 class="display display--xl" data-i18n="hero.h"></h1>
      <p class="lede" data-i18n="hero.p"></p>
      <div class="hero__act">
        <a class="btn" href="#book" data-i18n="nav.cta"></a>
        <p class="hero__price" data-i18n="hero.price"></p>
      </div>
    </div>
  </section>

  <ul class="trust">
    <li data-i18n="hero.t1"></li>
    <li data-i18n="hero.t2"></li>
    <li data-i18n="hero.t3"></li>
  </ul>

  <!-- 2 · PRICE -->
  <section class="sec offer" id="price">
    <div class="wrap">
      <div class="sec__head" data-sc-in data-sc-stagger="60">
        <h2 class="display display--lg" data-i18n="offer.h"></h2>
        <p class="lede" data-i18n="offer.p"></p>
      </div>
      <div class="offer__grid" data-sc-in data-sc-stagger="70">
        <article class="rate rate--full">
          <h3 data-i18n="offer.fullName"></h3>
          <p class="rate__price" data-i18n="offer.fullPrice"></p>
          <p data-i18n="offer.fullD"></p>
        </article>
        <article class="rate">
          <h3 data-i18n="offer.halfName"></h3>
          <p class="rate__price" data-i18n="offer.halfPrice"></p>
          <p data-i18n="offer.halfD"></p>
        </article>
      </div>
      <p class="fine" data-i18n="offer.fine"></p>
      <div class="inc" data-sc-in>
        <h3 class="inc__h" data-i18n="offer.incH"></h3>
        <ul class="inc__list">
          <li data-i18n="offer.i1"></li><li data-i18n="offer.i2"></li><li data-i18n="offer.i3"></li>
          <li data-i18n="offer.i4"></li><li data-i18n="offer.i5"></li><li data-i18n="offer.i6"></li>
          <li data-i18n="offer.i7"></li>
        </ul>
      </div>
    </div>
  </section>

  <!-- 3 · THE DAY AS A STORY: the logbook (signature move, bespoke) -->
  <section class="book" id="day" data-book>
    <div class="book__intro">
      <h2 class="display display--lg" data-i18n="story.h"></h2>
      <p class="lede" data-i18n="story.p"></p>
    </div>
    <div class="book__stage">
      <div class="book__head">
        <p class="display display--lg book__h2" aria-hidden="true" data-i18n="story.h"></p>
        <p class="lede book__lede" data-i18n="story.p"></p>
        <div class="book__nav">
          <button type="button" class="round" data-book-prev aria-label="{{story.prev}}" data-i18n-a="aria-label:story.prev">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ol class="book__dots" data-book-dots aria-hidden="true"></ol>
          <button type="button" class="round" data-book-next aria-label="{{story.next}}" data-i18n-a="aria-label:story.next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="book__pad">
        <div class="book__rings" aria-hidden="true"></div>
        <ol class="book__pages" data-book-pages>${chapters}
        </ol>
      </div>
    </div>
  </section>

  <!-- 4 · THE BOAT -->
  <section class="sec boat" id="boat">
    <div class="wrap boat__grid">
      <div class="boat__copy" data-sc-in data-sc-stagger="60">
        <h2 class="display display--lg" data-i18n="boat.h"></h2>
        <p class="lede" data-i18n="boat.p"></p>
        <dl class="specs">
          <div><dt data-i18n="boat.s1k"></dt><dd data-i18n="boat.s1v"></dd></div>
          <div><dt data-i18n="boat.s2k"></dt><dd data-i18n="boat.s2v"></dd></div>
          <div><dt data-i18n="boat.s3k"></dt><dd data-i18n="boat.s3v"></dd></div>
          <div><dt data-i18n="boat.s4k"></dt><dd data-i18n="boat.s4v"></dd></div>
        </dl>
      </div>
      <div class="boat__pics">
        <figure class="boat__a" data-sc-reveal="up"><img src="${base}assets/boat-top.webp" width="800" height="1000" loading="lazy" decoding="async" alt="" data-i18n-a="alt:boat.alt1"></figure>
        <figure class="boat__b" data-sc-reveal="up"><img src="${base}assets/boat-deck.webp" width="1000" height="750" loading="lazy" decoding="async" alt="" data-i18n-a="alt:boat.alt2"></figure>
      </div>
    </div>
  </section>

  <!-- 5 · REVIEWS: real Google reviews, see build/reviews.mjs -->
  <section class="sec reviews" id="reviews">
    <div class="wrap">
      <div class="reviews__top" data-sc-in>
        <h2 class="display display--lg" data-i18n="reviews.h"></h2>
        <div class="reviews__nav"><button type="button" class="round" data-rev-prev aria-label="{{story.prev}}" data-i18n-a="aria-label:story.prev"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="round" data-rev-next aria-label="{{story.next}}" data-i18n-a="aria-label:story.next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
        <p class="reviews__score"><span class="stars" aria-label="5 / 5">${'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.8L10 14.6l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z"/></svg>'.repeat(5)}</span> <span>Google</span></p>
      </div>
    </div>
    <ul class="reviews__row" data-reviews>${REVIEWS.map(r => `
      <li class="rev">
        <figure>
          <div class="rev__head"><span class="stars" aria-label="5 / 5">${'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.5 5.3 5.8.7-4.3 4 1.1 5.8L10 14.6l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z"/></svg>'.repeat(5)}</span><span class="rev__src" data-i18n="reviews.src"></span></div>
          <blockquote class="rev__text" data-rev-text>${r.t.split('\n\n').map(x => `<p>${esc(x)}</p>`).join('')}</blockquote>
          <button type="button" class="rev__more" data-rev-more hidden data-i18n="reviews.more"></button>
          <figcaption class="rev__who"><span class="rev__av" aria-hidden="true">${esc(r.n[0])}</span><span><b>${esc(r.n)}</b><small>${r.y}</small></span></figcaption>
        </figure>
      </li>`).join('')}
    </ul>
    <div class="wrap">
      <a class="btn btn--ghost reviews__link" href="${GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853"/><path d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6Z" fill="#EA4335"/></svg><span data-i18n="reviews.link"></span></a>
    </div>
  </section>

  <!-- 6 · CALENDAR + BOOKING -->
  <section class="sec booking" id="book">
    <div class="wrap">
      <div class="sec__head" data-sc-in data-sc-stagger="60">
        <h2 class="display display--lg" data-i18n="book.h"></h2>
        <p class="lede" data-i18n="book.p"></p>
      </div>
      <div class="booking__grid">
        <div class="cal" data-cal>
          <div class="cal__top">
            <button type="button" class="round round--sm" data-cal-prev aria-label="{{book.prevM}}" data-i18n-a="aria-label:book.prevM">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <p class="cal__month" data-cal-month aria-live="polite"></p>
            <button type="button" class="round round--sm" data-cal-next aria-label="{{book.nextM}}" data-i18n-a="aria-label:book.nextM">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="cal__dow" data-cal-dow aria-hidden="true"></div>
          <div class="cal__grid" data-cal-grid></div>
          <div class="cal__legend">
            <span><i class="half half--free"></i><i class="half half--free"></i><b data-i18n="book.free"></b></span>
            <span><i class="half half--busy"></i><i class="half half--busy"></i><b data-i18n="book.taken"></b></span>
            <span class="cal__ampm"><b data-i18n="book.am"></b> | <b data-i18n="book.pm"></b></span>
          </div>
          <p class="cal__note" data-cal-note hidden></p>
        </div>

        <form class="req" data-req novalidate>
          <p class="req__date" data-req-date aria-live="polite"></p>
          <fieldset class="req__f" data-req-trips>
            <legend data-i18n="book.trip"></legend>
            <label class="opt"><input type="radio" name="trip" value="full"><span><b data-i18n="book.full"></b><small data-i18n="book.fullT"></small></span><em>${lang === 'en' ? '€' + PRICES.full : PRICES.full + ' €'}</em></label>
            <label class="opt"><input type="radio" name="trip" value="am"><span><b data-i18n="book.half1"></b><small data-i18n="book.half1T"></small></span><em>${lang === 'en' ? '€' + PRICES.half : PRICES.half + ' €'}</em></label>
            <label class="opt"><input type="radio" name="trip" value="pm"><span><b data-i18n="book.half2"></b><small data-i18n="book.half2T"></small></span><em>${lang === 'en' ? '€' + PRICES.half : PRICES.half + ' €'}</em></label>
          </fieldset>
          <div class="req__row">
            <fieldset class="req__f">
              <legend data-i18n="book.guests"></legend>
              <div class="step">
                <button type="button" class="round round--sm" data-g="-1" aria-label="{{book.less}}" data-i18n-a="aria-label:book.less">−</button>
                <output data-guests aria-live="polite">4</output>
                <button type="button" class="round round--sm" data-g="1" aria-label="{{book.more}}" data-i18n-a="aria-label:book.more">+</button>
              </div>
            </fieldset>
          </div>
          <label class="req__name"><span data-i18n="book.email"></span><input type="email" name="email" autocomplete="email" inputmode="email" maxlength="120" required aria-describedby="req-email-err"></label>
          <p class="req__err" id="req-email-err" data-email-err hidden data-i18n="book.emailErr"></p>
          <label class="req__name"><span data-i18n="book.name"></span><input type="text" name="name" autocomplete="name" maxlength="60"></label>
          <div class="req__total"><span data-i18n="book.total"></span><strong data-total></strong></div>
          <p class="fine fine--sm" data-i18n="book.fine"></p>
          <a class="btn btn--wide" data-wa href="#book" rel="noopener" aria-disabled="true"><span data-i18n="book.wa"></span></a>
          <p class="req__mail"><a data-mail href="#book"><span data-i18n="book.mail"></span></a> <span class="req__addr" data-mail-addr></span></p>
          <p class="req__mail"><span data-i18n="book.call"></span>: <a data-c="tel2" href="#book"></a></p>
          <p class="req__note" data-i18n="book.note"></p>
        </form>
      </div>
    </div>
  </section>

  <!-- 7 · FAQ -->
  <section class="sec faq" id="faq">
    <div class="wrap wrap--narrow">
      <h2 class="display display--lg" data-sc-in data-i18n="faq.h"></h2>
      <div class="faq__list">${faq}
      </div>
    </div>
  </section>

  <!-- 8 · CLOSE -->
  <section class="close">
    <div class="close__in">
      <img class="close__logo" src="${base}assets/logo.webp" width="180" height="180" loading="lazy" alt="Amphora Boat">
      <h2 class="display display--xl" data-i18n="close.h"></h2>
      <p class="lede" data-i18n="close.p"></p>
      <a class="btn" href="#book" data-i18n="nav.cta"></a>
    </div>
    <footer class="foot">
      <p><strong>Amphora Boat</strong> · <span data-i18n="foot.place"></span></p>
      <ul class="foot__links">
        <li>WhatsApp <a data-c="wa" href="#book"></a></li>
        <li><span data-i18n="foot.phone"></span> <a data-c="tel" href="#book"></a></li>
        <li>Email <a data-c="mail" href="#book"></a></li>
        <li data-ig-row>Instagram <a data-c="ig" href="#book"></a></li>
      </ul>
      <p class="foot__ph" data-foot-ph hidden><span class="tag" data-i18n="foot.ph"></span></p>
      <p class="foot__rights" data-i18n="foot.rights"></p>
      <p class="foot__owner"><a data-owner-link href="${base}owner/index.html" hidden>Owner page (demo)</a></p>
    </footer>
  </section>

</main>

<div class="dock" data-dock>
  <p data-i18n="bar.price"></p>
  <a class="btn btn--sm" href="#book" data-i18n="nav.cta"></a>
</div>

<script>window.AMPHORA_LANG=${JSON.stringify(lang)};</script>
<script>window.AMPHORA_VER="${VER}";</script>
<script src="${base}diag.js?v=${VER}"></script>
<script src="${base}i18n.js?v=${VER}"></script>
<script src="${base}scrollcraft.js?v=${VER}"></script>
<script src="${base}site.js?v=${VER}"></script>
</body>
</html>
`;
}

function render(lang) {
  const d = I18N[lang];
  let html = template(lang);
  // {{key}} tokens (attributes, head)
  html = html.replace(/\{\{([\w.]+)\}\}/g, (_, k) => esc(get(d, k) ?? ''));
  // data-i18n-a="attr:key" -> also set the attribute now
  html = html.replace(/(\s)([\w-]+)="[^"]*"([^>]*?)data-i18n-a="\2:([\w.]+)"/g,
    (m, sp, attr, mid, k) => `${sp}${attr}="${esc(get(d, k) ?? '')}"${mid}data-i18n-a="${attr}:${k}"`);
  // data-i18n="key"></tag> -> fill text
  html = html.replace(/data-i18n="([\w.]+)"([^>]*)><\//g, (m, k, rest) => {
    const v = get(d, k);
    if (v == null) throw new Error(`missing ${lang}:${k}`);
    return `data-i18n="${k}"${rest}>${esc(v)}</`;
  });
  return html;
}

for (const lang of LANGS) {
  const dir = lang === 'en' ? OUT : join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), render(lang));
}
writeFileSync(join(OUT, 'i18n.js'), 'window.AMPHORA_PRICES=' + JSON.stringify(PRICES) + ';\nwindow.AMPHORA_I18N=' + JSON.stringify(I18N) + ';\n');
console.log('built', LANGS.join(', '));
