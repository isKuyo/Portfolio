const fetch = require("node-fetch");

const PLACE_IDS = ["7991339063", "9054723407", "13689905003", "13603968116"];

// Cache de dados para reduzir chamadas à API
let gamesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos

// Cache persistente para dados parciais (para evitar "Desconhecido" quando temos dados anteriores)
let persistentCache = {};

// Função para verificar se o cache é válido
const isCacheValid = () => {
  return gamesCache && (Date.now() - cacheTimestamp < CACHE_TTL);
};

// Função para verificar se os dados são válidos
const isValidGameData = (game) => {
  return Boolean(game && game.name && game.name !== "Unknown") && Number(game.visits || 0) >= 0;
};

// Função para buscar dados com timeout
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  // Verificar se devemos forçar uma atualização do cache
  const forceRefresh = req.query.refresh === "true";
  
  // Retornar dados do cache se estiver válido e não for forçada atualização
  if (isCacheValid() && !forceRefresh) {
    return res.status(200).json({ games: gamesCache, fromCache: true });
  }

  try {
    // 1) Map placeId -> universeId via roproxy
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

    // 2) Game details by universeId (visits, name)
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

    // 3) Icons by placeId
    let iconMap = new Map();
    try {
      const placeQuery = PLACE_IDS.map((id) => `placeIds=${id}`).join("&");
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

    // 3b) Fallback: detalhes por placeId (nome/visits) para melhorar cold-start
    let placeDetailsMap = new Map();
    try {
      const placeQuery = PLACE_IDS.map((id) => `placeIds=${id}`).join("&");
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

    // 4) Build response in PLACE_IDS order
    const games = PLACE_IDS.map((placeId) => {
      const uni = universes.find((u) => String(u.placeId) === String(placeId));
      const icon = iconMap.get(String(placeId)) ?? null;
      const d = uni?.universeId ? detailsMap.get(String(uni.universeId)) : null;
      const pd = placeDetailsMap.get(String(placeId));
      
      // Dados atuais da API
      const currentData = {
        name: d?.name ?? pd?.name ?? "Unknown",
        visits: (typeof d?.visits === 'number' ? d.visits : (typeof pd?.visits === 'number' ? pd.visits : 0)),
        icon: icon || (persistentCache[placeId]?.icon || null),
        link: `https://www.roblox.com/games/${placeId}`,
      };
      
      // Verificar se temos dados válidos no cache persistente
      const cachedData = persistentCache[placeId];
      
      // Se os dados atuais não são válidos mas temos dados no cache persistente
      if (!isValidGameData(currentData) && isValidGameData(cachedData)) {
        return {
          name: cachedData.name,
          visits: cachedData.visits,
          icon: icon || cachedData.icon,
          link: currentData.link,
          fromPersistentCache: true
        };
      }
      
      // Se os dados atuais são válidos, atualizar o cache persistente
      if (isValidGameData(currentData)) {
        persistentCache[placeId] = { ...currentData };
      }
      
      return currentData;
    });

    // Atualizar cache apenas se tivermos dados válidos
    const hasValidData = games.some(g => isValidGameData(g));
    if (hasValidData) {
      gamesCache = games;
      cacheTimestamp = Date.now();
    }

    // Verificar se todos os jogos têm dados válidos
    const allValid = games.every(g => isValidGameData(g));
    
    res.status(200).json({ 
      games, 
      fromCache: false,
      complete: allValid
    });
  } catch (error) {
    console.error("Erro ao buscar dados do Roblox:", error.message);
    
    // Se temos um cache, mesmo que expirado, usamos como fallback
    if (gamesCache) {
      return res.status(200).json({ 
        games: gamesCache, 
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cacheTimestamp) / 1000) + "s"
      });
    }
    
    // Se não temos cache mas temos dados persistentes
    if (Object.keys(persistentCache).length > 0) {
      const persistentGames = PLACE_IDS.map(placeId => {
        return persistentCache[placeId] || {
          name: "Desconhecido",
          visits: 0,
          icon: null,
          link: `https://www.roblox.com/games/${placeId}`
        };
      });
      
      return res.status(200).json({
        games: persistentGames,
        fromCache: true,
        fromPersistentCache: true
      });
    }
    
    res.status(502).json({ error: "Roblox não respondeu no momento" });
  }
};
