const grid = document.querySelector("#games-grid");

// Fetch Discord presence via Lanyard API
const DISCORD_USER_ID = '1088946006663630969';
async function fetchDiscordPresence() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
    const data = await res.json();
    if (data.success && data.data) {
      const { discord_user, activities, discord_status } = data.data;
      
      // Set avatar
      const avatarHash = discord_user.avatar;
      const avatarUrl = avatarHash
        ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${avatarHash}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_user.discriminator || '0') % 5}.png`;
      const avatarEl = document.getElementById('discord-avatar');
      if (avatarEl) avatarEl.src = avatarUrl;
      
      // Set status indicator
      const presenceEl = document.getElementById('discord-presence');
      if (presenceEl) presenceEl.setAttribute('data-status', discord_status || 'offline');
      
      // Set activity
      const activityEl = document.getElementById('discord-activity');
      if (activityEl) {
        const activity = activities?.find(a => a.type !== 4); // Ignore custom status
        
        // Update presence classes
        const titleRowEl = document.querySelector('.hero__title-row');
        if (presenceEl) {
          presenceEl.classList.remove('has-activity', 'offline-only', 'online-only');
          if (activity) {
            presenceEl.classList.add('has-activity');
            titleRowEl?.classList.add('has-activity');
          } else {
            titleRowEl?.classList.remove('has-activity');
            if (discord_status === 'offline') {
              presenceEl.classList.add('offline-only');
            } else if (discord_status !== 'offline') {
              presenceEl.classList.add('online-only');
            }
          }
        }
        
        if (activity) {
          let typeLabel = '';
          if (activity.type === 0) typeLabel = 'Playing';
          else if (activity.type === 1) typeLabel = 'Streaming';
          else if (activity.type === 2) typeLabel = 'Listening to';
          else if (activity.type === 3) typeLabel = 'Watching';
          else if (activity.type === 5) typeLabel = 'Competing in';
          
          // Get activity icon
          let iconUrl = '';
          if (activity.assets?.large_image) {
            const img = activity.assets.large_image;
            if (img.startsWith('mp:external/')) {
              iconUrl = `https://media.discordapp.net/external/${img.replace('mp:external/', '')}`;
            } else if (img.startsWith('spotify:')) {
              iconUrl = `https://i.scdn.co/image/${img.replace('spotify:', '')}`;
            } else if (activity.application_id) {
              iconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
            }
          }
          
          // Get small icon
          let smallIconUrl = '';
          if (activity.assets?.small_image) {
            const img = activity.assets.small_image;
            if (img.startsWith('mp:external/')) {
              smallIconUrl = `https://media.discordapp.net/external/${img.replace('mp:external/', '')}`;
            } else if (activity.application_id) {
              smallIconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
            }
          }
          
          // Calculate elapsed time
          let elapsedStr = '';
          if (activity.timestamps?.start) {
            currentActivityStartTime = activity.timestamps.start;
            const elapsed = Date.now() - activity.timestamps.start;
            const mins = Math.floor(elapsed / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            elapsedStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} elapsed`;
          } else {
            currentActivityStartTime = null;
          }
          
          activityEl.innerHTML = `
            <span class="activity-type">${typeLabel}</span>
            <div class="activity-content">
              ${iconUrl || smallIconUrl ? `<div class="activity-icon-wrapper">
                ${iconUrl ? `<img class="activity-icon" src="${iconUrl}" alt="" />` : '<div class="activity-icon activity-icon--placeholder"></div>'}
                ${smallIconUrl ? `<img class="activity-icon-small" src="${smallIconUrl}" alt="" />` : ''}
              </div>` : ''}
              <div class="activity-info">
                <span class="activity-name">${activity.name}</span>
                ${activity.details ? `<span class="activity-details">${activity.details}</span>` : ''}
                ${activity.state ? `<span class="activity-state">${activity.state}</span>` : ''}
                ${elapsedStr ? `<span class="activity-elapsed">${elapsedStr}</span>` : ''}
              </div>
            </div>
          `;
        } else {
          currentActivityStartTime = null;
          // No activity - show status message based on discord_status
          if (discord_status === 'offline') {
            activityEl.innerHTML = '<span class="offline-message">Offline</span>';
          } else if (discord_status === 'online') {
            // Para status online, mostrar apenas "Online"
            activityEl.innerHTML = '<span class="status-online">Online</span>';
          } else {
            // Para outros status (idle, dnd), mostrar "Online (Status)"
            const statusClass = `status-${discord_status}`;
            const statusText = discord_status.charAt(0).toUpperCase() + discord_status.slice(1); // Capitalizar
            activityEl.innerHTML = `<span class="${statusClass}">Online (${statusText})</span>`;
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch Discord presence:', err);
  }
}
fetchDiscordPresence();
// Refresh presence every 30 seconds
setInterval(fetchDiscordPresence, 30000);

// Update elapsed time every second
let currentActivityStartTime = null;
function updateElapsedTime() {
  if (!currentActivityStartTime) return;
  
  const elapsedEl = document.querySelector('.activity-elapsed');
  if (elapsedEl) {
    const elapsed = Date.now() - currentActivityStartTime;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    const elapsedStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} elapsed`;
    elapsedEl.textContent = elapsedStr;
  }
}
setInterval(updateElapsedTime, 1000);
const fallbackGames = [
  {
    name: "Rainbow Friends",
    visits: "Visits loading",
    icon: "https://tr.rbxcdn.com/8f0a1b5918bb74dad8a2c40377972c48/150/150/Image/Png",
    link: "https://www.roblox.com/games/7991339063/Rainbow-Friends",
  },
];

