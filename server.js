const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const ytdl = require("ytdl-core");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const PLACE_IDS = ["7991339063", "9054723407", "13689905003", "13603968116"]; // adicione novos IDs aqui

app.use(express.static(path.join(__dirname)));

// Ensure local songs folder exists
const SONGS_ROOT = path.join(__dirname, "assets", "songs");
const ROBLOX_WORKS_ROOT = path.join(__dirname, "assets", "works", "roblox");
const ROBLOX_WORKS_INDEX = path.join(ROBLOX_WORKS_ROOT, "works.json");
const ROBLOX_WORKS_ALT_INDEX = path.join(__dirname, "assets", "works", "works.json");
try { fs.mkdirSync(SONGS_ROOT, { recursive: true }); } catch {}
try { fs.mkdirSync(ROBLOX_WORKS_ROOT, { recursive: true }); } catch {}

// Função para buscar dados com timeout (movida para cima para uso em /api/streamable)
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Local songs listing: reads assets/songs/<TrackName>/{audio.mp3,icon.png}
app.get("/api/songs", (_req, res) => {
  try {
    const dirs = fs.readdirSync(SONGS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory());
    const tracks = dirs.map(d => {
      const dir = path.join(SONGS_ROOT, d.name);
      let files = [];
      try { files = fs.readdirSync(dir); } catch {}
      const audio = files.find(f => /\.(mp3|m4a|webm|ogg)$/i.test(f));
      const icon = files.find(f => /^icon\.(png|jpg|jpeg|webp)$/i.test(f));
      if (!audio) return null;
      const encName = encodeURIComponent(d.name);
      const encAudio = encodeURIComponent(audio);
      const iconUrl = icon ? `/assets/songs/${encName}/${encodeURIComponent(icon)}` : null;
      return {
        title: d.name,
        audio: `/assets/songs/${encName}/${encAudio}`,
        icon: iconUrl,
      };
    }).filter(Boolean);
    res.json({ tracks });
  } catch (e) {
    console.error("Songs scan error:", e.message);
    res.json({ tracks: [] });
  }
});

// Streamable MP4 extractor - usa a API oficial do Streamable
app.get("/api/streamable", async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do Streamable é obrigatória' });
  }

  // Extrair shortcode do URL do Streamable
  const streamableMatch = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
  if (!streamableMatch) {
    return res.status(400).json({ error: 'URL inválida do Streamable' });
  }

  const shortcode = streamableMatch[1];

  try {
    // Usar a API oficial do Streamable
    const apiUrl = `https://api.streamable.com/videos/${shortcode}`;
    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, 10000);

    if (!response.ok) {
      throw new Error(`Streamable API retornou status ${response.status}`);
    }

    const data = await response.json();

    // Extrair URL do MP4 dos files
    let mp4Url = null;
    if (data.files) {
      // Preferir mp4 de alta qualidade, depois mp4-mobile
      if (data.files.mp4 && data.files.mp4.url) {
        mp4Url = data.files.mp4.url;
      } else if (data.files['mp4-mobile'] && data.files['mp4-mobile'].url) {
        mp4Url = data.files['mp4-mobile'].url;
      }
    }

    if (!mp4Url) {
      return res.status(404).json({ error: 'Não foi possível encontrar o link do vídeo' });
    }

    // Garantir que o URL tenha protocolo
    if (mp4Url.startsWith('//')) {
      mp4Url = 'https:' + mp4Url;
    }

    return res.json({ 
      mp4: mp4Url,
      id: shortcode,
      title: data.title || null,
      thumbnail: data.thumbnail_url ? (data.thumbnail_url.startsWith('//') ? 'https:' + data.thumbnail_url : data.thumbnail_url) : null,
      source: `https://streamable.com/${shortcode}`
    });
  } catch (error) {
    console.error('Streamable API error:', error.message);
    return res.status(500).json({ error: 'Erro ao extrair vídeo do Streamable' });
  }
});

