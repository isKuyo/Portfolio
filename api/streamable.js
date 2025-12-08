const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

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
};