const formatVisits = (visits = 0) => {
  if (visits >= 1_000_000_000) return `${(visits / 1_000_000_000).toFixed(1)}B+ VISITS`;
  if (visits >= 1_000_000) return `${(visits / 1_000_000).toFixed(1)}M+ VISITS`;
  if (visits >= 1_000) return `${(visits / 1_000).toFixed(1)}K+ VISITS`;
  return `${visits.toLocaleString("en-US")} VISITS`;
};

// Per-track default volumes (normalized by lowercased, accent-stripped title substring)
function normTitle(s = '') {
  try { return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}+/gu, '').trim(); } catch { return String(s).toLowerCase().trim(); }
}
const TRACK_VOL_RULES = [
  { key: 'memorizing 2', vol: 0.2 },
  { key: 'kore', vol: 0.5 },
  { key: 'zyre', vol: 0.8 },
  { key: 'quatmosfera chill', vol: 0.8 },
];
function lookupTrackVolume(title = '') {
  const n = normTitle(title);
  for (const r of TRACK_VOL_RULES) {
    if (n.includes(r.key)) return r.vol;
  }
  return null;
}

let volAnimId;
function animateVolumeTo(target = 1, durationMs = 700) {
  target = Math.min(1, Math.max(0, target));
  if (!audio && !volumeSlider) return;
  const start = Number.isFinite(userVolume) ? userVolume : (audio ? audio.volume : 0.5);
  const startTs = performance.now();
  if (volAnimId) cancelAnimationFrame(volAnimId);
  const step = () => {
    const t = (performance.now() - startTs) / Math.max(1, durationMs);
    const k = Math.min(1, t);
    const eased = k * (2 - k); // easeOutQuad
    const v = start + (target - start) * eased;
    // update without spamming localStorage
    if (audio) { audio.volume = v; audio.muted = v === 0; }
    if (volumeSlider) { const ui = Math.round(v * 100); if (Number(volumeSlider.value) !== ui) volumeSlider.value = String(ui); }
    userVolume = v;
    if (k < 1) {
      volAnimId = requestAnimationFrame(step);
    } else {
      // persist final
      setPlayerVolume(target);
      volAnimId = null;
    }
  };
  volAnimId = requestAnimationFrame(step);
}

const setPlaceholder = (message) => {
  grid.innerHTML = "";
  const placeholder = document.createElement("p");
  placeholder.className = "placeholder";
  placeholder.textContent = message;
  grid.appendChild(placeholder);
};

const createCard = ({ name, visits, icon, link }) => {
  const card = document.createElement("article");
  card.className = "game-card";
  card.innerHTML = `
    <div class="game-card__header">
      <img src="${icon}" alt="Game icon for ${name}" />
      <div>
        <h3>${name}</h3>
        <p class="game-card__meta">
          <span class="visit-count" data-text="${visits}">${visits}</span>
        </p>
      </div>
    </div>
    <a href="${link}" target="_blank" rel="noreferrer">
      View experience
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path stroke="currentColor" stroke-width="1.5" d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  `;
  grid.appendChild(card);
};

