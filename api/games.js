const fetch = require("node-fetch");

const PLACE_IDS = ["7991339063", "9054723407", "13689905003", "13603968116"];

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1) Map placeId -> universeId via roproxy
    const universes = await Promise.all(
      PLACE_IDS.map(async (placeId) => {
        const r = await fetch(
          `https://apis.roproxy.com/universes/v1/places/${placeId}/universe`
        );
        if (!r.ok) return { placeId, universeId: null };
        const j = await r.json();
        return { placeId, universeId: j.universeId ?? null };
      })
    );

    const validUniverses = universes.filter((u) => u.universeId);
    const universeIdsCsv = validUniverses.map((u) => u.universeId).join(",");

    // 2) Game details by universeId (visits, name)
    const detailsRes = universeIdsCsv
      ? await fetch(
          `https://games.roproxy.com/v1/games?universeIds=${universeIdsCsv}`
        )
      : { ok: false };

    // 3) Icons by placeId
    const placeQuery = PLACE_IDS.map((id) => `placeIds=${id}`).join("&");
    const iconRes = await fetch(
      `https://thumbnails.roproxy.com/v1/places/gameicons?${placeQuery}&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false`
    );

    if (!iconRes.ok) throw new Error("Icon API failure");

    const icons = await iconRes.json();
    const iconMap = new Map(
      icons.data.map((item) => [String(item.targetId), item.imageUrl])
    );

    let detailsMap = new Map();
    if (detailsRes.ok) {
      const detailsJson = await detailsRes.json();
      detailsJson.data.forEach((g) => {
        detailsMap.set(String(g.id), g);
      });
    }

    // 4) Build response in PLACE_IDS order
    const games = PLACE_IDS.map((placeId) => {
      const uni = universes.find((u) => String(u.placeId) === String(placeId));
      const icon = iconMap.get(String(placeId)) ?? null;
      const d = uni?.universeId ? detailsMap.get(String(uni.universeId)) : null;
      return {
        name: d?.name ?? "Desconhecido",
        visits: d?.visits ?? 0,
        icon,
        link: `https://www.roblox.com/games/${placeId}`,
      };
    });

    res.status(200).json({ games });
  } catch (error) {
    console.error("Erro ao buscar dados do Roblox:", error.message);
    res.status(502).json({ error: "Roblox não respondeu no momento" });
  }
};