// Roblox works listing: prefers assets/works/roblox/works.json, fallback to folder scan
app.get("/api/works/roblox", (_req, res) => {
  try {
    const jsonWorks = loadRobloxWorksFromIndex();
    let works = jsonWorks;
    if (!works.length) {
      const dirs = fs.readdirSync(ROBLOX_WORKS_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
      works = dirs
        .map((dirEnt) => {
          const dirPath = path.join(ROBLOX_WORKS_ROOT, dirEnt.name);
          let files = [];
          try { files = fs.readdirSync(dirPath); } catch {}
          const video = files.find((f) => /\.(mp4|webm|mov|m4v)$/i.test(f));
          if (!video) return null;
          const encDir = encodeURIComponent(dirEnt.name);
          const videoUrl = `/assets/works/roblox/${encDir}/${encodeURIComponent(video)}`;
          return {
            name: dirEnt.name,
            video: videoUrl,
            tags: [],
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    res.json({ works });
  } catch (error) {
    console.error("Works scan error:", error.message);
    res.json({ works: [] });
  }
});

function loadRobloxWorksFromIndex() {
  try {
    const sourcePath = fs.existsSync(ROBLOX_WORKS_INDEX)
      ? ROBLOX_WORKS_INDEX
      : (fs.existsSync(ROBLOX_WORKS_ALT_INDEX) ? ROBLOX_WORKS_ALT_INDEX : null);
    if (!sourcePath) return [];
    const raw = fs.readFileSync(sourcePath, "utf-8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.works)) return [];
    const works = data.works
      .map((entry) => normalizeWorkEntry(entry))
      .filter(Boolean);
    if (sourcePath === ROBLOX_WORKS_ALT_INDEX && process.env.NODE_ENV !== 'production') {
      console.warn('Consider moving works.json into assets/works/roblox/works.json for clarity.');
    }
    return works;
  } catch (error) {
    console.error("Works json error:", error.message);
    return [];
  }
}

function normalizeWorkEntry(entry = {}) {
  const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
  if (!name) return null;
  let video = entry.video || entry.file;
  if (!video || typeof video !== "string") {
    video = findVideoByFolderName(name);
    if (!video) return null;
  } else {
    video = video.trim();
    if (!/^https?:/i.test(video) && !video.startsWith('/assets/')) {
      const segments = video.split(/[\/]/).filter(Boolean).map((segment) => {
        try { return encodeURIComponent(decodeURIComponent(segment)); }
        catch { return encodeURIComponent(segment); }
      });
      video = `/assets/works/roblox/${segments.join('/')}`;
    }
  }
  const tags = Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim()) : [];
  return { name, video, tags };
}

function findVideoByFolderName(name) {
  try {
    const folder = path.join(ROBLOX_WORKS_ROOT, name);
    const files = fs.readdirSync(folder);
    const video = files.find((f) => /\.(mp4|webm|mov|m4v)$/i.test(f));
    if (!video) return null;
    const segments = [name, video].map((segment) => {
      try { return encodeURIComponent(decodeURIComponent(segment)); }
      catch { return encodeURIComponent(segment); }
    });
    return `/assets/works/roblox/${segments.join('/')}`;
  } catch {
    return null;
  }
}

// Cache de dados para reduzir chamadas à API
let gamesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos
const CACHE_DIR = path.join(__dirname, 'cache');
const GAMES_CACHE_FILE = path.join(CACHE_DIR, 'games.json');
const VISITOR_COUNT_FILE = path.join(CACHE_DIR, 'visitor-count.json');
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

function loadGamesCacheFromDisk() {
  try {
    const raw = fs.readFileSync(GAMES_CACHE_FILE, 'utf-8');
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.games)) return null;
    return { games: j.games, ts: Number(j.ts || 0) };
  } catch { return null; }
}

function saveGamesCacheToDisk(games) {
  try {
    const payload = { ts: Date.now(), games };
    fs.writeFileSync(GAMES_CACHE_FILE, JSON.stringify(payload));
  } catch {}
}

// Função para verificar se o cache é válido
const isCacheValid = () => {
  return gamesCache && (Date.now() - cacheTimestamp < CACHE_TTL);
};


app.get("/api/games", async (req, res) => {
  // Verificar se devemos forçar uma atualização do cache
  const forceRefresh = req.query.refresh === "true";
  
  // Retornar dados do cache se estiver válido e não for forçada atualização
  if (!gamesCache) {
    const disk = loadGamesCacheFromDisk();
    if (disk && Array.isArray(disk.games)) {
      gamesCache = disk.games;
      cacheTimestamp = Number(disk.ts || 0);
    }
  }
  if (isCacheValid() && !forceRefresh) {
    return res.status(200).json({ games: gamesCache, fromCache: true });
  }

  try {
    const placeQuery = PLACE_IDS.map((id) => `placeIds=${id}`).join("&");

    // 1) Mapear placeId -> universeId via roproxy
    const universes = await Promise.all(
      PLACE_IDS.map(async (placeId) => {
        try {
          const r = await fetchWithTimeout(
            `https://apis.roproxy.com/universes/v1/places/${placeId}/universe`,
            {}, 3000
          );
          if (!r.ok) return { placeId, universeId: null };
          const j = await r.json();
          return { placeId, universeId: j.universeId ?? null };
        } catch (err) {
          console.error(`Erro ao buscar universeId para ${placeId}:`, err.message);
          return { placeId, universeId: null };
        }
      })
    );

    const validUniverses = universes.filter((u) => u.universeId);
    const universeIdsCsv = validUniverses.map((u) => u.universeId).join(",");

    // 2) Detalhes de jogos por universeId (visitas, nome)
    let detailsRes = { ok: false };
    if (universeIdsCsv) {
      try {
        detailsRes = await fetchWithTimeout(
          `https://games.roproxy.com/v1/games?universeIds=${universeIdsCsv}`,
          {}, 3000
        );
      } catch (err) {
        console.error("Erro ao buscar detalhes dos jogos:", err.message);
      }
    }

    // 3) Ícones por placeId
    let iconMap = new Map();
    try {
      const iconRes = await fetchWithTimeout(
        `https://thumbnails.roproxy.com/v1/places/gameicons?${placeQuery}&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false`,
        {}, 3000
      );

      if (iconRes.ok) {
        const icons = await iconRes.json();
        iconMap = new Map(
          icons.data.map((item) => [String(item.targetId), item.imageUrl])
        );
      }
    } catch (err) {
      console.error("Erro ao buscar ícones dos jogos:", err.message);
    }

    // 3b) Fallback: place details by placeId for name/visits
    let placeDetailsMap = new Map();
    try {
      const pdRes = await fetchWithTimeout(
        `https://games.roproxy.com/v1/games/multiget-place-details?${placeQuery}`,
        {}, 4000
      );
      if (pdRes.ok) {
        const pdJson = await pdRes.json();
        const list = Array.isArray(pdJson) ? pdJson : (Array.isArray(pdJson?.data) ? pdJson.data : []);
        list.forEach((pd) => { if (pd && pd.placeId != null) placeDetailsMap.set(String(pd.placeId), pd); });
      }
    } catch (err) {
      console.error("Erro ao buscar place details:", err.message);
    }

    let detailsMap = new Map();
    if (detailsRes.ok) {
      try {
        const detailsJson = await detailsRes.json();
        detailsJson.data.forEach((g) => {
          detailsMap.set(String(g.id), g);
        });
      } catch (err) {
        console.error("Erro ao processar detalhes dos jogos:", err.message);
      }
    }

    // 4) Montar resposta na ordem de PLACE_IDS
    const games = PLACE_IDS.map((placeId) => {
      const uni = universes.find((u) => String(u.placeId) === String(placeId));
      const icon = iconMap.get(String(placeId)) ?? null;
      const d = uni?.universeId ? detailsMap.get(String(uni.universeId)) : null;
      const pd = placeDetailsMap.get(String(placeId));
      return {
        name: d?.name ?? pd?.name ?? "Unknown",
        visits: (typeof d?.visits === 'number' ? d.visits : (typeof pd?.placeVisits === 'number' ? pd.placeVisits : 0)),
        icon,
        link: `https://www.roblox.com/games/${placeId}`,
      };
    });

    // Atualizar cache apenas se tivermos dados válidos
    const isValid = (g) => Boolean(g.name && g.name !== "Unknown") && Number(g.visits || 0) >= 0;
    const hasValidData = games.some(isValid);
    const allValid = games.every(isValid);
    if (hasValidData) {
      gamesCache = games;
      cacheTimestamp = Date.now();
      saveGamesCacheToDisk(gamesCache);
    }

    res.status(200).json({ games, fromCache: false, complete: allValid });
  } catch (error) {
    console.error("Erro ao buscar dados do Roblox:", error.message);
    
    // Se temos um cache, mesmo que expirado, usamos como fallback
    if (gamesCache) {
      const cacheAllValid = gamesCache.every(g => g && g.name && g.name !== "Desconhecido" && Number(g.visits || 0) > 0);
      return res.status(200).json({ 
        games: gamesCache, 
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cacheTimestamp) / 1000) + "s",
        complete: cacheAllValid
      });
    }
    
    res.status(502).json({ error: "Roblox não respondeu no momento" });
  }
});

// Visitor counter endpoint
app.post("/api/visitor-count", (req, res) => {
  let visitorCount = 0;
  
  // Try to read existing count from file
  try {
    if (fs.existsSync(VISITOR_COUNT_FILE)) {
      const data = fs.readFileSync(VISITOR_COUNT_FILE, 'utf8');
      const json = JSON.parse(data);
      visitorCount = parseInt(json.count || 0);
    }
  } catch (error) {
    console.error('Error reading visitor count:', error);
  }
  
  // Increment count if client sends a new count that's higher
  const clientCount = parseInt(req.body.count || 0);
  if (clientCount > visitorCount) {
    visitorCount = clientCount;
  } else {
    visitorCount++; // Increment server count
  }
  
  // Save updated count
  try {
    fs.writeFileSync(VISITOR_COUNT_FILE, JSON.stringify({ count: visitorCount, updated: Date.now() }));
  } catch (error) {
    console.error('Error saving visitor count:', error);
  }
  
  res.json({ count: visitorCount });
});

app.get("/api/visitor-count", (req, res) => {
  let visitorCount = 0;
  
  // Try to read existing count from file
  try {
    if (fs.existsSync(VISITOR_COUNT_FILE)) {
      const data = fs.readFileSync(VISITOR_COUNT_FILE, 'utf8');
      const json = JSON.parse(data);
      visitorCount = parseInt(json.count || 0);
    }
  } catch (error) {
    console.error('Error reading visitor count:', error);
  }
  
  res.json({ count: visitorCount });
});

app.get("/api/audio/info", async (req, res) => {
  const id = extractReqVideoId(req);
  try {
    if (!id) throw new Error('Invalid');
    const info = await ytdl.getInfo(buildWatchUrlFromId(id));
    const v = info.videoDetails;
    const thumb = v.thumbnails?.[v.thumbnails.length - 1]?.url || null;
    return res.json({ title: v.title, lengthSeconds: Number(v.lengthSeconds || 0), thumbnail: thumb });
  } catch (err) {
    try {
      if (!id) return res.status(400).json({ error: 'Invalid YouTube URL' });
      let last;
      // Try Piped meta
      for (const host of PIPED_HOSTS) {
        const metaRes = await fetch(`${host}/api/v1/video/${id}`, { headers: { 'accept': 'application/json' }, timeout: 8000 });
        if (!metaRes.ok) { last = new Error(`Piped meta unavailable @ ${host}`); continue; }
        let meta;
        try { meta = await metaRes.json(); } catch { last = new Error(`Invalid meta JSON @ ${host}`); continue; }
        const thumb = (meta.thumbnailUrl) || (meta.thumbnail) || null;
        return res.json({ title: meta.title, lengthSeconds: Number(meta.duration || 0), thumbnail: thumb });
      }
      // Try Invidious meta
      for (const host of INV_HOSTS) {
        const metaRes = await fetch(`${host}/api/v1/videos/${id}`, { headers: { 'accept': 'application/json' }, timeout: 8000 });
        if (!metaRes.ok) { last = new Error(`Invidious meta unavailable @ ${host}`); continue; }
        let meta;
        try { meta = await metaRes.json(); } catch { last = new Error(`Invalid Invidious meta JSON @ ${host}`); continue; }
        const thumb = (meta.videoThumbnails && meta.videoThumbnails[meta.videoThumbnails.length - 1]?.url) || null;
        return res.json({ title: meta.title, lengthSeconds: Number(meta.lengthSeconds || 0), thumbnail: thumb });
      }
      throw last || new Error('All meta providers failed');
    } catch (e2) {
      console.error("Audio info fallback error:", e2.message);
      return res.status(500).json({ error: "Audio info failed" });
    }
  }
});

// Helpers
function getVideoId(u) {
  try { return ytdl.getURLVideoID(u); } catch {}
  try { return new URL(u).searchParams.get('v'); } catch {}
  return null;
}

function extractReqVideoId(req) {
  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  let id = null;
  if (raw) id = getVideoId(String(raw));
  if (!id && typeof req.query.v === 'string') id = String(req.query.v);
  return id;
}

function buildWatchUrlFromId(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

const PIPED_HOSTS = [
  'https://pipedapi.kavin.rocks',
  'https://piped.video',
  'https://pipedapi.syncpundit.io',
  'https://piped.projectsegfau.lt'
];

const INV_HOSTS = [
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.jing.rocks',
  'https://vid.puffyan.us'
];

async function streamFromPiped(req, res, url) {
  const id = getVideoId(url);
  if (!id) return res.status(400).json({ error: 'Invalid YouTube URL' });
  let lastErr;
  for (const host of PIPED_HOSTS) {
    try {
      const streamsRes = await fetch(`${host}/api/v1/streams/${id}`, {
        headers: { 'accept': 'application/json' },
        timeout: 8000,
      });
      if (!streamsRes.ok) throw new Error(`Piped streams unavailable @ ${host}`);
      let data;
      try { data = await streamsRes.json(); } catch { throw new Error(`Invalid JSON from ${host}`); }
      const streams = (data.audioStreams || []);
      const aud = streams.find(s => /audio\/mp4/i.test(s.mimeType || s.type || ''))
        || streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!aud?.url) throw new Error('No audio stream');
      const headers = {};
      if (req.headers['range']) headers['range'] = req.headers['range'];
      const upstream = await fetch(aud.url, { headers, timeout: 12000 });
      res.status(upstream.status);
      upstream.headers.forEach((v, k) => {
        if (['content-type','content-length','accept-ranges','content-range'].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      });
      upstream.body.pipe(res);
      return;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('All Piped hosts failed');
}

async function streamFromInvidious(req, res, url) {
  const id = getVideoId(url);
  if (!id) return res.status(400).json({ error: 'Invalid YouTube URL' });
  let lastErr;
  for (const host of INV_HOSTS) {
    try {
      const streamUrl = `${host}/latest_version?id=${id}&itag=140`;
      const headers = {};
      if (req.headers['range']) headers['range'] = req.headers['range'];
      const upstream = await fetch(streamUrl, { headers, timeout: 12000 });
      if (!upstream.ok && upstream.status !== 206) throw new Error(`Invidious stream unavailable @ ${host}`);
      res.status(upstream.status);
      upstream.headers.forEach((v, k) => {
        if (['content-type','content-length','accept-ranges','content-range'].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      });
      // Default to audio/mp4 if content-type missing
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'audio/mp4');
      upstream.body.pipe(res);
      return;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('All Invidious hosts failed');
}

// Lightweight YouTube audio proxy with fallback to Piped instance
app.get("/api/audio", async (req, res) => {
  const id = extractReqVideoId(req);
  const url = id ? buildWatchUrlFromId(id) : String(req.query.url || "");
  const t = Number(req.query.t || 0);
  try {
    if (!id) throw new Error('Invalid URL for ytdl');
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    const ct = format.mimeType?.split(";")?.[0] || "audio/webm";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-cache");
    const ytdlOpts = { filter: "audioonly", quality: "highestaudio", highWaterMark: 1 << 25 };
    if (!Number.isNaN(t) && t > 0) ytdlOpts.begin = `${Math.floor(t)}s`;
    return ytdl(url, ytdlOpts)
      .on("error", async (e) => {
        console.error("YTDL error -> falling back to Piped:", e.message);
        if (!res.headersSent) {
          try { await streamFromPiped(req, res, url); }
          catch (e2) {
            console.error('Piped failed, trying Invidious:', e2.message);
            try { await streamFromInvidious(req, res, url); }
            catch (e3) { console.error(e3.message); if (!res.headersSent) res.status(502).end(); }
          }
        }
      })
      .pipe(res);
  } catch (err) {
    console.error("Audio proxy primary failed, trying Piped:", err.message);
    try { await streamFromPiped(req, res, url); }
    catch (e2) {
      console.error('Piped failed, trying Invidious:', e2.message);
      try { await streamFromInvidious(req, res, url); }
      catch (e3) { console.error(e3.message); res.status(500).json({ error: "Audio proxy failed" }); }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Portfolio rodando em http://localhost:${PORT}`);
});