const fetchGameData = async () => {
  const response = await fetch("/api/games");
  if (!response.ok) throw new Error("Proxy offline");
  const { games } = await response.json();
  return games.map((details) => ({
    name: details.name,
    visits: formatVisits(details.visits),
    icon: details.icon ?? "https://via.placeholder.com/150/111/FFFFFF?text=Roblox",
    link: details.link,
  }));
};

const renderGames = async () => {
  setPlaceholder("Loading live data from the Roblox API...");

  try {
    const games = await fetchGameData();
    grid.innerHTML = "";
    games.forEach(createCard);
  } catch (error) {
    console.error(error);
    grid.innerHTML = "";
    fallbackGames.forEach(createCard);
    const note = document.createElement("p");
    note.className = "placeholder";
    note.textContent = "Proxy/API unreachable right now. Showing static data.";
    grid.parentElement?.appendChild(note);
  }
};

renderGames();

document.querySelector("#year").textContent = new Date().getFullYear();

// --- Audio Player (Local assets) ---
const elPlayer = document.querySelector('.audio-player');
const elTitle = elPlayer?.querySelector('.audio-title');
const elIcon = elPlayer?.querySelector('.audio-icon');
const elCurrent = elPlayer?.querySelector('.audio-current');
const elDuration = elPlayer?.querySelector('.audio-duration');
const elBars = elPlayer?.querySelector('.audio-bars');
const btnPrev = elPlayer?.querySelector('.audio-btn.prev');
const btnPlay = elPlayer?.querySelector('.audio-btn.play');
const btnNext = elPlayer?.querySelector('.audio-btn.next');
const volumeSlider = elPlayer?.querySelector('[data-volume]');
const VOLUME_STORAGE_KEY = 'rwque-player-volume';
const worksModal = document.querySelector('[data-works-modal]');
const worksList = worksModal?.querySelector('[data-works-list]');
const worksSearch = worksModal?.querySelector('[data-works-search]');
const worksCloseButtons = worksModal ? worksModal.querySelectorAll('[data-close-works]') : [];
const worksOpenButtons = document.querySelectorAll('[data-open-works]');

let tracks = [];
let trackIndex = 0;
let trackLen = 0; // seconds
let audio;
let audioCtx, analyser, srcNode, rafId;
let pendingAutoplay = true;
let userVolume = (() => {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const stored = (() => {
    try {
      const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (raw == null) return null;
      const num = Number(raw);
      return Number.isFinite(num) ? clamp(num) : null;
    } catch { return null; }
  })();
  if (stored !== null) return stored;
  const sliderVal = volumeSlider ? Number(volumeSlider.value) : NaN;
  if (Number.isFinite(sliderVal)) return clamp(sliderVal / 100);
  return 0.5;
})();
const BAR_COUNT = 48;
const VISUAL_MAX = 60; // px, match CSS height
const VISUAL_MIN = 12; // px minimal bar
const VISUAL_GAIN = 2.6; // boost energy visually
const VISUAL_GAMMA = 0.55; // curve, <1 = more reactive
let barEls = [];
let baseHeights = [];
let ctxRetryId;
const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'keydown'];
const KNOWN_TAGS = ['UI', 'UX', 'UI Design', 'Scripting', 'Systems', 'Mechanics', 'Fullstack', 'Backend', 'Frontend', 'Skills'];
let worksCache = [];
let worksLoadedType = null;

const formatTime = (sec = 0) => {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const loadLocalTracks = async () => {
  try {
    const r = await fetch('/api/songs');
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j.tracks) ? j.tracks : [];
  } catch { return []; }
};

const shuffleTracks = (list = []) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    if (i !== j) {
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  }
  return list;
};

