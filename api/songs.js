const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const SONGS_ROOT = path.join(process.cwd(), "assets", "songs");
    
    // Check if directory exists
    if (!fs.existsSync(SONGS_ROOT)) {
      return res.status(200).json({ tracks: [] });
    }

    const dirs = fs
      .readdirSync(SONGS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const tracks = dirs
      .map((d) => {
        const dir = path.join(SONGS_ROOT, d.name);
        let files = [];
        try {
          files = fs.readdirSync(dir);
        } catch {}
        const audio = files.find((f) => /\.(mp3|m4a|webm|ogg)$/i.test(f));
        const icon = files.find((f) => /^icon\.(png|jpg|jpeg|webp)$/i.test(f));
        if (!audio) return null;
        const encName = encodeURIComponent(d.name);
        const encAudio = encodeURIComponent(audio);
        const iconUrl = icon
          ? `/assets/songs/${encName}/${encodeURIComponent(icon)}`
          : null;
        return {
          title: d.name,
          audio: `/assets/songs/${encName}/${encAudio}`,
          icon: iconUrl,
        };
      })
      .filter(Boolean);

    res.status(200).json({ tracks });
  } catch (e) {
    console.error("Songs scan error:", e.message);
    res.status(200).json({ tracks: [] });
  }
};
