'use strict';

// ── Utilities ──────────────────────────────────────────────────────────────
const root = document.getElementById('app');

// Knips brand mark: camera silhouette with a heart lens. Uses currentColor so
// it inherits the surrounding logo/badge color.
const BRAND_MARK = `<svg class="brandmark" viewBox="0 0 512 512" aria-hidden="true">
  <path fill="none" stroke="currentColor" stroke-width="28" stroke-linejoin="round" stroke-linecap="round" d="M120 190 h60 l26 -34 h100 l26 34 h60 a24 24 0 0 1 24 24 v148 a24 24 0 0 1 -24 24 H120 a24 24 0 0 1 -24 -24 V214 a24 24 0 0 1 24 -24 Z"/>
  <path fill="currentColor" transform="translate(256,300) scale(78)" d="M0 0.35 C -0.30 0.05, -0.50 -0.13, -0.50 -0.33 C -0.50 -0.49, -0.35 -0.60, -0.20 -0.55 C -0.10 -0.52, -0.03 -0.44, 0 -0.38 C 0.03 -0.44, 0.10 -0.52, 0.20 -0.55 C 0.35 -0.60, 0.50 -0.49, 0.50 -0.33 C 0.50 -0.13, 0.30 0.05, 0 0.35 Z"/>
  <circle cx="366" cy="222" r="14" fill="currentColor"/>
</svg>`;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function timeOf(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateOf(ts) {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Freemium tiers — must mirror src/pricing.js. Free up to 5 guests, then stepwise.
const PRICE_TIERS = [
  { upTo: 5, cents: 0 },
  { upTo: 15, cents: 990 },
  { upTo: 30, cents: 1990 },
  { upTo: 60, cents: 3490 },
  { upTo: 120, cents: 4990 },
  { upTo: 200, cents: 6990 },
];
function priceCentsFor(g) {
  return (PRICE_TIERS.find((t) => g <= t.upTo) || PRICE_TIERS[PRICE_TIERS.length - 1]).cents;
}
function priceLabel(g) {
  const c = priceCentsFor(g);
  return c === 0 ? 'Kostenlos' : `${(c / 100).toFixed(2).replace('.', ',')} €`;
}

async function api(method, url, body, isForm) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body && isForm) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, data };
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function navigate(path) {
  history.pushState({}, '', path);
  render();
}

// Top-left back button for screens without a bottom nav. Wire its onclick after
// inserting it (root.querySelector('.backbtn')).
function backButton(label) {
  return `<button class="backbtn" type="button"><i class="ph ph-arrow-left"></i><span>${esc(label)}</span></button>`;
}

document.addEventListener('contextmenu', (e) => {
  if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('protected')) {
    e.preventDefault();
  }
});
window.addEventListener('popstate', render);

// ── App state ───────────────────────────────────────────────────────────────
const state = {
  eventId: null,
  info: null,
  me: null, // { guest, event, task, doneCount }
  guestScreen: 'loading',
  selectedFile: null,
  selectedUrl: null,
  lastPhoto: null,
  hostTab: 'overview',
  stats: null,
  detailPhoto: null,
  galleryReturn: 'gallery', // where the detail back button returns to
};

// ── Router ────────────────────────────────────────────────────────────────
function render() {
  const path = location.pathname;
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 0) return renderStart();
  if (seg[0] === 'host' && seg.length === 1) return renderHostCreate();
  if (seg[0] === 'host' && seg.length >= 2) return renderHostDashboard(seg[1]);
  return renderGuest(seg[0]);
}

// ── Start screen (root) ─────────────────────────────────────────────────────
function renderStart() {
  root.innerHTML = `
    <div class="screen center">
      <div class="grow"></div>
      <div class="logo">${BRAND_MARK}</div>
      <h1 class="title">Knips</h1>
      <p class="lead" style="margin-top:12px">Knips den Moment. Kleine Aufgaben, echte Momente — spielt gemeinsam durch den Abend.</p>
      <div class="grow"></div>
      <button class="pri" id="scan"><i class="ph-fill ph-qr-code"></i>QR-Code scannen</button>
      <div class="or">oder Code eingeben</div>
      <div class="codejoin">
        <input class="nm code-input" id="code" placeholder="ABCDE" maxlength="5"
          autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="text">
        <button class="join-btn" id="join" aria-label="Beitreten"><i class="ph-fill ph-arrow-right"></i></button>
      </div>
      <button class="sec mt-lg" id="host">Als Gastgeber starten</button>
      <div class="grow"></div>
      <div class="footlinks">
        <a href="/landing" target="_blank" rel="noopener">Was ist das?</a>
        <a href="/impressum" target="_blank" rel="noopener">Impressum</a>
        <a href="/datenschutz" target="_blank" rel="noopener">Datenschutz</a>
        <a href="/agb" target="_blank" rel="noopener">AGB</a>
      </div>
      <div style="height:16px"></div>
    </div>`;
  document.getElementById('scan').onclick = openScanner;
  document.getElementById('host').onclick = () => navigate('/host');

  const codeEl = document.getElementById('code');
  const joinByCode = () => {
    const code = codeEl.value.trim().toLowerCase();
    if (!code) { codeEl.focus(); return; }
    navigate(`/${encodeURIComponent(code)}`);
  };
  document.getElementById('join').onclick = joinByCode;
  codeEl.onkeydown = (e) => { if (e.key === 'Enter') joinByCode(); };
}