const setSource = async (index, startAt = 0, autoplay = true) => {
  if (!elPlayer) return;
  if (!tracks.length) return;
  // stop any previous animation loop
  try { stopVizLoop(); } catch {}
  trackIndex = (index + tracks.length) % tracks.length;
  const { title, audio: url, icon } = tracks[trackIndex];
  elTitle && (elTitle.textContent = title || 'Untitled');
  if (icon && elIcon) elIcon.src = icon;
  const ruleVol = lookupTrackVolume(title);
  // reset UI progress
  if (elCurrent) elCurrent.textContent = '0:00';
  if (elBars) elBars.setAttribute('aria-valuenow', '0');
  if (barEls && barEls.length) barEls.forEach(b => b.classList.remove('progress'));
  if (audio) {
    try { audio.pause(); } catch {}
    try { audio.remove(); } catch {}
  }
  audio = new Audio(url);
  try { audio.crossOrigin = 'anonymous'; } catch {}
  audio.preload = 'auto';
  audio.autoplay = Boolean(autoplay);
  audio.playsInline = true;
  audio.volume = userVolume;
  audio.muted = userVolume === 0;
  // attach to DOM for better autoplay reliability
  try { elPlayer && elPlayer.appendChild(audio); } catch {}
  // Wire Web Audio API visualizer
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (srcNode) { try { srcNode.disconnect(); } catch {} }
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5; // more responsive to beats
    }
    srcNode = audioCtx.createMediaElementSource(audio);
    // connect to analyser and also to destination so audio is audible
    srcNode.connect(analyser);
    srcNode.connect(audioCtx.destination);
  } catch {}

  const onLoadedMeta = () => {
    trackLen = Math.floor(audio.duration || 0);
    elDuration && (elDuration.textContent = formatTime(trackLen));
    if (startAt > 0 && audio.seekable) {
      try { audio.currentTime = Math.min(startAt, audio.duration || startAt); } catch {}
    }
  };
  audio.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
  audio.addEventListener('timeupdate', () => {
    const t = Math.floor(audio.currentTime);
    if (elCurrent) elCurrent.textContent = formatTime(t);
    // progress coloring on bars
    if (elBars && barEls.length) {
      const len = trackLen || Math.floor(audio.duration || 0);
      const pct = len > 0 ? (t / len) : 0;
      const filled = Math.round(pct * BAR_COUNT);
      barEls.forEach((b, i) => {
        if (i < filled) b.classList.add('progress');
        else b.classList.remove('progress');
      });
      elBars.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
    }
  });
  audio.addEventListener('canplay', () => { try { ensureAudioContextActive(); } catch {} });
  audio.addEventListener('play', () => { btnPlay?.classList.add('playing'); startVizLoop(); });
  audio.addEventListener('pause', () => { btnPlay?.classList.remove('playing'); stopVizLoop(); });
  audio.addEventListener('ended', () => {
    setSource(trackIndex + 1, 0, true);
  });
  // Autoplay: try audible first; fallback to muted then fade-in
  pendingAutoplay = Boolean(autoplay);
  (async () => {
    try {
      audio.muted = userVolume === 0;
      audio.volume = userVolume;
      await audio.play();
      btnPlay?.classList.add('playing');
      try { audioCtx && audioCtx.resume && audioCtx.resume(); } catch {}
      startVizLoop();
      pendingAutoplay = false;
      if (ruleVol !== null) animateVolumeTo(ruleVol, 700);
      return;
    } catch {}
    try {
      audio.muted = true; audio.defaultMuted = true; try { audio.setAttribute('muted', ''); } catch {}
      audio.volume = 0;
      await audio.play();
      btnPlay?.classList.add('playing');
      try { audioCtx && audioCtx.resume && audioCtx.resume(); } catch {}
      startVizLoop();
      pendingAutoplay = false;
      let v = 0;
      const id = setInterval(() => {
        const target = ruleVol ?? userVolume;
        v = Math.min(target, v + 0.1);
        try { audio.volume = v; } catch {}
        if (v >= target) {
          try {
            audio.muted = false; audio.defaultMuted = false; audio.removeAttribute('muted');
          } catch {}
          clearInterval(id);
        }
      }, 120);
    } catch {
      btnPlay?.classList.remove('playing');
    }
  })();
};

btnPlay?.addEventListener('click', () => {
  if (!audio) return;
  if (audio.paused) {
    audio.play().then(() => { btnPlay.classList.add('playing'); startVizLoop(); }).catch(() => {});
  } else {
    audio.pause();
    stopVizLoop();
  }
});

// Build bars and interactivity
function buildBars() {
  if (!elBars) return;
  elBars.innerHTML = '';
  barEls = [];
  baseHeights = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const b = document.createElement('div');
    b.className = 'audio-bar';
    elBars.appendChild(b);
    barEls.push(b);
    // build a pleasant baseline shape using combined sines
    const t = i / (BAR_COUNT - 1);
    const wave = 0.34 + 0.33 * Math.sin(t * Math.PI) + 0.22 * Math.sin(t * 3.1 * Math.PI + 0.5);
    const hBase = Math.round(VISUAL_MIN + wave * (VISUAL_MAX - VISUAL_MIN) * 0.55);
    baseHeights.push(hBase);
    b.style.height = hBase + 'px';
  }
}

