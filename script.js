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
// Disclaimer Modal
const disclaimerModal = document.getElementById('disclaimerModal');
const proceedBtn = document.getElementById('proceedBtn');
const countdownEl = document.getElementById('countdown');

let countdown = 5;
const countdownInterval = setInterval(() => {
  countdown--;
  if (countdownEl) countdownEl.textContent = countdown;
  
  if (countdown <= 0) {
    clearInterval(countdownInterval);
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.textContent = 'Proceed';
    }
  }
}, 1000);

proceedBtn?.addEventListener('click', () => {
  if (disclaimerModal) {
    disclaimerModal.style.opacity = '0';
    setTimeout(() => {
      disclaimerModal.style.display = 'none';
    }, 500);
  }
});

// Fetch Discord presence on load
fetchDiscordPresence();
setInterval(fetchDiscordPresence, 30000); // Update every 30 seconds time every second
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
// Get PLACE_IDS from server.js
const PLACE_IDS = ["7991339063", "9054723407", "13689905003", "13603968116"];

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

const fetchGameData = async (forceRefresh = false) => {
  const url = forceRefresh ? "/api/games?refresh=true" : "/api/games";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  const response = await fetch(url, { signal: controller.signal }).catch((e) => {
    clearTimeout(timeoutId);
    throw e;
  });
  clearTimeout(timeoutId);
  if (!response.ok) throw new Error("Proxy offline");
  const data = await response.json();
  
  // Verificar se os dados vieram do cache
  const fromCache = data.fromCache === true;
  const fromPersistentCache = data.fromPersistentCache === true;
  const isComplete = data.complete === true;
  
  // Mapear os jogos para o formato esperado
  const games = data.games.map((details) => ({
    name: details.name,
    visits: formatVisits(details.visits),
    visitsRaw: Number(details.visits || 0),
    icon: details.icon ?? "https://via.placeholder.com/150/111/FFFFFF?text=Roblox",
    link: details.link,
    fromCache,
    fromPersistentCache: details.fromPersistentCache || fromPersistentCache
  }));
  
  // Adicionar metadados para ajudar na lógica de retry
  games.isComplete = isComplete;
  games.fromCache = fromCache;
  games.fromPersistentCache = fromPersistentCache;
  
  return games;
};

// Variáveis para controle de retry
let gamesRetryCount = 0;
const MAX_AUTO_RETRIES = 5; // Aumentado para 5 tentativas
let gamesRetryTimeout = null;
let lastGamesLoadAttempt = 0;

// Client-side cache for instant render
const GAMES_LS_KEY = 'rwque-games-cache-v1';
const CLIENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function saveGamesToLocalCache(games = []) {
  try {
    const payload = {
      ts: Date.now(),
      games: games.map(g => ({ name: g.name, visits: Number(g.visitsRaw || 0), icon: g.icon, link: g.link }))
    };
    localStorage.setItem(GAMES_LS_KEY, JSON.stringify(payload));
  } catch {}
}

function loadGamesFromLocalCache() {
  try {
    const raw = localStorage.getItem(GAMES_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.games)) return null;
    if (Date.now() - Number(parsed.ts || 0) > CLIENT_CACHE_TTL) return null;
    
    return parsed.games.map(g => ({
      name: g.name,
      visits: formatVisits(Number(g.visits || 0)),
      icon: g.icon ?? "https://via.placeholder.com/150/111/FFFFFF?text=Roblox",
      link: g.link
    }));
  } catch { return null; }
}

// Interval for periodic background refresh
let gamesAutoRefreshInterval = null;
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
let initialLoadGuard = null;