// Lazily load an external script once, resolving when it is ready.
const loadedScripts = {};
function loadScript(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { delete loadedScripts[src]; reject(new Error('load failed')); };
    document.head.appendChild(s);
  });
  return loadedScripts[src];
}

// Extract an event slug or join code from scanned QR text (a join URL or raw code).
function segFromScan(data) {
  const raw = String(data || '').trim();
  try {
    const u = new URL(raw);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length) return parts[parts.length - 1].toLowerCase();
  } catch { /* not a URL — fall through */ }
  const s = raw.toLowerCase();
  return /^[a-z0-9-]{3,40}$/.test(s) ? s : null;
}

// In-app QR scanner: live camera + jsQR decoding, no external camera app needed.
async function openScanner() {
  const ov = document.createElement('div');
  ov.className = 'scanner';
  ov.innerHTML = `
    <video playsinline muted></video>
    <div class="scanframe"></div>
    <div class="scanhint">QR-Code des Gastgebers ins Feld halten</div>
    <button class="scanclose" aria-label="Schließen"><i class="ph ph-x"></i></button>`;
  document.body.appendChild(ov);
  const video = ov.querySelector('video');
  let stream = null;
  let raf = 0;
  let active = true;
  const stop = () => {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    ov.remove();
  };
  ov.querySelector('.scanclose').onclick = stop;

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
  } catch {
    stop();
    toast('Kamera nicht verfügbar. Gib den Code manuell ein.');
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const tick = () => {
    if (!active) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && window.jsQR) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      const seg = found && found.data ? segFromScan(found.data) : null;
      if (seg) { stop(); navigate(`/${encodeURIComponent(seg)}`); return; }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

// ── Guest flow ──────────────────────────────────────────────────────────────
async function renderGuest(id) {
  if (state.eventId !== id) {
    state.eventId = id;
    state.info = null;
    state.me = null;
    state.guestScreen = 'loading';
  }
  if (!state.info) {
    renderLoading();
    const info = await api('GET', `/api/events/${id}/info`);
    if (info.status === 404) return renderNotFound();
    if (!info.ok) return renderError();
    state.info = info.data;
    // The guest may have entered a short join code — switch the URL to the
    // canonical event slug so cookies and further API calls stay consistent.
    if (info.data.id && info.data.id !== id) {
      id = info.data.id;
      state.eventId = id;
      history.replaceState({}, '', `/${id}`);
    }
    const me = await api('GET', `/api/events/${id}/me`);
    if (me.ok) {
      state.me = me.data;
      state.guestScreen = 'task';
    } else {
      state.guestScreen = 'join';
    }
  }
  renderGuestScreen();
}

function renderLoading() {
  root.innerHTML = `<div class="screen"><div class="loading"><i class="ph ph-spinner-gap" style="font-size:26px;animation:spin 1s linear infinite"></i></div></div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
}
function renderNotFound() {
  root.innerHTML = `<div class="screen center"><div class="grow"></div>
    <i class="ph ph-magnifying-glass" style="font-size:40px;color:var(--color-neutral-600)"></i>
    <h2 class="title" style="margin-top:18px">Nicht gefunden</h2>
    <p class="lead" style="margin-top:10px">Diese Feier gibt es nicht (mehr). Scanne den QR-Code des Gastgebers.</p>
    <div class="grow"></div></div>`;
}
function renderError() {
  root.innerHTML = `<div class="screen center"><div class="grow"></div>
    <i class="ph ph-warning-circle" style="font-size:40px;color:var(--color-neutral-600)"></i>
    <h2 class="title" style="margin-top:18px">Etwas lief schief</h2>
    <p class="lead" style="margin-top:10px">Bitte lade die Seite neu.</p>
    <div class="grow"></div></div>`;
}

function renderGuestScreen() {
  switch (state.guestScreen) {
    case 'join': return screenJoin();
    case 'task': return screenTask();
    case 'capture': return screenCapture();
    case 'success': return screenSuccess();
    case 'gallery': return screenGallery();
    case 'detail': return screenDetail();
    default: return renderLoading();
  }
}

function screenJoin() {
  const info = state.info;
  const isHost = !!localStorage.getItem(`hosttoken_${state.eventId}`);
  const pwField = info.requiresPassword ? `
    <label class="lbl" style="margin-top:18px">Party-Passwort</label>
    <input class="nm" id="pw" type="password" placeholder="Passwort vom Gastgeber" autocomplete="off">` : '';
  root.innerHTML = `
    <div class="screen">
      ${backButton(isHost ? 'Host-Menü' : 'Startseite')}
      <span class="kick">Du trittst bei</span>
      <h2 class="title" style="margin:14px 0 4px">${esc(info.name)}</h2>
      <p class="muted" style="font-size:13px;margin:0">Verbunden über QR-Code · ${info.guestCount} Gäste dabei</p>
      <div class="rule"></div>
      <label class="lbl">Wie heißt du?</label>
      <input class="nm" id="name" placeholder="Dein Name" autocomplete="name" maxlength="40">
      ${pwField}
      <p class="hint">Kein Konto nötig. Der Name erscheint in der Galerie.</p>
      <label class="consent" style="margin-top:16px">
        <input type="checkbox" id="consent">
        <span>Ich bin einverstanden, dass mein Name und meine Fotos in der Event-Galerie gespeichert und den anderen Gästen gezeigt werden. <a href="/datenschutz" target="_blank" rel="noopener">Datenschutz</a></span>
      </label>
      <div class="err" id="err"></div>
      <div class="grow"></div>
      <button class="pri" id="go">Los geht's<i class="ph-fill ph-arrow-right"></i></button>
      <div style="height:16px"></div>
    </div>`;
  const nameEl = document.getElementById('name');
  nameEl.focus();
  // If the current user is the host of this event, send them back to the dashboard.
  root.querySelector('.backbtn').onclick = () => navigate(isHost ? `/host/${state.eventId}` : '/');
  document.getElementById('go').onclick = doJoin;
  nameEl.onkeydown = (e) => { if (e.key === 'Enter' && !info.requiresPassword) doJoin(); };
}

async function doJoin() {
  const name = document.getElementById('name').value.trim();
  const pwEl = document.getElementById('pw');
  const password = pwEl ? pwEl.value : '';
  const consent = document.getElementById('consent').checked;
  const err = document.getElementById('err');
  if (!name) { err.textContent = 'Bitte gib deinen Namen ein.'; return; }
  if (!consent) { err.textContent = 'Bitte stimme der Speicherung deiner Fotos zu.'; return; }
  const btn = document.getElementById('go');
  btn.disabled = true;
  const res = await api('POST', `/api/events/${state.eventId}/join`, { name, password, consent });
  btn.disabled = false;
  if (res.ok) {
    state.me = res.data;
    state.guestScreen = 'task';
    return renderGuestScreen();
  }
  const map = {
    bad_password: 'Falsches Passwort.',
    name_required: 'Bitte gib deinen Namen ein.',
    consent_required: 'Bitte stimme der Speicherung deiner Fotos zu.',
    full: 'Diese Feier ist leider schon voll.',
  };
  err.textContent = map[res.data && res.data.error] || 'Beitritt fehlgeschlagen.';
}

function screenTask() {
  const { task, event } = state.me;
  root.innerHTML = `
    <div class="screen" style="padding-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="kick">Knips</span>
        <span class="muted" style="font-size:11px">${esc(event.name)}</span>
      </div>
      <div class="rule"></div>
      <div class="uppermeta">Deine Aufgabe</div>
      <div class="taskcat">${esc(task.cat)}</div>
      <h2 class="tasktext">${esc(task.text)}</h2>
      <div class="taskmeta"><i class="ph ph-users-three"></i>Ein Foto mit jemandem/etwas</div>
      <div class="grow"></div>
      <button class="pri" id="capture"><i class="ph-fill ph-camera"></i>Foto aufnehmen</button>
      <button class="sec mt" id="rotate"><i class="ph ph-shuffle"></i>Andere Aufgabe</button>
    </div>
    ${navBar('task')}`;
  document.getElementById('capture').onclick = openCamera;
  document.getElementById('rotate').onclick = rotateTask;
  wireNav();
}

async function rotateTask() {
  const btn = document.getElementById('rotate');
  btn.disabled = true;
  const res = await api('POST', `/api/events/${state.eventId}/task/rotate`);
  btn.disabled = false;
  if (res.ok) { state.me.task = res.data.task; renderGuestScreen(); }
}

let fileInput;
function openCamera() {
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.setAttribute('capture', 'environment');
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (state.selectedUrl) URL.revokeObjectURL(state.selectedUrl);
      state.selectedFile = file;
      state.selectedUrl = URL.createObjectURL(file);
      state.guestScreen = 'capture';
      renderGuestScreen();
    });
  }
  fileInput.click();
}

function screenCapture() {
  const { task } = state.me;
  root.innerHTML = `
    <div class="screen">
      ${backButton('Zur Aufgabe')}
      <div class="uppermeta">Aufnahme prüfen</div>
      <div class="preview noselect">
        <img class="protected" draggable="false" src="${state.selectedUrl}" alt="">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 16px;background:linear-gradient(0deg,rgba(0,0,0,.6),transparent);font:400 12px var(--font-body);color:var(--color-neutral-300);z-index:1"><b style="color:var(--gold);font-weight:600">${esc(task.cat)}</b></div>
      </div>
      <button class="pri" style="margin-top:16px" id="save"><i class="ph-fill ph-check-circle"></i>In Galerie speichern</button>
      <button class="sec mt" id="retake">Neu aufnehmen</button>
      <div style="height:8px"></div>
    </div>`;
  root.querySelector('.backbtn').onclick = () => {
    if (state.selectedUrl) { URL.revokeObjectURL(state.selectedUrl); state.selectedUrl = null; }
    state.selectedFile = null;
    state.guestScreen = 'task';
    renderGuestScreen();
  };
  document.getElementById('save').onclick = savePhoto;
  document.getElementById('retake').onclick = openCamera;
}

async function savePhoto() {
  const btn = document.getElementById('save');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner-gap" style="animation:spin 1s linear infinite"></i>Speichern…';
  const fd = new FormData();
  fd.append('photo', state.selectedFile);
  const res = await api('POST', `/api/events/${state.eventId}/photos`, fd, true);
  if (res.ok) {
    state.lastPhoto = res.data.photo;
    state.me.doneCount += 1;
    state.guestScreen = 'success';
    if (state.selectedUrl) { URL.revokeObjectURL(state.selectedUrl); state.selectedUrl = null; }
    state.selectedFile = null;
    return renderGuestScreen();
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="ph-fill ph-check-circle"></i>In Galerie speichern';
  toast(res.status === 413 ? 'Das Foto ist zu groß.' : 'Speichern fehlgeschlagen.');
}

function screenSuccess() {
  root.innerHTML = `
    <div class="screen center" style="background:radial-gradient(120% 60% at 50% 20%,#26294a,#161826)">
      <div class="grow"></div>
      <div class="checkring"><i class="ph-fill ph-check"></i></div>
      <h2 class="title" style="margin-top:24px">Aufgabe geschafft!</h2>
      <p class="lead" style="margin-top:12px">Dein Foto liegt jetzt in der Galerie. Magst du gleich die nächste?</p>
      <div class="grow"></div>
      <button class="pri" id="new"><i class="ph-fill ph-shuffle"></i>Neue Aufgabe nehmen</button>
      <button class="sec mt" id="gal">Galerie ansehen</button>
      <div style="height:16px"></div>
    </div>`;
  document.getElementById('new').onclick = async () => {
    const res = await api('POST', `/api/events/${state.eventId}/task/rotate`);
    if (res.ok) state.me.task = res.data.task;
    state.guestScreen = 'task';
    renderGuestScreen();
  };
  document.getElementById('gal').onclick = () => { state.guestScreen = 'gallery'; renderGuestScreen(); };
}

async function screenGallery() {
  root.innerHTML = `<div class="screen" style="padding-bottom:12px">
      <div class="gallery-head"><h2 class="title" style="font-size:24px">Galerie</h2><span class="muted" id="gcount" style="font-size:12px"></span></div>
      <div class="galbar"><a class="dlall" id="dlzip" href="/api/events/${state.eventId}/download.zip"><i class="ph ph-download-simple"></i>Galerie herunterladen</a></div>
      <div class="rule" style="margin:14px 0 18px"></div>
      <div class="grid" id="grid"><div class="loading" style="grid-column:1/-1"><i class="ph ph-spinner-gap" style="font-size:24px;animation:spin 1s linear infinite"></i></div></div>
    </div>${navBar('gallery')}`;
  wireNav();
  const res = await api('GET', `/api/events/${state.eventId}/gallery`);
  const grid = document.getElementById('grid');
  if (!res.ok) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Galerie nicht verfügbar.</div>'; return; }
  document.getElementById('gcount').textContent = `${res.data.count} Fotos`;
  const dz = document.getElementById('dlzip');
  if (dz) dz.style.display = res.data.count ? '' : 'none';
  if (res.data.count === 0) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Noch keine Fotos. Sei die/der Erste!</div>';
    return;
  }
  grid.innerHTML = res.data.photos.map((p) => tileHtml(p)).join('');
  wireTiles(grid, res.data.photos, 'gallery');
}

function tileHtml(p) {
  const src = `/api/events/${state.eventId}/photos/${p.id}/image`;
  return `<div class="tile noselect" data-id="${p.id}">
      <img class="protected" draggable="false" loading="lazy" src="${src}" alt="">
      <div class="shade"></div>
      <span class="cap">${esc(p.cat)}</span>
    </div>`;
}

function wireTiles(container, photos, from) {
  const byId = Object.fromEntries(photos.map((p) => [p.id, p]));
  container.querySelectorAll('.tile').forEach((el) => {
    el.onclick = () => {
      state.detailPhoto = byId[el.dataset.id];
      state.galleryReturn = from;
      state.guestScreen = 'detail';
      renderGuestScreen();
    };
  });
}

function screenDetail() {
  const p = state.detailPhoto;
  const src = `/api/events/${state.eventId}/photos/${p.id}/image`;
  root.innerHTML = `
    <div class="screen" style="padding:20px 20px 26px">
      <button class="navi" id="back" style="flex-direction:row;gap:12px;color:var(--color-neutral-400);align-self:flex-start">
        <i class="ph ph-arrow-left" style="font-size:20px"></i><span style="font:500 13px var(--font-body)">Zurück zur Galerie</span>
      </button>
      <div class="detail-img noselect"><img class="protected" draggable="false" src="${src}" alt=""></div>
      <div style="margin-top:18px">
        <span class="taskcat" style="margin:0">${esc(p.cat)}</span>
        <p style="font:400 16px/1.4 var(--font-body);margin:8px 0 0;text-wrap:pretty">${esc(p.text)}</p>
        <div class="taskmeta"><i class="ph ph-user-circle"></i>${esc(p.guestName)} · ${timeOf(p.createdAt)}</div>
      </div>
      <a class="sec mt" href="${src}?dl=1" download><i class="ph ph-download-simple"></i>Foto herunterladen</a>
    </div>`;
  document.getElementById('back').onclick = () => {
    if (state.galleryReturn === 'host') { state.hostTab = 'gallery'; return renderHostDashboardView(); }
    state.guestScreen = 'gallery';
    renderGuestScreen();
  };
}

// Bottom navigation shared by task/gallery
function navBar(active) {
  return `<div class="nav">
      <button class="navi ${active === 'task' ? 'active' : ''}" data-nav="task"><i class="${active === 'task' ? 'ph-fill' : 'ph'} ph-target"></i>Aufgabe</button>
      <button class="navi ${active === 'gallery' ? 'active' : ''}" data-nav="gallery"><i class="${active === 'gallery' ? 'ph-fill' : 'ph'} ph-images"></i>Galerie</button>
    </div>`;
}
function wireNav() {
  root.querySelectorAll('[data-nav]').forEach((el) => {
    el.onclick = () => {
      state.guestScreen = el.dataset.nav;
      renderGuestScreen();
    };
  });
}

// ── Host: create ────────────────────────────────────────────────────────────
function renderHostCreate() {
  state.eventId = null;
  let guests = 5;
  const freeNote = 'Kostenlos bis 5 Gäste';
  root.innerHTML = `
    <div class="screen">
      ${backButton('Startseite')}
      <span class="kick">Neue Session</span>
      <h2 class="title" style="margin:12px 0 24px">Wie groß wird gefeiert?</h2>

      <label class="lbl">Name der Feier</label>
      <input class="nm" id="name" placeholder="z. B. Lisas 30. Geburtstag" maxlength="80">

      <label class="lbl" style="margin-top:20px">Galerie-Passwort</label>
      <input class="nm" id="pw" type="text" placeholder="Passwort für alle Gäste" maxlength="60">
      <p class="hint">Gäste brauchen dieses Passwort, um beizutreten und die Galerie zu sehen. Schreib es aufs Plakat.</p>

      <label class="lbl" style="margin-top:20px">Anzahl Gäste</label>
      <div class="stepper">
        <button id="dec">−</button>
        <span class="val" id="gval">${guests}</span>
        <button class="plus" id="inc">+</button>
      </div>

      <div class="pricebox">
        <div><div class="muted" style="font-size:12px">bis <span id="gval2">${guests}</span> Gäste</div><div class="amount" id="price">${priceLabel(guests)}</div></div>
        <span class="muted" style="font-size:11px;text-align:right;max-width:120px" id="pricenote">${freeNote}</span>
      </div>

      <label class="consent" style="margin-top:20px">
        <input type="checkbox" id="agb">
        <span>Ich akzeptiere die <a href="/agb" target="_blank" rel="noopener">AGB</a> und die <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.</span>
      </label>

      <div class="err" id="err"></div>
      <div class="grow"></div>
      <button class="pri" id="go">Session starten<i class="ph-fill ph-arrow-right"></i></button>
      <p class="hint" style="text-align:center">Fotos & Galerie werden nach 30 Tagen automatisch gelöscht.</p>
    </div>`;

  const sync = () => {
    document.getElementById('gval').textContent = guests;
    document.getElementById('gval2').textContent = guests;
    document.getElementById('price').textContent = priceLabel(guests);
    document.getElementById('pricenote').textContent = priceCentsFor(guests) === 0 ? freeNote : 'einmalig, für den ganzen Abend';
  };
  root.querySelector('.backbtn').onclick = () => navigate('/');
  document.getElementById('dec').onclick = () => { guests = Math.max(5, guests - 5); sync(); };
  document.getElementById('inc').onclick = () => { guests = Math.min(200, guests + 5); sync(); };
  document.getElementById('go').onclick = async () => {
    const name = document.getElementById('name').value.trim();
    const pw = document.getElementById('pw').value;
    const err = document.getElementById('err');
    if (!name) { err.textContent = 'Bitte gib der Feier einen Namen.'; return; }
    if (pw.length < 3) { err.textContent = 'Bitte wähle ein Passwort (mind. 3 Zeichen).'; return; }
    if (!document.getElementById('agb').checked) { err.textContent = 'Bitte akzeptiere AGB und Datenschutz.'; return; }
    const btn = document.getElementById('go');
    btn.disabled = true;
    const res = await api('POST', '/api/host/events', { name, guestLimit: guests, guestPassword: pw });
    btn.disabled = false;
    if (!res.ok) { err.textContent = 'Konnte nicht erstellt werden.'; return; }
    localStorage.setItem(`hosttoken_${res.data.eventId}`, res.data.hostToken);
    navigate(`/host/${res.data.eventId}`);
  };
}

// ── Host: dashboard ─────────────────────────────────────────────────────────
async function renderHostDashboard(id) {
  state.eventId = id;
  // If we arrived via the host link (?t=token), exchange it for a cookie.
  const url = new URL(location.href);
  const t = url.searchParams.get('t');
  if (t) {
    localStorage.setItem(`hosttoken_${id}`, t);
    await api('POST', `/api/host/events/${id}/auth`, { token: t });
    history.replaceState({}, '', `/host/${id}`);
  }
  renderLoading();
  let res = await api('GET', `/api/host/events/${id}/stats`);
  // No valid host cookie? Fall back to the token saved in localStorage so the
  // host can return via /host/:id without the ?t= link.
  if (res.status === 401) {
    const saved = localStorage.getItem(`hosttoken_${id}`);
    if (saved) {
      const a = await api('POST', `/api/host/events/${id}/auth`, { token: saved });
      if (a.ok) res = await api('GET', `/api/host/events/${id}/stats`);
    }
  }
  if (res.status === 401) return renderHostLocked();
  if (res.status === 404) return renderNotFound();
  if (!res.ok) return renderError();
  state.stats = res.data;
  state.hostTab = state.hostTab || 'overview';
  renderHostDashboardView();
}

function renderHostLocked() {
  root.innerHTML = `<div class="screen center"><div class="grow"></div>
    <i class="ph ph-lock-key" style="font-size:40px;color:var(--color-neutral-600)"></i>
    <h2 class="title" style="margin-top:18px">Kein Host-Zugang</h2>
    <p class="lead" style="margin-top:10px">Öffne diese Übersicht über deinen persönlichen Host-Link (mit <code>?t=…</code>).</p>
    <div class="grow"></div>
    <button class="sec" id="home">Zur Startseite</button><div style="height:16px"></div></div>`;
  document.getElementById('home').onclick = () => navigate('/');
}

function renderHostDashboardView() {
  const tab = state.hostTab;
  if (tab === 'gallery') return hostGallery();
  if (tab === 'invite') return hostInvite();
  return hostOverview();
}

function hostShell(inner, active) {
  root.innerHTML = `${inner}
    <div class="nav" style="justify-content:space-around">
      <button class="navi ${active === 'overview' ? 'active' : ''}" data-htab="overview"><i class="${active === 'overview' ? 'ph-fill' : 'ph'} ph-chart-bar"></i>Übersicht</button>
      <button class="navi ${active === 'gallery' ? 'active' : ''}" data-htab="gallery"><i class="${active === 'gallery' ? 'ph-fill' : 'ph'} ph-images"></i>Galerie</button>
      <button class="navi ${active === 'invite' ? 'active' : ''}" data-htab="invite"><i class="${active === 'invite' ? 'ph-fill' : 'ph'} ph-qr-code"></i>Einladen</button>
    </div>`;
  root.querySelectorAll('[data-htab]').forEach((el) => {
    el.onclick = () => { state.hostTab = el.dataset.htab; renderHostDashboardView(); };
  });
}

function hostOverview() {
  const s = state.stats;
  const mins = Math.max(1, Math.round((Date.now() - s.createdAt) / 60000));
  const thumbs = s.recent.length
    ? s.recent.map((p) => `<div class="thumb"><img class="protected" draggable="false" loading="lazy" src="/api/events/${state.eventId}/photos/${p.id}/image" alt=""></div>`).join('')
    : '<div class="empty" style="grid-column:1/-1">Noch keine Fotos.</div>';
  hostShell(`
    <div class="screen" style="padding-bottom:12px">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <div><h2 class="title" style="font-size:22px">${esc(s.name)}</h2><span class="muted" style="font-size:11px">Live · läuft seit ${mins} Min</span></div>
        <span style="width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)"></span>
      </div>
      <div class="stats">
        <div class="stat"><div class="big">${s.guestCount}</div><div class="lbl2">von ${s.guestLimit} Gästen</div></div>
        <div class="stat"><div class="big">${s.photoCount}</div><div class="lbl2">Fotos gemacht</div></div>
      </div>
      <button class="sec" id="hostjoin" style="margin-top:20px"><i class="ph ph-camera-plus"></i>Selbst mitmachen</button>
      <div class="uppermeta" style="margin:22px 0 4px">Zuletzt hinzugefügt</div>
      <div class="grid3">${thumbs}</div>
      ${s.expiresAt ? `<p class="hint" style="text-align:center;margin-top:16px"><i class="ph ph-clock-countdown"></i> Galerie & Fotos werden am ${dateOf(s.expiresAt)} automatisch gelöscht.</p>` : ''}
    </div>`, 'overview');
  const hj = document.getElementById('hostjoin');
  if (hj) hj.onclick = () => navigate(`/${state.eventId}`);
}

async function hostGallery() {
  hostShell(`<div class="screen" style="padding-bottom:12px">
      <div class="gallery-head"><h2 class="title" style="font-size:24px">Galerie</h2><span class="muted" id="gcount" style="font-size:12px"></span></div>
      <div class="galbar"><a class="dlall" id="dlzip" href="/api/events/${state.eventId}/download.zip"><i class="ph ph-download-simple"></i>Galerie herunterladen</a></div>
      <div class="rule" style="margin:14px 0 18px"></div>
      <div class="grid" id="grid"><div class="loading" style="grid-column:1/-1"><i class="ph ph-spinner-gap" style="font-size:24px;animation:spin 1s linear infinite"></i></div></div>
    </div>`, 'gallery');
  const res = await api('GET', `/api/events/${state.eventId}/gallery`);
  const grid = document.getElementById('grid');
  if (!res.ok) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Galerie nicht verfügbar.</div>'; return; }
  document.getElementById('gcount').textContent = `${res.data.count} Fotos`;
  const dz = document.getElementById('dlzip');
  if (dz) dz.style.display = res.data.count ? '' : 'none';
  if (res.data.count === 0) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Noch keine Fotos.</div>'; return; }
  grid.innerHTML = res.data.photos.map((p) => tileHtml(p)).join('');
  wireTiles(grid, res.data.photos, 'host');
}

function hostInvite() {
  const id = state.eventId;
  const token = localStorage.getItem(`hosttoken_${id}`);
  const joinUrl = `${location.origin}/${id}`;
  hostShell(`
    <div class="screen center" style="background:radial-gradient(120% 60% at 50% 10%,#22253c,#161826)">
      <span class="kick">${esc(state.stats.name)}</span>
      <h2 class="title" style="font-size:24px;margin:12px 0 4px">Gäste einladen</h2>
      <p class="muted" style="font-size:13px;margin:0">Scannen, Namen eingeben, mitspielen.</p>
      <div class="qrwrap"><img src="/api/host/events/${id}/qr.svg" alt="QR-Code" style="width:100%;height:100%"></div>
      <div class="linkline"><i class="ph ph-link-simple"></i>${esc(joinUrl.replace(/^https?:\/\//, ''))}</div>
      ${state.stats.joinCode ? `<div class="codeline">oder Code <b>${esc(state.stats.joinCode)}</b></div>` : ''}
      <div class="grow"></div>
      ${token ? `<a class="pri" href="/host/${id}/print?t=${encodeURIComponent(token)}" target="_blank" rel="noopener"><i class="ph-fill ph-printer"></i>Plakat drucken</a>` : ''}
      <button class="sec mt" id="copy"><i class="ph ph-copy"></i>Link kopieren</button>
      <div style="height:8px"></div>
    </div>`, 'invite');
  const copy = document.getElementById('copy');
  if (copy) copy.onclick = async () => {
    try { await navigator.clipboard.writeText(joinUrl); toast('Link kopiert.'); }
    catch { toast(joinUrl); }
  };
}

// ── Install prompt (FAB) ─────────────────────────────────────────────────────
// Android/Chrome: capture beforeinstallprompt and offer a one-tap install FAB.
// iOS/Safari: no programmatic install exists, so the FAB opens instructions.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

let deferredInstall = null;

function showInstallFab() {
  if (isStandalone() || document.getElementById('installfab')) return;
  const fab = document.createElement('button');
  fab.id = 'installfab';
  fab.className = 'installfab';
  fab.innerHTML = '<i class="ph-fill ph-download-simple"></i><span>App installieren</span>';
  fab.onclick = onInstallClick;
  document.body.appendChild(fab);
}

async function onInstallClick() {
  if (deferredInstall) {
    deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    if (outcome === 'accepted') { const f = document.getElementById('installfab'); if (f) f.remove(); }
    return;
  }
  showIosInstallGuide();
}

function showIosInstallGuide() {
  if (document.getElementById('iosguide')) return;
  const ov = document.createElement('div');
  ov.id = 'iosguide';
  ov.className = 'iosguide';
  ov.innerHTML = `
    <div class="ioscard">
      <button class="iosclose" aria-label="Schließen"><i class="ph ph-x"></i></button>
      <div class="logo" style="margin:0 auto 14px">${BRAND_MARK}</div>
      <h3 class="title" style="font-size:20px;text-align:center">Zum Home-Bildschirm</h3>
      <p class="lead" style="max-width:none;text-align:center;margin:8px auto 18px">So hast du Knips wie eine App direkt auf dem Handy.</p>
      <ol class="iossteps">
        <li>Tippe unten auf <b>Teilen</b> <i class="ph ph-export"></i></li>
        <li>Wähle <b>Zum Home-Bildschirm</b> <i class="ph ph-plus-square"></i></li>
        <li>Tippe oben rechts auf <b>Hinzufügen</b></li>
      </ol>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.iosclose').onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  showInstallFab();
});
window.addEventListener('appinstalled', () => {
  const f = document.getElementById('installfab'); if (f) f.remove();
});

// ── Cookie / storage notice ──────────────────────────────────────────────────
// Only strictly-necessary cookies are used (session), so this is an info notice,
// not a blocking consent banner.
function showCookieNotice() {
  if (localStorage.getItem('cookieAck') === '1' || isStandalone()) return;
  const bar = document.createElement('div');
  bar.className = 'cookiebar';
  bar.innerHTML = `
    <span>Wir nutzen nur technisch notwendige Cookies, damit du eingeloggt bleibst. <a href="/datenschutz" target="_blank" rel="noopener">Mehr erfahren</a></span>
    <button class="cookieok">Verstanden</button>`;
  document.body.appendChild(bar);
  bar.querySelector('.cookieok').onclick = () => { localStorage.setItem('cookieAck', '1'); bar.remove(); };
}

// ── Boot ────────────────────────────────────────────────────────────────────
const spin = document.createElement('style');
spin.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(spin);
render();

// iOS never fires beforeinstallprompt — show the FAB proactively there.
if (isIos() && !isStandalone()) showInstallFab();
showCookieNotice();