function seekFromEvent(e) {
  if (!audio || !elBars) return;
  const rect = elBars.getBoundingClientRect();
  const x = Math.min(Math.max((e.clientX || e.touches?.[0]?.clientX) - rect.left, 0), rect.width);
  const ratio = rect.width > 0 ? x / rect.width : 0;
  const len = trackLen || Math.floor(audio.duration || 0);
  const target = Math.round(ratio * len);
  try { audio.currentTime = target; } catch {}
}

let dragging = false;
elBars?.addEventListener('pointerdown', (e) => { dragging = true; elBars.setPointerCapture(e.pointerId); seekFromEvent(e); });
elBars?.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
elBars?.addEventListener('pointerup', (e) => { dragging = false; elBars.releasePointerCapture(e.pointerId); });
elBars?.addEventListener('click', (e) => seekFromEvent(e));

// basic keyboard support for the bars slider
elBars?.setAttribute('tabindex', '0');
elBars?.addEventListener('keydown', (e) => {
  if (!audio) return;
  const len = trackLen || Math.floor(audio.duration || 0);
  if (len <= 0) return;
  if (e.key === 'ArrowRight') { audio.currentTime = Math.min(len, audio.currentTime + 5); e.preventDefault(); }
  if (e.key === 'ArrowLeft')  { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
  if (e.key === 'Home')       { audio.currentTime = 0; e.preventDefault(); }
  if (e.key === 'End')        { audio.currentTime = len; e.preventDefault(); }
});

function startVizLoop() {
  if (!analyser || !barEls.length) return;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);
  const hMax = VISUAL_MAX;
  const hMin = VISUAL_MIN;
  const step = Math.max(1, Math.floor(buf.length / BAR_COUNT));
  cancelAnimationFrame(rafId);
  ensureAudioContextActive();
  const loop = () => {
    analyser.getByteFrequencyData(buf);
    analyser.getByteTimeDomainData(time);
    let energySum = 0;
    for (let i = 0; i < BAR_COUNT; i++) {
      // Frequency window average
      let sumF = 0; let nF = 0;
      const start = i * step;
      const end = Math.min(buf.length, start + step);
      for (let k = start; k < end; k++) { sumF += buf[k]; nF++; }
      const avgF = nF ? (sumF / nF) : 0; // 0..255
      const ampF = avgF / 255;

      // Time-domain RMS window
      let sumT = 0; let nT = 0;
      const tStart = i * Math.floor(time.length / BAR_COUNT);
      const tEnd = Math.min(time.length, tStart + Math.floor(time.length / BAR_COUNT));
      for (let k = tStart; k < tEnd; k++) {
        const v = (time[k] - 128) / 128; // -1..1
        sumT += v * v; nT++;
      }
      const rms = nT ? Math.sqrt(sumT / nT) : 0; // 0..1

      // Bass weighting: emphasize lower bars for stronger beats
      const weight = 0.55 + 0.45 * (1 - (i / (BAR_COUNT - 1))); // 1.0 at low end -> 0.55 at high end
      // Combine and boost
      const combined = Math.min(1, (0.65 * ampF + 0.35 * rms) * VISUAL_GAIN * weight);
      const amp = Math.min(1, Math.pow(combined, VISUAL_GAMMA));
      const hBase = baseHeights[i] || hMin;
      const h = Math.max(hBase, Math.round(hBase + amp * (hMax - hBase)));
      energySum += amp;
      barEls[i].style.height = h + 'px';
    }
    // If there is effectively no signal (e.g., context suspended), animate a gentle wave
    if (!Number.isFinite(energySum) || energySum < 5) {
      const t = performance.now() / 300;
      for (let i = 0; i < BAR_COUNT; i++) {
        const wave = (Math.sin(t + i * 0.4) + 1) / 2; // 0..1
        const amp = Math.pow(wave, 0.8);
        const h = Math.max(hMin, Math.round(amp * (hMax - hMin)));
        barEls[i].style.height = h + 'px';
      }
    }
    rafId = requestAnimationFrame(loop);
  };
  loop();
}

function stopVizLoop() { cancelAnimationFrame(rafId); }