const renderGames = async (isRetry = false) => {
  // Limpar qualquer timeout pendente
  if (gamesRetryTimeout) {
    clearTimeout(gamesRetryTimeout);
    gamesRetryTimeout = null;
  }
  
  // Remover qualquer nota de erro anterior
  const existingNote = document.querySelector('.games-section-note');
  if (existingNote) existingNote.remove();
  
  // Initial loading message only if nothing is rendered yet
  const hasAnyCard = !!grid.querySelector('.game-card');
  if (!isRetry && !hasAnyCard) {
    // Try rendering client cache instantly
    const cached = loadGamesFromLocalCache();
    if (cached && cached.length) {
      grid.innerHTML = "";
      cached.forEach(createCard);
    } else {
      setPlaceholder("Loading experiences...");
      // Guard: if nothing loaded within 2.5s, show a better loading message
      initialLoadGuard = setTimeout(() => {
        if (!grid.querySelector('.game-card')) {
          setPlaceholder("Still loading experiences... Please wait.");
        }
      }, 2500);
    }
  }

  try {
    lastGamesLoadAttempt = Date.now();
    // Force refresh only on retries to bypass server cache when needed
    const games = await fetchGameData(isRetry);
    
    // Check if dataset is complete
    const needsRetry = !games.isComplete;

    // Display any valid games we have, even if data is incomplete
    if (needsRetry) {
      if (initialLoadGuard) { clearTimeout(initialLoadGuard); initialLoadGuard = null; }
      
      // Filter out games with valid data
      const validNow = games.filter(g => g && g.name && g.name !== 'Unknown');
      
      // Only update the display if we have valid games
      if (validNow.length > 0) {
        grid.innerHTML = "";
        validNow.forEach(createCard);
      } else if (!grid.querySelector('.game-card')) {
        // If nothing is displayed yet, show loading message
        setPlaceholder("Loading experiences...");
      }
      if (gamesRetryCount < MAX_AUTO_RETRIES) {
        gamesRetryCount++;
        const delay = Math.min(2000 * Math.pow(2, gamesRetryCount - 1), 30000);
        console.log(`Incomplete data, retrying in ${delay/1000}s (${gamesRetryCount}/${MAX_AUTO_RETRIES})`);
        gamesRetryTimeout = setTimeout(() => renderGames(true), delay);
      }
      return;
    }

    // Render complete dataset
    if (initialLoadGuard) { clearTimeout(initialLoadGuard); initialLoadGuard = null; }
    
    grid.innerHTML = "";
    games.forEach(createCard);

    // Save fresh data for instant loads next time
    if (games.isComplete) {
      saveGamesToLocalCache(games);
    }
    
    // Reset retry counter on success
    if (!needsRetry) {
      gamesRetryCount = 0;
      
      // Configurar verificação periódica para manter os dados atualizados
      if (!gamesAutoRefreshInterval) {
        gamesAutoRefreshInterval = setInterval(() => {
          // Verificar se a página está visível antes de atualizar
          if (document.visibilityState === 'visible') {
            renderGames(true);
          }
        }, AUTO_REFRESH_INTERVAL);
      }
    }
  } catch (error) {
    console.error(error);
    // Clear loading guard if it exists
    if (initialLoadGuard) { clearTimeout(initialLoadGuard); initialLoadGuard = null; }
    
    // If nothing is displayed yet, show error message
    if (!grid.querySelector('.game-card')) {
      setPlaceholder("Could not load experiences. Retrying...");
    }
    
    // Retry silently
    if (gamesRetryCount < MAX_AUTO_RETRIES) {
      gamesRetryCount++;
      // Exponential backoff (2s, 4s, 8s, 16s, 32s)
      const delay = Math.min(2000 * Math.pow(2, gamesRetryCount - 1), 30000);
      console.log(`API error, retrying in ${delay/1000}s (${gamesRetryCount}/${MAX_AUTO_RETRIES})`);
      gamesRetryTimeout = setTimeout(() => renderGames(true), delay);
    }
  }
};

// Start loading games
renderGames();

