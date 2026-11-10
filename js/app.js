/* ovv13 — site logic */
(() => {
  "use strict";

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const MENU = window.OVV_MENU, CATS = window.OVV_CATEGORIES, POINTS = window.OVV_POINTS;
  const I18N = window.OVV_I18N, SIG = window.OVV_SIGNATURE;
  const WA = "77753070717";
  const byId = Object.fromEntries(MENU.map(d => [d.id, d]));
  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const G = !!(window.gsap && window.ScrollTrigger) && !reduce;
  if (G) { html.classList.add("has-gsap"); gsap.registerPlugin(ScrollTrigger); }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const priceHTML = n => `${fmt(n)}<small>₸</small>`;
  const pad2 = n => String(n).padStart(2, "0");

  let lang = store.get("ovv.lang", "ru");
  if (!I18N[lang]) lang = "ru";
  const t = k => (I18N[lang][k] ?? I18N.ru[k] ?? k);
  const L = o => (o && (o[lang] || o.ru)) || {};
  const imgOf = d => d.photo || `img/plates/${d.plate || "kebab"}.webp`;

  /* ---------------- split text ---------------- */
  function split(el) {
    const out = document.createElement("div");
    const walk = (node, target, inEm) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const chunks = inEm ? [part] : [...part];
            chunks.forEach(ch => { const c = document.createElement("span"); c.className = "c"; c.textContent = ch; w.appendChild(c); });
            target.appendChild(w);
          });
        } else if (n.nodeName === "BR") target.appendChild(document.createElement("br"));
        else if (n.nodeType === 1) { const cl = n.cloneNode(false); walk(n, cl, inEm || n.nodeName === "EM"); target.appendChild(cl); }
      });
    };
    walk(el, out, false);
    el.innerHTML = out.innerHTML;
  }
  function prepSplit(el) {
    split(el);
    if (G && !el.dataset.done) gsap.set($$(".c", el), { yPercent: 115, rotate: 5, opacity: 0 });
  }
  function playSplit(el, delay = 0) {
    el.dataset.done = "1";
    if (!G) return;
    gsap.fromTo($$(".c", el), { yPercent: 115, rotate: 5, opacity: 0 },
      { yPercent: 0, rotate: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.022, delay });
  }

  /* ---------------- i18n ---------------- */
  function applyI18n() {
    html.lang = lang === "kz" ? "kk" : "ru";
    document.title = t("meta.title");
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
      if (el.hasAttribute("data-split")) prepSplit(el);
    });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $$("[data-lang]").forEach(b => b.classList.toggle("is-active", b.dataset.lang === lang));
    const ring = $("[data-ring]"); if (ring) ring.textContent = t("hero.ring").repeat(2);
    renderMarquee(); renderTabs(); renderMenu(false); updateSignature(); renderReviews();
    renderPoints(); renderOccasions(); renderPointSelects(); renderCart();
  }
  function setLang(next) {
    if (next === lang || !I18N[next]) return;
    lang = next; store.set("ovv.lang", lang);
    const targets = $$("main, .ftr, .hdr__in");
    if (G) {
      gsap.to(targets, {
        opacity: 0, duration: .3, ease: "power2.in", onComplete: () => {
          applyI18n(); ScrollTrigger.refresh();
          gsap.to(targets, { opacity: 1, duration: .6, ease: "power2.out" });
        }
      });
    } else applyI18n();
  }
  $$("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

  /* ---------------- marquee ---------------- */
  const mTrack = $("[data-marquee]");
  function renderMarquee() {
    const words = t("marquee");
    const half = [...words, ...words].map(w => `<span class="marquee__item">${esc(w)}</span>`).join("");
    mTrack.innerHTML = half + half;
  }
  (function marqueeLoop() {
    if (reduce) return;
    let x = 0, last = scrollY, boost = 0, dir = 1;
    const tick = () => {
      const y = scrollY, dy = y - last; last = y;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
      boost += (Math.min(Math.abs(dy), 60) * 0.12 - boost) * 0.08;
      x -= (0.45 + boost) * dir;
      const w = mTrack.scrollWidth / 2;
      if (w > 0) { if (x <= -w) x += w; if (x > 0) x -= w; }
      mTrack.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ---------------- signature (zigzag) ---------------- */
  const sigWrap = $("[data-signature]");
  function dustSVG(flip) {
    let c = "";
    for (let i = 0; i < 170; i++) {
      const u = Math.random();
      const x = 20 + u * 140;
      const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 18 * (0.4 + u);
      const y = (flip ? 130 - u * 100 : 30 + u * 100) + spread;
      const r = (Math.random() ** 2) * 0.9 + 0.15;
      c += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" opacity="${(0.25 + Math.random() * 0.6).toFixed(2)}"/>`;
    }
    return `<svg class="sig__dust" viewBox="0 0 180 160" aria-hidden="true"><g>${c}</g></svg>`;
  }
  function buildSignature() {
    sigWrap.innerHTML = SIG.map((id, i) => {
      const d = byId[id]; if (!d) return "";
      return `<article class="sig" data-id="${d.id}">
        <div class="sig__visual">${dustSVG(i % 2 === 1)}
          <div class="plate" data-cursor-key="menu.add"><img src="${imgOf(d)}" alt="" loading="lazy"></div>
        </div>
        <div class="sig__text">
          <span class="sig__num" aria-hidden="true">${pad2(i + 1)}</span>
          <p class="sig__cat" data-sig="cat"></p>
          <h3 class="sig__name" data-sig="name"></h3>
          <p class="sig__desc" data-sig="desc"></p>
          <div class="sig__row"><span class="price">${priceHTML(d.price)}</span>
            <button class="add" type="button" data-add="${d.id}"><svg viewBox="0 0 12 12"><path d="M6 1v10M1 6h10"/></svg><span data-sig="add"></span></button>
          </div>
        </div>
      </article>`;
    }).join("");
    $$(".sig .plate", sigWrap).forEach(p => p.addEventListener("click", () => addToCart(p.closest(".sig").dataset.id, p)));
  }
  function updateSignature() {
    $$(".sig", sigWrap).forEach(a => {
      const d = byId[a.dataset.id], x = L(d);
      $('[data-sig="cat"]', a).textContent = lang === "kz" ? catById[d.cat].kz : catById[d.cat].ru;
      $('[data-sig="name"]', a).textContent = x.n;
      $('[data-sig="desc"]', a).textContent = x.d || "";
      $('[data-sig="add"]', a).textContent = t("menu.add");
      $("img", a).alt = x.n;
    });
  }

  /* ---------------- menu ---------------- */
  const tabsEl = $("[data-tabs]"), ink = $(".tabs__ink"), grid = $("[data-menu-grid]");
  const saucesEl = $("[data-sauces]"), emptyEl = $("[data-menu-empty]"), searchEl = $("[data-search]");
  let activeCat = CATS[0].id, query = "";

  function renderTabs() {
    $$(".tab", tabsEl).forEach(b => b.remove());
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tab"; b.setAttribute("role", "tab"); b.dataset.cat = c.id;
      b.textContent = lang === "kz" ? c.kz : c.ru;
      b.classList.toggle("is-active", c.id === activeCat && !query);
      b.setAttribute("aria-selected", String(c.id === activeCat));
      tabsEl.appendChild(b);
    });
    requestAnimationFrame(moveInk);
  }
  function moveInk() {
    const a = $(".tab.is-active", tabsEl);
    if (!a) { ink.style.width = "0px"; return; }
    ink.style.width = a.offsetWidth + "px";
    ink.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  addEventListener("resize", moveInk);
  tabsEl.addEventListener("click", e => {
    const b = e.target.closest(".tab"); if (!b) return;
    activeCat = b.dataset.cat; query = ""; searchEl.value = "";
    $$(".tab", tabsEl).forEach(x => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-selected", String(x === b)); });
    moveInk();
    b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    renderMenu(true);
  });
  let sTimer;
  searchEl.addEventListener("input", () => {
    clearTimeout(sTimer);
    sTimer = setTimeout(() => {
      query = searchEl.value.trim();
      $$(".tab", tabsEl).forEach(x => x.classList.toggle("is-active", !query && x.dataset.cat === activeCat));
      moveInk(); renderMenu(true);
    }, 160);
  });

  function tagsHTML(d) {
    const tg = d.tags || [];
    if (!tg.length) return "";
    return `<div class="tags">${tg.includes("hit") ? `<span class="tag">${esc(t("menu.hit"))}</span>` : ""}${tg.includes("spicy") ? `<span class="tag tag--spicy">${esc(t("menu.spicy"))}</span>` : ""}</div>`;
  }
  function detailsHTML(d, cls = "") {
    const x = L(d);
    return `<h3 class="${cls}">${esc(x.n)}</h3>
      ${x.d ? `<p class="${cls}">${esc(x.d)}</p>` : ""}
      ${x.c ? `<dl class="${cls}"><dt>${esc(t("menu.comp"))}${d.w ? " · " + esc(d.w) : ""}</dt><dd>${esc(x.c)}</dd></dl>` : ""}
      <div class="row ${cls}"><span class="price">${priceHTML(d.price)}</span>
        <button class="add" type="button" data-add="${d.id}"><svg viewBox="0 0 12 12"><path d="M6 1v10M1 6h10"/></svg>${esc(t("menu.add"))}</button></div>`;
  }
  function dishHTML(d) {
    const x = L(d);
    return `<article class="dish" data-id="${d.id}">
      ${tagsHTML(d)}
      <div class="plate dish__plate" data-cursor-key="menu.more"><img src="${imgOf(d)}" alt="${esc(x.n)}" loading="lazy"></div>
      <h3 class="dish__name">${esc(x.n)}</h3>
      <p class="dish__desc">${esc(x.d || "")}</p>
      <span class="price">${priceHTML(d.price)}</span>
      <div class="dish__pop" aria-hidden="true">
        <div class="plate"><img src="${imgOf(d)}" alt="" loading="lazy"></div>
        ${detailsHTML(d, "anim")}
      </div>
    </article>`;
  }
  function renderMenu(animate) {
    const q = query.toLowerCase();
    const list = q
      ? MENU.filter(d => [d.ru.n, d.kz && d.kz.n, L(d).c, d.ru.c].join(" ").toLowerCase().includes(q))
      : MENU.filter(d => d.cat === activeCat);
    const dishes = list.filter(d => d.cat !== "sauces");
    const sauces = list.filter(d => d.cat === "sauces");
    const draw = () => {
      grid.innerHTML = dishes.map(dishHTML).join("");
      grid.hidden = !dishes.length;
      saucesEl.hidden = !sauces.length;
      saucesEl.innerHTML = sauces.length ? `<h3>${esc(t("menu.sauces"))}</h3>` + sauces.map(s =>
        `<div class="sauce"><span class="sauce__name">${esc(L(s).n)}</span><span class="sauce__dots"></span>
          <span class="price">${priceHTML(s.price)}</span>
          <button class="mini-add" type="button" data-add="${s.id}" aria-label="${esc(t("menu.add"))}">+</button></div>`).join("") : "";
      emptyEl.hidden = !!list.length;
      const items = $$(".dish, .sauce", $("#menu")), plates = $$(".dish__plate", grid);
      if (animate && G && items.length) {
        gsap.fromTo(items, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.045 });
        if (plates.length) gsap.fromTo(plates, { rotate: -120, scale: .6 }, { rotate: 0, scale: 1, duration: 1.4, ease: "expo.out", stagger: 0.045, clearProps: "transform" });
      }
      if (G) ScrollTrigger.refresh();
    };
    if (animate && G && grid.children.length) {
      gsap.to($$(".dish, .sauce", $("#menu")), { y: -20, opacity: 0, duration: .3, ease: "power2.in", stagger: 0.015, onComplete: draw });
    } else draw();
  }

  // hover → enlarged card with full details (desktop)
  if (fine) {
    let openTimer;
    grid.addEventListener("mouseover", e => {
      const d = e.target.closest(".dish"); if (!d || d.classList.contains("is-open")) return;
      clearTimeout(openTimer);
      openTimer = setTimeout(() => { $$(".dish.is-open", grid).forEach(x => x.classList.remove("is-open")); d.classList.add("is-open"); }, 90);
    });
    grid.addEventListener("mouseout", e => {
      const d = e.target.closest(".dish"); if (!d) return;
      if (e.relatedTarget && d.contains(e.relatedTarget)) return;
      clearTimeout(openTimer); d.classList.remove("is-open");
    });
  }
  // touch → bottom sheet
  grid.addEventListener("click", e => {
    if (e.target.closest("[data-add]")) return;
    const d = e.target.closest(".dish"); if (!d) return;
    if (!fine) openSheet(d.dataset.id);
  });

  /* ---------------- sheet ---------------- */
  const sheet = $("[data-sheet]");
  function openSheet(id) {
    const d = byId[id]; if (!d) return;
    $("[data-sheet-body]").innerHTML = `${tagsHTML(d).replace('class="tags"', 'class="tags" style="position:static;justify-content:flex-start;margin-top:22px"')}
      <div class="plate"><img src="${imgOf(d)}" alt=""></div>${detailsHTML(d)}`;
    sheet.classList.add("is-open"); sheet.setAttribute("aria-hidden", "false"); lock(true);
  }
  function closeSheet() { sheet.classList.remove("is-open"); sheet.setAttribute("aria-hidden", "true"); lock(false); }
  $$("[data-close-sheet]").forEach(b => b.addEventListener("click", closeSheet));

  /* ---------------- cart ---------------- */
  let cart = store.get("ovv.cart", {});
  const fcart = $(".fcart"); fcart.hidden = false;
  const drawer = $("[data-drawer]"), orderForm = $("[data-order]");

  function cartItems() { return Object.entries(cart).filter(([id, q]) => byId[id] && q > 0).map(([id, q]) => ({ d: byId[id], q })); }
  function cartSum() { return cartItems().reduce((s, { d, q }) => s + d.price * q, 0); }
  function saveCart() { store.set("ovv.cart", cart); }
  function renderCart() {
    const items = cartItems(), count = items.reduce((s, i) => s + i.q, 0), sum = cartSum();
    $$("[data-cart-count]").forEach(el => { el.textContent = count; });
    $(".cart-btn__count").classList.toggle("is-on", count > 0);
    $$("[data-cart-sum]").forEach(el => { el.textContent = fmt(sum) + " ₸"; });
    fcart.classList.toggle("is-on", count > 0 && !drawer.classList.contains("is-open"));
    fcart.tabIndex = count > 0 ? 0 : -1;
    fcart.setAttribute("aria-hidden", String(count === 0));
    $("[data-cart-list]").innerHTML = items.map(({ d, q }) => `<li class="ci">
        ${d.cat === "sauces" ? `<span class="ci__ph">✦</span>` : `<img src="${imgOf(d)}" alt="">`}
        <div><div class="ci__name">${esc(L(d).n)}</div><div class="ci__price">${fmt(d.price)} ₸ × ${q} = ${fmt(d.price * q)} ₸</div></div>
        <div class="qty"><button type="button" data-dec="${d.id}" aria-label="−">−</button><span>${q}</span><button type="button" data-inc="${d.id}" aria-label="+">+</button></div>
      </li>`).join("");
    $("[data-cart-empty]").hidden = items.length > 0;
    orderForm.hidden = items.length === 0;
    $("[data-send-order]").disabled = items.length === 0;
    $("[data-send-order]").style.opacity = items.length ? "" : ".4";
  }
  function addToCart(id, fromEl) {
    if (!byId[id]) return;
    cart[id] = (cart[id] || 0) + 1; saveCart(); renderCart();
    toast(t("cart.added") + " · " + L(byId[id]).n);
    flyToCart(fromEl);
    const btn = $(".cart-btn");
    if (G) gsap.fromTo(btn, { scale: 1 }, { scale: 1.18, duration: .25, yoyo: true, repeat: 1, ease: "power2.out", delay: .55 });
  }
  function setQty(id, q) { if (q <= 0) delete cart[id]; else cart[id] = q; saveCart(); renderCart(); }
  function flyToCart(fromEl) {
    if (!G || !fromEl) return;
    const img = fromEl.querySelector ? (fromEl.matches("img") ? fromEl : fromEl.querySelector("img")) : null;
    const src = img && img.getBoundingClientRect();
    if (!src || !src.width) return;
    const target = (fcart.classList.contains("is-on") ? fcart : $(".cart-btn")).getBoundingClientRect();
    const f = document.createElement("img"); f.src = img.src; f.className = "fly";
    Object.assign(f.style, { left: src.left + "px", top: src.top + "px", width: src.width + "px", height: src.height + "px" });
    document.body.appendChild(f);
    gsap.to(f, {
      x: target.left + target.width / 2 - (src.left + src.width / 2),
      y: target.top + target.height / 2 - (src.top + src.height / 2),
      scale: 34 / src.width, rotate: 220, duration: .9, ease: "power3.inOut",
      onComplete: () => f.remove()
    });
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-add]");
    if (a) {
      const holder = a.closest(".dish, .sig, .sheet__panel");
      addToCart(a.dataset.add, holder ? holder.querySelector(".plate img") : null);
      const orig = a.innerHTML; a.innerHTML = "✓"; a.disabled = true;
      setTimeout(() => { a.innerHTML = orig; a.disabled = false; }, 900);
      return;
    }
    const inc = e.target.closest("[data-inc]"); if (inc) { setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1); return; }
    const dec = e.target.closest("[data-dec]"); if (dec) { setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1); return; }
    if (e.target.closest("[data-open-cart]")) openCart();
    if (e.target.closest("[data-close-cart]")) closeCart();
  });
  function openCart() { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); lock(true); renderCart(); }
  function closeCart() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); lock(false); renderCart(); }

  orderForm.addEventListener("change", e => {
    if (e.target.name === "type") $("[data-address-field]").hidden = e.target.value !== "delivery";
  });
  $("[data-send-order]").addEventListener("click", () => {
    const f = orderForm, err = $("[data-err]", f), F = n => f.elements.namedItem(n);
    const type = f.querySelector('[name="type"]:checked').value;
    const name = F("name").value.trim(), phone = F("phone").value.trim(), address = F("address").value.trim(), comment = F("comment").value.trim();
    const bad = [[!name, F("name")], [!phone, F("phone")], [type === "delivery" && !address, F("address")]];
    bad.forEach(([b, el]) => el.closest(".field").classList.toggle("is-error", !!b));
    if (bad.some(([b]) => b)) { err.textContent = t("cart.required"); err.hidden = false; return; }
    err.hidden = true;
    const p = POINTS.find(x => x.id === F("point").value) || POINTS[0];
    const lines = cartItems().map(({ d, q }) => `• ${L(d).n} × ${q} — ${fmt(d.price * q)} ₸`);
    const msg = [t("wa.order"), "", ...lines, "", `${t("wa.total")}: ${fmt(cartSum())} ₸`,
      `${t("wa.type")}: ${type === "delivery" ? t("cart.delivery") : t("cart.pickup")}`,
      `${t("wa.point")}: ${L(p).n} (${L(p).a})`, `${t("wa.name")}: ${name}`, `${t("wa.phone")}: ${phone}`,
      type === "delivery" ? `${t("wa.address")}: ${address}` : "", comment ? `${t("wa.comment")}: ${comment}` : ""
    ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n").replace(/\n+$/, "");
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });

  /* ---------------- booking ---------------- */
  const bForm = $("[data-booking]");
  (() => {
    const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000);
    const iso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const dEl = bForm.elements.namedItem("date"); dEl.min = iso; dEl.value = iso;
  })();
  function renderOccasions() {
    const box = $("[data-occasions]");
    const cur = (box.querySelector("input:checked") || {}).value || "0";
    box.innerHTML = t("book.occ").map((o, i) =>
      `<label class="chip"><input type="radio" name="occasion" value="${i}" ${String(i) === cur ? "checked" : ""}><span>${esc(o)}</span></label>`).join("");
  }
  function renderPointSelects() {
    $$("[data-point-select]").forEach(sel => {
      const cur = sel.value || "rest";
      sel.innerHTML = POINTS.map(p => `<option value="${p.id}">${esc(L(p).t)} · ${esc(L(p).a)}</option>`).join("");
      sel.value = cur;
    });
  }
  bForm.addEventListener("submit", e => {
    e.preventDefault();
    const f = bForm, err = $("[data-err]", f), F = n => f.elements.namedItem(n), V = n => F(n).value.trim();
    const req = ["name", "phone", "date", "time"].map(F);
    req.forEach(el => el.closest(".field").classList.toggle("is-error", !el.value.trim()));
    if (req.some(el => !el.value.trim())) { err.textContent = t("book.required"); err.hidden = false; return; }
    err.hidden = true;
    const p = POINTS.find(x => x.id === V("point")) || POINTS[0];
    const occ = t("book.occ")[+(f.querySelector('[name="occasion"]:checked') || { value: 0 }).value];
    const [yy, mm, dd] = V("date").split("-");
    const msg = [t("wa.book"), "",
      `${t("wa.point")}: ${L(p).n} (${L(p).a})`, `${t("wa.date")}: ${dd}.${mm}.${yy}`, `${t("wa.time")}: ${V("time")}`,
      `${t("wa.guests")}: ${V("guests") || 2}`, `${t("wa.occasion")}: ${occ}`,
      `${t("wa.name")}: ${V("name")}`, `${t("wa.phone")}: ${V("phone")}`,
      V("comment") ? `${t("wa.comment")}: ${V("comment")}` : ""].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });

  /* ---------------- reviews ---------------- */
  const qText = $("[data-quote-text]"), qDots = $("[data-quote-dots]");
  let qi = 0, qTimer;
  function showQuote(i, anim) {
    const items = t("rev.items"); qi = (i + items.length) % items.length;
    qText.textContent = items[qi];
    $$("button", qDots).forEach((b, k) => b.classList.toggle("is-active", k === qi));
    if (anim && G) {
      split(qText);
      gsap.fromTo($$(".c", qText), { opacity: 0, yPercent: 60, filter: "blur(6px)" },
        { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 1, ease: "expo.out", stagger: 0.012 });
    }
    clearInterval(qTimer); qTimer = setInterval(() => showQuote(qi + 1, true), 6500);
  }
  function renderReviews() {
    qDots.innerHTML = t("rev.items").map((_, k) => `<button type="button" aria-label="${k + 1}"></button>`).join("");
    showQuote(qi, false);
    $("[data-ratings]").innerHTML = POINTS.map(p => `<div class="rating-card spot"><b>${p.rating.toFixed(1)}</b>
      <span>${esc(L(p).t)} · ${esc(L(p).a)}</span><span>${fmt(p.votes)} ${esc(t("pts.votes"))}</span></div>`).join("");
  }
  qDots.addEventListener("click", e => { const b = e.target.closest("button"); if (b) showQuote($$("button", qDots).indexOf(b), true); });

  /* ---------------- points & map ---------------- */
  function isOpen(h) {
    if (!h) return null;
    const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000); // Kokshetau UTC+5
    const m = now.getHours() * 60 + now.getMinutes(), o = h[0] * 60 + h[1], c = h[2] * 60 + h[3];
    return c > o ? (m >= o && m < c) : (m >= o || m < c);
  }
  const hoursText = h => h ? `${t("pts.daily")} ${pad2(h[0])}:${pad2(h[1])}–${pad2(h[2])}:${pad2(h[3])}` : t("pts.tbd");
  let map, markers = {};
  function renderPoints() {
    $("[data-points]").innerHTML = POINTS.map((p, i) => {
      const x = L(p), open = isOpen(p.hours);
      return `<article class="pcard spot ${i === 0 ? "is-active" : ""}" data-point="${p.id}" data-reveal-pt>
        <div class="pcard__top"><span class="pcard__type">${esc(x.t)}</span>
          ${open === null ? "" : `<span class="status ${open ? "is-open" : ""}"><i></i>${esc(open ? t("pts.open") : t("pts.closed"))}</span>`}</div>
        <h3>${esc(x.n)}</h3>
        <p class="pcard__addr">${esc(x.a)}</p>
        <p class="pcard__meta">${esc([x.f, hoursText(p.hours)].filter(Boolean).join(" · "))}</p>
        <div class="pcard__foot"><span><b>${p.rating.toFixed(1)}</b>${fmt(p.votes)} ${esc(t("pts.votes"))}</span>
          <a class="link-line" href="${p.gis}" target="_blank" rel="noopener"><span>${esc(t("pts.route"))}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M7 17 17 7M9 7h8v8"/></svg></a></div>
      </article>`;
    }).join("");
    $("[data-foot-points]").innerHTML = POINTS.map(p => `<p>${esc(L(p).t)} — ${esc(L(p).a)}<br>${esc(hoursText(p.hours))}</p>`).join("");
    if (map) Object.entries(markers).forEach(([id, mk]) => mk.setPopupContent(popupHTML(POINTS.find(p => p.id === id))));
  }
  const popupHTML = p => `<b>${esc(L(p).n)}</b>${esc(L(p).t)}<br>${esc(L(p).a)}`;
  $("[data-points]").addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const c = e.target.closest(".pcard"); if (!c) return;
    $$(".pcard").forEach(x => x.classList.toggle("is-active", x === c));
    const p = POINTS.find(x => x.id === c.dataset.point);
    if (map && p) { map.flyTo([p.lat, p.lng], 16, { duration: 1.2 }); markers[p.id].openPopup(); }
  });
  function initMap() {
    const el = $("[data-map]");
    if (!window.L) { el.innerHTML = `<a class="link-line" style="margin:24px" href="${POINTS[0].gis}" target="_blank" rel="noopener"><span>2GIS</span></a>`; return; }
    map = window.L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    window.L.tileLayer("https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}", {
      attribution: '&copy; <a href="https://2gis.kz" target="_blank" rel="noopener">2GIS</a>',
      subdomains: "0123", maxZoom: 18
    }).addTo(map);
    POINTS.forEach((p, i) => {
      const icon = window.L.divIcon({ className: "", html: `<div class="pin ${i === 0 ? "pin--main" : ""}"></div>`, iconSize: i === 0 ? [24, 24] : [18, 18], iconAnchor: i === 0 ? [12, 12] : [9, 9] });
      markers[p.id] = window.L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(popupHTML(p));
    });
    const fit = () => { map.invalidateSize(); map.fitBounds(POINTS.map(p => [p.lat, p.lng]), { padding: [60, 60] }); };
    fit(); setTimeout(fit, 600);
    if (G) ScrollTrigger.addEventListener("refresh", () => map.invalidateSize());
  }
  new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { initMap(); ob.disconnect(); } }, { rootMargin: "400px" }).observe($("[data-map]"));

  /* ---------------- lightbox ---------------- */
  const lb = $("[data-lightbox]");
  $("[data-gallery]").addEventListener("click", e => {
    const g = e.target.closest(".gitem"); if (!g) return;
    $("img", lb).src = $("img", g).src; lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); lock(true);
  });
  const closeLb = () => { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); lock(false); };
  lb.addEventListener("click", e => { if (e.target === lb || e.target.closest("[data-close-lightbox]")) closeLb(); });

  /* ---------------- toast ---------------- */
  const toastEl = $("[data-toast]"); let tt;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("is-on"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("is-on"), 1800); }

  /* ---------------- smooth scroll (Lenis) ---------------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    if (G) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(tm => lenis.raf(tm * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = tm => { lenis.raf(tm); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    $$(".drawer__body, .sheet__panel, .tabs, .mnav").forEach(el => el.setAttribute("data-lenis-prevent", ""));
  }
  let locks = 0;
  function lock(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    document.body.classList.toggle("is-locked", locks > 0);
    if (lenis) locks > 0 ? lenis.stop() : lenis.start();
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute("href"); const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (mnav.classList.contains("is-open")) toggleMnav(false);
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -10, duration: 1.6, easing: x => 1 - Math.pow(1 - x, 4) });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------------- header & mobile nav ---------------- */
  const hdr = $(".hdr"), mnav = $(".mnav"), burger = $(".burger");
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    hdr.classList.toggle("is-solid", y > 40);
    hdr.classList.toggle("is-hidden", y > 500 && y > lastY + 2 && !mnav.classList.contains("is-open"));
    if (y < lastY - 2) hdr.classList.remove("is-hidden");
    lastY = y;
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function toggleMnav(on) {
    mnav.classList.toggle("is-open", on); burger.classList.toggle("is-open", on);
    mnav.setAttribute("aria-hidden", String(!on)); lock(on);
  }
  burger.addEventListener("click", () => toggleMnav(!mnav.classList.contains("is-open")));
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (lb.classList.contains("is-open")) closeLb();
    else if (sheet.classList.contains("is-open")) closeSheet();
    else if (drawer.classList.contains("is-open")) closeCart();
    else if (mnav.classList.contains("is-open")) toggleMnav(false);
  });

  /* ---------------- cursor, glow, spotlight, magnetic ---------------- */
  if (fine) {
    html.classList.add("has-cursor");
    const cur = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label"), glow = $(".glow");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my;
    addEventListener("mousemove", e => {
      mx = e.clientX; my = e.clientY; glow.classList.add("is-on"); cur.style.opacity = 1;
      const s = e.target.closest && e.target.closest(".spot");
      if (s) { const r = s.getBoundingClientRect(); s.style.setProperty("--mx", (mx - r.left) + "px"); s.style.setProperty("--my", (my - r.top) + "px"); }
    }, { passive: true });
    document.addEventListener("mouseleave", () => { cur.style.opacity = 0; glow.classList.remove("is-on"); });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", e => {
      const v = e.target.closest("[data-cursor], [data-cursor-key], .gitem");
      const l = e.target.closest("a, button, label, input, select, .pcard");
      cur.classList.toggle("is-view", !!v);
      cur.classList.toggle("is-link", !v && !!l);
      if (v) label.textContent = v.dataset.cursorKey ? t(v.dataset.cursorKey) : (v.dataset.cursor || "+");
    });
    // magnetic buttons
    $$(".magnetic").forEach(el => {
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (G) gsap.to(el, { x: dx * 0.22, y: dy * 0.35, duration: .6, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () => { if (G) gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, .4)" }); });
    });
  }

  /* ---------------- embers (hero canvas) ---------------- */
  (function embers() {
    const cv = $(".embers"), ctx = cv.getContext("2d"); if (!ctx) return;
    let w, h, dpr, parts = [], running = true, mx = -999, my = -999;
    const N = () => Math.round(Math.min(90, Math.max(30, innerWidth / 18)));
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: reduce ? 18 : N() }, () => spawn(true));
    }
    function spawn(any) {
      return { x: Math.random() * w, y: any ? Math.random() * h : h + 10, vx: (Math.random() - .5) * .3, vy: -(.35 + Math.random() * 1.1),
        r: .5 + Math.random() * 1.9, life: 0, max: 260 + Math.random() * 400, ph: Math.random() * 6.28, hot: Math.random() };
    }
    cv.parentElement.addEventListener("mousemove", e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    cv.parentElement.addEventListener("mouseleave", () => { mx = my = -999; });
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.life++; p.ph += .05;
        p.x += p.vx + Math.sin(p.ph) * .35; p.y += p.vy;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 16000) { const f = (1 - d2 / 16000) * 1.6; const d = Math.sqrt(d2) || 1; p.x += dx / d * f; p.y += dy / d * f; }
        const a = Math.max(0, Math.min(1, p.life / 40) * (1 - p.life / p.max)) * (.55 + Math.sin(p.ph * 2) * .25);
        const col = p.hot > .6 ? "255,190,120" : "232,120,58";
        ctx.fillStyle = `rgba(${col},${a * .16})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4.5, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        if (p.life > p.max || p.y < -20) Object.assign(p, spawn(false));
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize(); addEventListener("resize", resize);
    new IntersectionObserver(en => { const v = en[0].isIntersecting; if (v && !running) { running = true; requestAnimationFrame(frame); } running = v; }).observe(cv);
    requestAnimationFrame(frame);
  })();

  /* ---------------- init content ---------------- */
  buildSignature();
  applyI18n();

  /* ---------------- GSAP animations ---------------- */
  if (!G) return;

  // preloader → hero intro
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
  const pre = gsap.timeline();
  pre.to(".preloader__mark > *", { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.06 })
     .to(".preloader__line i", { scaleX: .7, duration: 1.2, ease: "power2.inOut" }, 0);
  if (lenis) lenis.stop();
  fontsReady.then(() => {
    pre.then(() => {
      const tl = gsap.timeline({ onComplete: () => { $(".preloader").remove(); if (lenis) lenis.start(); ScrollTrigger.refresh(); } });
      tl.to(".preloader__line i", { scaleX: 1, duration: .4, ease: "power2.out" })
        .to(".preloader__mark > *", { yPercent: -110, duration: .7, ease: "expo.in", stagger: 0.04 }, "-=.1")
        .to(".preloader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "-=.2")
        .fromTo(".hero__bg img", { scale: 1.3 }, { scale: 1.12, duration: 2.6, ease: "expo.out" }, "-=.7")
        .to(".hero .script", { clipPath: "inset(-40% -10% -40% -10%)", duration: 1.6, ease: "power2.inOut" }, "-=2.3")
        .add(() => playSplit($(".hero__title")), "-=2.1")
        .fromTo(".hero .plate--hero", { opacity: 0, rotate: -200, scale: .45 }, { opacity: 1, rotate: 0, scale: 1, duration: 2.2, ease: "expo.out" }, "-=2.2")
        .fromTo(".hero [data-reveal]", { opacity: 0, y: 30, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: .12 }, "-=1.6")
        .from(".hdr__in > *", { y: -20, opacity: 0, duration: 1, ease: "expo.out", stagger: .08 }, "<");
    });
  });

  // hero scroll parallax + mouse tilt
  gsap.to(".hero__bg img", { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__visual", { rotate: 50, yPercent: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
  gsap.to(".hero__text", { yPercent: -12, opacity: .2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  if (fine) {
    const hv = $(".plate--hero"), qx = gsap.quickTo(hv, "x", { duration: 1.2, ease: "power3.out" }), qy = gsap.quickTo(hv, "y", { duration: 1.2, ease: "power3.out" });
    $(".hero").addEventListener("mousemove", e => { qx((e.clientX / innerWidth - .5) * 30); qy((e.clientY / innerHeight - .5) * 30); });
  }

  // split headings (outside hero)
  $$("[data-split]").filter(el => !el.closest(".hero")).forEach(el => {
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => playSplit(el) });
  });
  // script words — handwriting-like wipe
  $$(".script").filter(el => !el.closest(".hero")).forEach(el => {
    gsap.to(el, { clipPath: "inset(-40% -10% -40% -10%)", duration: 1.8, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
  // generic reveals
  ScrollTrigger.batch($$("[data-reveal]").filter(el => !el.closest(".hero")), {
    start: "top 90%", once: true,
    onEnter: els => gsap.fromTo(els, { opacity: 0, y: 40, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.3, ease: "expo.out", stagger: .1 })
  });
  // story image
  gsap.timeline({ scrollTrigger: { trigger: ".story", start: "top 75%", once: true } })
    .to(".story__img", { clipPath: "inset(0% 0 0 0)", duration: 1.6, ease: "expo.inOut" })
    .to(".story__img img", { scale: 1, duration: 2.2, ease: "expo.out" }, "-=1.2");
  gsap.to(".story__card", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: true } });
  // counters
  $$("[data-count]").forEach(el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || "", o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () =>
      gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", onUpdate: () => { el.textContent = o.v.toFixed(dec) + suf; } }) });
  });
  // signature zigzag: plates spin in, dust sprinkles, text rises
  $$(".sig").forEach((s, i) => {
    const side = i % 2 ? 1 : -1;
    const plate = $(".plate", s), dust = $$(".sig__dust circle", s);
    gsap.timeline({ scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: 1.2 } })
      .fromTo(plate, { rotate: -150 * side, scale: .55, xPercent: 40 * side }, { rotate: 0, scale: 1, xPercent: 0, ease: "power2.out", duration: .5 })
      .to(plate, { rotate: 35 * side, ease: "none", duration: .5 });
    gsap.set(dust, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
    ScrollTrigger.create({ trigger: s, start: "top 70%", once: true, onEnter: () => {
      gsap.to(dust, { opacity: (k, el) => +el.getAttribute("opacity"), scale: 1, duration: 1.4, ease: "expo.out", stagger: { each: .006, from: side > 0 ? "end" : "start" } });
      gsap.fromTo($$(".sig__text > *", s), { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: .09 });
    } });
    gsap.set($$(".sig__text > *", s), { opacity: 0 });
  });
  // menu grid first appearance
  ScrollTrigger.create({ trigger: grid, start: "top 85%", once: true, onEnter: () => {
    gsap.fromTo($$(".dish", grid), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", stagger: .06 });
    gsap.fromTo($$(".dish__plate", grid), { rotate: -140, scale: .5 }, { rotate: 0, scale: 1, duration: 1.6, ease: "expo.out", stagger: .06, clearProps: "transform" });
  } });
  gsap.set($$(".dish", grid), { opacity: 0 });
  // gallery: horizontal scroll on desktop
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    const gal = $(".gallery"), track = $("[data-gallery]");
    gal.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, { x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: gal, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
    $$(".gitem img", track).forEach(img => gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: "none",
      scrollTrigger: { trigger: img.parentElement, containerAnimation: tw, start: "left right", end: "right left", scrub: true } }));
    return () => gal.classList.remove("is-pinned");
  });
  gsap.fromTo(".gitem", { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 1.4, ease: "expo.inOut", stagger: .1,
    scrollTrigger: { trigger: ".gallery", start: "top 70%", once: true } });
  // booking bg parallax
  gsap.fromTo(".booking__bg img", { yPercent: -10 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".booking", start: "top bottom", end: "bottom top", scrub: true } });
  // footer big word
  gsap.fromTo(".ftr__big", { xPercent: 8 }, { xPercent: -4, ease: "none", scrollTrigger: { trigger: ".ftr", start: "top bottom", end: "bottom bottom", scrub: true } });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