function ensureAudioContextActive(fromGesture = false) {
  if (!audioCtx) return;
  clearInterval(ctxRetryId);
  if (audioCtx.state === 'running') return;
  const tryResume = async () => {
    try {
      await audioCtx.resume();
      if (audioCtx.state === 'running') clearInterval(ctxRetryId);
    } catch {}
  };
  if (fromGesture) {
    tryResume();
    return;
  }
  ctxRetryId = setInterval(tryResume, 500);
}

async function attemptPendingPlay() {
  if (!pendingAutoplay || !audio) return;
  try {
    audio.muted = false;
    audio.volume = userVolume;
    await audio.play();
    pendingAutoplay = false;
    btnPlay?.classList.add('playing');
    startVizLoop();
  } catch {}
}

let gestureUnlockActive = false;
function primeAudioContextOnGesture() {
  if (gestureUnlockActive) return;
  gestureUnlockActive = true;
  const unlock = () => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    ensureAudioContextActive(true);
    attemptPendingPlay();
    if (!pendingAutoplay && audioCtx?.state === 'running') {
      GESTURE_EVENTS.forEach(evt => window.removeEventListener(evt, unlock));
      gestureUnlockActive = false;
    }
  };
  GESTURE_EVENTS.forEach(evt => window.addEventListener(evt, unlock, { passive: true }));
}

btnPrev?.addEventListener('click', () => {
  if (!audio) return;
  const current = audio.currentTime;
  if (current > 3) {
    setSource(trackIndex, 0, !audio.paused);
  } else {
    setSource(trackIndex - 1, 0, !audio.paused);
  }
});

btnNext?.addEventListener('click', () => {
  if (!audio) return;
  setSource(trackIndex + 1, 0, !audio.paused);
});

function setPlayerVolume(v) {
  userVolume = Math.min(1, Math.max(0, v));
  if (volumeSlider) {
    const target = Math.round(userVolume * 100);
    if (Number(volumeSlider.value) !== target) volumeSlider.value = String(target);
  }
  if (audio) {
    audio.volume = userVolume;
    audio.muted = userVolume === 0;
  }
  try { localStorage.setItem(VOLUME_STORAGE_KEY, String(userVolume)); } catch {}
}

volumeSlider?.addEventListener('input', (e) => {
  const val = Number(e.target?.value);
  if (!Number.isFinite(val)) return;
  setPlayerVolume(val / 100);
});

setPlayerVolume(userVolume);

// removed legacy range slider listeners

// Load tracks from local assets and start playback
(async () => {
  buildBars();
  // seed bars for nicer initial look
  if (barEls.length) {
    for (let i = 0; i < barEls.length; i++) {
      const base = 6 + Math.round(Math.random() * 18);
      barEls[i].style.height = base + 'px';
    }
  }
  primeAudioContextOnGesture();
  tracks = await loadLocalTracks();
  if (!tracks.length) {
    elTitle && (elTitle.textContent = 'Add songs in assets/songs/<Name>/{audio.mp3, icon.png}');
    if (elIcon) elIcon.src = 'https://www.youtube.com/s/desktop/5f8b1f6f/img/favicon_144x144.png';
    return;
  }
  shuffleTracks(tracks);
  setSource(0, 0, true);
})();

const copyBtn = document.querySelector("[data-copy]");
copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("rwque.");
    copyBtn.classList.add("copied");
    setTimeout(() => copyBtn.classList.remove("copied"), 3000);
  } catch (err) {
    console.error("Clipboard error", err);
  }
});

const root = document.documentElement;
const gridHighlight = document.querySelector('.grid-highlight');
const isBackground = (el) => !el.closest('main, header, section, footer, .audio-player, .game-card, .btn, .stack-grid, .hero');

const getCellSize = (() => {
  let cached = null;
  return () => {
    if (cached) return cached;
    const parsed = parseFloat(getComputedStyle(root).getPropertyValue('--grid-cell'));
    cached = Number.isFinite(parsed) ? parsed : 80;
    return cached;
  };
})();

let lastCellX = null;
let lastCellY = null;
let lastBgX = null;
let lastBgY = null;
let ghostedAtLastBg = false;
let lastBgTs = 0;
const gridGhosts = [];
const MAX_GRID_GHOSTS = 36;