// Clean timers on unload
window.addEventListener('beforeunload', () => {
  if (gamesAutoRefreshInterval) {
    clearInterval(gamesAutoRefreshInterval);
    gamesAutoRefreshInterval = null;
  }
  if (gamesRetryTimeout) {
    clearTimeout(gamesRetryTimeout);
    gamesRetryTimeout = null;
  }
});

// Pause/resume background refresh when tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !gamesAutoRefreshInterval) {
    // Resume updates when the page becomes visible
    gamesAutoRefreshInterval = setInterval(() => {
      renderGames(true);
    }, AUTO_REFRESH_INTERVAL);
  } else if (document.visibilityState === 'hidden' && gamesAutoRefreshInterval) {
    // Pause updates when the page is hidden
    clearInterval(gamesAutoRefreshInterval);
    gamesAutoRefreshInterval = null;
  }
});

// Set current year in footer
document.querySelector("#year").textContent = new Date().getFullYear();

// Visitor counter functionality
const VISITOR_COUNT_KEY = 'portfolio-visitor-count';
const VISITOR_LAST_VISIT_KEY = 'portfolio-last-visit';
const VISITOR_SESSION_KEY = 'portfolio-session-id';

async function initVisitorCounter() {
  const visitorCountElement = document.getElementById('visitor-count');
  if (!visitorCountElement) return;
  
  // Generate a unique session ID if not exists
  if (!sessionStorage.getItem(VISITOR_SESSION_KEY)) {
    sessionStorage.setItem(VISITOR_SESSION_KEY, Date.now().toString() + Math.random().toString(36).substring(2, 15));
  }
  
  // Get current count from localStorage as initial value
  let count = parseInt(localStorage.getItem(VISITOR_COUNT_KEY) || '0');
  const lastVisit = localStorage.getItem(VISITOR_LAST_VISIT_KEY) || '0';
  const now = Date.now();
  const hoursSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60);
  
  // Display initial count while we check with the server
  visitorCountElement.textContent = count.toString();
  
  try {
    // First try to get the current count from the server
    const response = await fetch('/api/visitor-count');
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.count === 'number') {
        // Update with server count
        count = data.count;
        localStorage.setItem(VISITOR_COUNT_KEY, count.toString());
        visitorCountElement.textContent = count.toString();
      }
    }
  } catch (error) {
    console.log('Could not fetch visitor count from server, using local count');
  }
  
  // Only increment if it's been at least 1 hour since last visit
  // or if this is the first visit in this session
  if (hoursSinceLastVisit >= 1 || !lastVisit) {
    count++;
    localStorage.setItem(VISITOR_COUNT_KEY, count.toString());
    localStorage.setItem(VISITOR_LAST_VISIT_KEY, now.toString());
    
    // Save to server if possible
    try {
      const result = await saveVisitorCountToServer(count);
      if (result && result.count) {
        visitorCountElement.textContent = result.count.toString();
      } else {
        visitorCountElement.textContent = count.toString();
      }
      
      // Animate the counter
      visitorCountElement.style.animation = 'pulse 1s';
      setTimeout(() => {
        visitorCountElement.style.animation = '';
      }, 1000);
    } catch (error) {
      console.error('Error saving visitor count:', error);
      visitorCountElement.textContent = count.toString();
    }
  }
}

async function saveVisitorCountToServer(count) {
  try {
    // Try to save to server if API exists
    const response = await fetch('/api/visitor-count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.count && data.count !== count) {
        // Update local storage with server count if different
        localStorage.setItem(VISITOR_COUNT_KEY, data.count.toString());
      }
      return data;
    }
    return null;
  } catch (error) {
    // Silently fail if server API doesn't exist
    console.log('Could not save visitor count to server, using local storage only');
    return null;
  }
}

// Initialize visitor counter
initVisitorCounter();

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

// Cache para links MP4 do Streamable já resolvidos
const streamableMp4Cache = new Map();

