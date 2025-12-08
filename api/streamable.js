const fetch = require("node-fetch");

// Função para buscar dados com timeout
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
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

  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do Streamable é obrigatória' });
  }

  // Validar formato do URL do Streamable
  const streamableMatch = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
  if (!streamableMatch) {
    return res.status(400).json({ error: 'URL inválida do Streamable' });
  }

  const videoId = streamableMatch[1];
  const streamableUrl = `https://streamable.com/${videoId}`;

  try {
    const response = await fetchWithTimeout(streamableUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, 10000);

    if (!response.ok) {
      throw new Error(`Streamable retornou status ${response.status}`);
    }

    const html = await response.text();

    // Extrair URL do vídeo das meta tags og:video
    const ogVideoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:video["']/i);
    
    if (ogVideoMatch && ogVideoMatch[1]) {
      return res.json({ 
        mp4: ogVideoMatch[1],
        id: videoId,
        source: streamableUrl
      });
    }

    // Fallback: tentar extrair do og:video:url
    const ogVideoUrlMatch = html.match(/<meta\s+property=["']og:video:url["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:video:url["']/i);
    
    if (ogVideoUrlMatch && ogVideoUrlMatch[1]) {
      return res.json({ 
        mp4: ogVideoUrlMatch[1],
        id: videoId,
        source: streamableUrl
      });
    }

    // Fallback: tentar extrair do og:video:secure_url
    const ogSecureMatch = html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:video:secure_url["']/i);
    
    if (ogSecureMatch && ogSecureMatch[1]) {
      return res.json({ 
        mp4: ogSecureMatch[1],
        id: videoId,
        source: streamableUrl
      });
    }

    return res.status(404).json({ error: 'Não foi possível extrair o link do vídeo' });
  } catch (error) {
    console.error('Streamable extraction error:', error.message);
    return res.status(500).json({ error: 'Erro ao extrair vídeo do Streamable' });
  }
};