function spawnGhostAt(x, y, lifetime = 1000) {
  try {
    const ghost = document.createElement('div');
    ghost.className = 'grid-ghost';
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    ghost.style.opacity = '0.85';
    document.body.appendChild(ghost);
    gridGhosts.push(ghost);
    while (gridGhosts.length > MAX_GRID_GHOSTS) { const old = gridGhosts.shift(); old?.remove(); }
    // force layout so the opacity transition reliably triggers across browsers
    void ghost.offsetHeight;
    requestAnimationFrame(() => { ghost.style.opacity = '0'; });
    setTimeout(() => {
      const idx = gridGhosts.indexOf(ghost);
      if (idx >= 0) gridGhosts.splice(idx, 1);
      ghost.remove();
    }, lifetime);
  } catch {}
}

window.addEventListener("pointermove", (event) => {
  // keep grid lines fixed for proper alignment
  root.style.setProperty("--grid-pos-x", `0px`);
  root.style.setProperty("--grid-pos-y", `0px`);
  const cellSize = getCellSize();
  const cellX = Math.floor(event.clientX / cellSize) * cellSize;
  const cellY = Math.floor(event.clientY / cellSize) * cellSize;
  if (!gridHighlight) return;
  const onBg = isBackground(event.target);
  gridHighlight.style.opacity = onBg ? '1' : '0';
  const moved = cellX !== lastCellX || cellY !== lastCellY;
  const movedBg = onBg && (cellX !== lastBgX || cellY !== lastBgY);
  // If we just left the background into UI, drop a ghost once at the last background cell
  if (!onBg && lastBgX !== null && lastBgY !== null && !ghostedAtLastBg) {
    spawnGhostAt(lastBgX, lastBgY, 1000);
    ghostedAtLastBg = true;
  }
  if (movedBg && lastBgX !== null && lastBgY !== null) {
    spawnGhostAt(lastBgX, lastBgY, 1000);
  }
  gridHighlight.style.transform = `translate(${cellX}px, ${cellY}px)`;
  lastCellX = cellX;
  lastCellY = cellY;
  if (onBg) { lastBgX = cellX; lastBgY = cellY; lastBgTs = performance.now(); ghostedAtLastBg = false; }
});

// Drop a ghost when clicking on background only
window.addEventListener('pointerdown', (event) => {
  const onBg = isBackground(event.target);
  if (!onBg) return; // Don't spawn ghosts when clicking UI elements
  const cellSize = getCellSize();
  const cellX = Math.floor(event.clientX / cellSize) * cellSize;
  const cellY = Math.floor(event.clientY / cellSize) * cellSize;
  if (Number.isFinite(cellX) && Number.isFinite(cellY)) {
    spawnGhostAt(cellX, cellY, 1000);
  }
  setTimeout(() => { ghostedAtLastBg = false; }, 120);
}, { capture: true, passive: true });

async function fetchWorks(kind) {
  if (worksLoadedType === kind && worksCache.length) return worksCache;
  worksList && (worksList.innerHTML = '<p class="works-modal__info">Loading works...</p>');
  try {
    const res = await fetch(`/api/works/${kind}`);
    if (!res.ok) throw new Error('Works endpoint failed');
    const data = await res.json();
    worksCache = Array.isArray(data.works) ? data.works : [];
    worksLoadedType = kind;
  } catch (err) {
    console.error('Works fetch error:', err);
    worksCache = [];
  }
  return worksCache;
}

function renderWorks(filter = '') {
  if (!worksList) return;
  const term = filter.toLowerCase();
  if (!worksCache.length) {
    worksList.innerHTML = '<p class="works-modal__info">No works found yet.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  const filtered = worksCache.filter((work) => {
    const tags = work.tags || [];
    if (!term) return true;
    const haystack = [work.name, ...tags].join(' ').toLowerCase();
    return haystack.includes(term);
  });
  if (!filtered.length) {
    worksList.innerHTML = '<p class="works-modal__info">No works match your search.</p>';
    return;
  }
  filtered.forEach((work) => {
    const tags = work.tags || [];
    const card = document.createElement('article');
    card.className = 'works-card';
    
    // Processar URL do Streamable
    let videoContent = '';
    if (work.video && work.video.includes('streamable.com')) {
      // Extrair o ID do Streamable da URL
      const streamableId = work.video.split('/').pop();
      // Usar iframe do Streamable com parâmetros específicos para remover UI
      videoContent = `
        <div class="streamable-wrapper">
          <iframe 
            src="https://streamable.com/e/${streamableId}?autoplay=0&muted=0&ui=0&controls=0&hd=1" 
            frameborder="0" 
            allowfullscreen
            allow="autoplay; fullscreen"
          ></iframe>
          <div class="side-overlay-left"></div>
          <div class="side-overlay-right"></div>
        </div>
      `;
    } else if (work.video) {
      // Fallback para vídeo normal se não for do Streamable
      videoContent = `
        <video src="${work.video}" preload="metadata" playsinline></video>
        <div class="video-controls">
          <button class="video-btn video-playpause" aria-label="Play/Pause">
            <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          <div class="video-progress">
            <input type="range" class="video-slider" min="0" max="100" value="0" step="0.1">
            <div class="video-progress-bar"><div class="video-progress-filled"></div></div>
          </div>
          <span class="video-time">0:00 / 0:00</span>
          <button class="video-btn video-fullscreen" aria-label="Fullscreen">
            <svg class="icon-expand" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            <svg class="icon-compress" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
          </button>
        </div>
      `;
    }
    
    card.innerHTML = `
      <header>
        <h3>${work.name}</h3>
        ${tags.length ? `<div class="works-card__tags">${tags.map((tag) => `<span class="works-tag">${tag}</span>`).join('')}</div>` : ''}
      </header>
      <div class="works-card__media">
        ${videoContent}
      </div>
    `;
    fragment.appendChild(card);
  });
  worksList.innerHTML = '';
  worksList.appendChild(fragment);
  initVideoControls();
}