// Função para extrair MP4 do Streamable via API
async function resolveStreamableUrl(url) {
  if (streamableMp4Cache.has(url)) {
    return streamableMp4Cache.get(url);
  }
  try {
    const res = await fetch(`/api/streamable?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Streamable API failed');
    const data = await res.json();
    if (data.mp4) {
      streamableMp4Cache.set(url, data.mp4);
      return data.mp4;
    }
  } catch (err) {
    console.error('Streamable resolve error:', err);
  }
  return null;
}

// Verifica se é um link do Streamable
function isStreamableUrl(url) {
  return /streamable\.com\/[a-zA-Z0-9]+/i.test(url);
}

async function renderWorks(filter = '') {
  if (!worksList) return;
  const term = filter.toLowerCase();
  if (!worksCache.length) {
    worksList.innerHTML = '<p class="works-modal__info">No works found yet.</p>';
    return;
  }
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
  
  // Mostrar loading enquanto resolve os links do Streamable
  worksList.innerHTML = '<p class="works-modal__info">Loading videos...</p>';
  
  // Resolver todos os links do Streamable em paralelo
  const resolvedWorks = await Promise.all(filtered.map(async (work) => {
    let videoUrl = work.video;
    if (videoUrl && isStreamableUrl(videoUrl)) {
      const mp4Url = await resolveStreamableUrl(videoUrl);
      if (mp4Url) {
        videoUrl = mp4Url;
      }
    }
    return { ...work, resolvedVideo: videoUrl };
  }));
  
  const fragment = document.createDocumentFragment();
  resolvedWorks.forEach((work) => {
    const tags = work.tags || [];
    const card = document.createElement('article');
    card.className = 'works-card';
    
    // Processar URL do vídeo
    let videoContent = '';
    if (work.resolvedVideo) {
      // Usar vídeo nativo com player customizado
      videoContent = `
        <div class="video-wrapper">
          <video src="${work.resolvedVideo}" preload="metadata" playsinline crossorigin="anonymous"></video>
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
            <div class="volume-wrapper">
              <button class="video-btn video-volume" aria-label="Volume">
                <svg class="icon-volume-on" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                <svg class="icon-volume-off" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              </button>
              <div class="volume-slider-container">
                <input type="range" class="volume-slider" min="0" max="100" value="100" step="1">
              </div>
            </div>
            <button class="video-btn video-fullscreen" aria-label="Fullscreen">
              <svg class="icon-expand" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              <svg class="icon-compress" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            </button>
          </div>
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
  // Encontrar todos os wrappers de vídeo
  const videoWrappers = document.querySelectorAll('.video-wrapper');
  
  videoWrappers.forEach(media => {
    const video = media.querySelector('video');
    if (!video) return;

    // Botão de play/pause
    const playPauseBtn = media.querySelector('.video-playpause');
    
    const togglePlay = () => {
      if (video.paused || video.ended) {
        video.play();
        media.classList.add('playing');
      } else {
        video.pause();
        media.classList.remove('playing');
      }
    };
    
    video.addEventListener('click', togglePlay);
    playPauseBtn?.addEventListener('click', togglePlay);
    
    // Atualizar progresso
    const progressBar = media.querySelector('.video-progress-filled');
    const timeDisplay = media.querySelector('.video-time');
    const slider = media.querySelector('.video-slider');
    
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    
    const updateProgress = () => {
      if (!video.duration) return;
      
      const percent = (video.currentTime / video.duration) * 100;
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (slider) slider.value = percent;
      
      if (timeDisplay) {
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
    };
    
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    
    slider?.addEventListener('input', () => {
      if (!video.duration) return;
      video.currentTime = (slider.value / 100) * video.duration;
    });

    // Fullscreen
    const fullscreenBtn = media.querySelector('.video-fullscreen');
    
    fullscreenBtn?.addEventListener('click', () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl === media) {
        media.classList.remove('fullscreen');
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        media.classList.add('fullscreen');
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
    
    // Inicializar estado
    updateMuteState();
    updateProgress();
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
