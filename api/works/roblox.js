const fs = require("fs");
const path = require("path");

const ROBLOX_WORKS_ROOT = path.join(process.cwd(), "assets", "works", "roblox");
const ROBLOX_WORKS_INDEX = path.join(ROBLOX_WORKS_ROOT, "works.json");
const ROBLOX_WORKS_ALT_INDEX = path.join(process.cwd(), "assets", "works", "works.json");

function loadRobloxWorksFromIndex() {
  try {
    const sourcePath = fs.existsSync(ROBLOX_WORKS_INDEX)
      ? ROBLOX_WORKS_INDEX
      : fs.existsSync(ROBLOX_WORKS_ALT_INDEX)
      ? ROBLOX_WORKS_ALT_INDEX
      : null;
    if (!sourcePath) return [];
    const raw = fs.readFileSync(sourcePath, "utf-8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.works)) return [];
    const works = data.works.map((entry) => normalizeWorkEntry(entry)).filter(Boolean);
    return works;
  } catch (error) {
    console.error("Works json error:", error.message);
    return [];
  }
}

function normalizeWorkEntry(entry = {}) {
  const name =
    typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
  if (!name) return null;
  let video = entry.video || entry.file;
  if (!video || typeof video !== "string") {
    video = findVideoByFolderName(name);
    if (!video) return null;
  } else {
    video = video.trim();
    if (!/^https?:/i.test(video) && !video.startsWith("/assets/")) {
      const segments = video
        .split(/[\/]/)
        .filter(Boolean)
        .map((segment) => {
          try {
            return encodeURIComponent(decodeURIComponent(segment));
          } catch {
            return encodeURIComponent(segment);
          }
        });
      video = `/assets/works/roblox/${segments.join("/")}`;
    }
  }
  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .filter((tag) => typeof tag === "string" && tag.trim())
        .map((tag) => tag.trim())
    : [];
  return { name, video, tags };
}

function findVideoByFolderName(name) {
  try {
    const folder = path.join(ROBLOX_WORKS_ROOT, name);
    const files = fs.readdirSync(folder);
    const video = files.find((f) => /\.(mp4|webm|mov|m4v)$/i.test(f));
    if (!video) return null;
    const segments = [name, video].map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    });
    return `/assets/works/roblox/${segments.join("/")}`;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const jsonWorks = loadRobloxWorksFromIndex();
    let works = jsonWorks;
    
    if (!works.length && fs.existsSync(ROBLOX_WORKS_ROOT)) {
      const dirs = fs
        .readdirSync(ROBLOX_WORKS_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory());
      works = dirs
        .map((dirEnt) => {
          const dirPath = path.join(ROBLOX_WORKS_ROOT, dirEnt.name);
          let files = [];
          try {
            files = fs.readdirSync(dirPath);
          } catch {}
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
    
    res.status(200).json({ works });
  } catch (error) {
    console.error("Works scan error:", error.message);
    res.status(200).json({ works: [] });
  }
};