function initVideoControls() {
  document.querySelectorAll('.works-card__media').forEach((media) => {
    // Ignorar se for um embed do Streamable
    if (media.querySelector('.streamable-embed')) return;
    
    const video = media.querySelector('video');
    const playBtn = media.querySelector('.video-playpause');
    const fullscreenBtn = media.querySelector('.video-fullscreen');
    const slider = media.querySelector('.video-slider');
    const progressFilled = media.querySelector('.video-progress-filled');
    const timeDisplay = media.querySelector('.video-time');
    if (!video) return;

    const formatTime = (sec) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const updatePlayState = () => {
      media.classList.toggle('playing', !video.paused);
    };

    const updateProgress = () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      if (slider) slider.value = pct;
      if (progressFilled) progressFilled.style.width = `${pct}%`;
      if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    };

    playBtn?.addEventListener('click', () => {
      if (video.paused) video.play();
      else video.pause();
    });

    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('ended', updatePlayState);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);

    slider?.addEventListener('input', () => {
      if (!video.duration) return;
      video.currentTime = (slider.value / 100) * video.duration;
    });

    fullscreenBtn?.addEventListener('click', () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl === media) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        if (media.requestFullscreen) media.requestFullscreen();
        else if (media.webkitRequestFullscreen) media.webkitRequestFullscreen();
        else if (media.msRequestFullscreen) media.msRequestFullscreen();
      }
    });

    // Volume controls
    const volumeBtn = media.querySelector('.video-volume');
    const volumeSlider = media.querySelector('.volume-slider');
    
    const updateMuteState = () => {
      media.classList.toggle('muted', video.muted || video.volume === 0);
    };
    
    volumeBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      updateMuteState();
      if (volumeSlider) volumeSlider.value = video.muted ? 0 : video.volume * 100;
    });
    
    volumeSlider?.addEventListener('input', () => {
      video.volume = volumeSlider.value / 100;
      video.muted = video.volume === 0;
      updateMuteState();
    });

    const onFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      media.classList.toggle('is-fullscreen', fsEl === media);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    video.addEventListener('click', () => {
      if (video.paused) video.play();
      else video.pause();
    });
  });
}

function openWorksModal(kind) {
  if (!worksModal) return;
  worksModal.hidden = false;
  worksModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  fetchWorks(kind).then(() => renderWorks(''));
}

function closeWorksModal() {
  if (!worksModal) return;
  worksModal.hidden = true;
  worksModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (worksSearch) worksSearch.value = '';
}

worksOpenButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const kind = btn.getAttribute('data-open-works');
    openWorksModal(kind || 'roblox');
  });
});

worksCloseButtons.forEach((btn) => btn.addEventListener('click', closeWorksModal));

let worksSearchTimeout = null;
worksSearch?.addEventListener('input', (e) => {
  const value = e.target.value || '';
  clearTimeout(worksSearchTimeout);
  worksSearchTimeout = setTimeout(() => renderWorks(value), 150);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && worksModal && !worksModal.hidden) {
    closeWorksModal();
  }
});

// Available tags reference:
// UI, UX, UI Design, Scripting, Systems, Mechanics, Fullstack, Backend, Frontend, Skills
