const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const QRCode = require("qrcode");
const FormData = require("form-data");
const multer = require("multer");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = "@Saxxxx4You";
let activityLogs = [];
const MAX_LOG = 30;

// ======================
// LOGGER & MIDDLEWARE
// ======================
function addLog(statusCode, method, originalUrl, ip, queryParams = {}) {
  let cleanQuery = { ...queryParams };
  if (cleanQuery.apikey) cleanQuery.apikey = "[HIDDEN]";
  const log = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString('id-ID'),
    status: statusCode,
    method: method,
    path: originalUrl.split('?')[0],
    query: cleanQuery,
    ip: ip
  };
  activityLogs.unshift(log);
  if (activityLogs.length > MAX_LOG) activityLogs.pop();
}

function checkApiKey(req, res, next) {
  if (req.path === '/' || req.path === '/api/activity') return next();
  const apiKey = req.query.apikey || req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    addLog(401, req.method, req.originalUrl, ip, req.query);
    return res.status(401).json({ status: false, error: "Invalid API Key" });
  }
  next();
}

app.use(checkApiKey);
app.use((req, res, next) => {
  if (req.path === '/api/activity' || req.path === '/') return next();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  res.on('finish', () => addLog(res.statusCode, req.method, req.originalUrl, ip, req.query));
  next();
});

// ======================
// API ENDPOINTS
// ======================

// 1. TikTok Downloader
app.get("/api/tiktok", async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).json({
        status: false,
        creator: "t.me/@Saxxxx4You",
        message: "Masukkan URL TikTok. Contoh: /api/tiktok?apikey=@Saxxxx4You&url=https://vt.tiktok.com/xxx"
      });
    }

    const getSession = await axios.get("https://tiktokio.com/");
    const cookies = getSession.headers["set-cookie"] ? getSession.headers["set-cookie"].join("; ") : "";

    const response = await axios.post(
      "https://tiktokio.com/api/v1/tk/html",
      {
        vid: videoUrl,
        prefix: "tiktokio.com",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies,
          Origin: "https://tiktokio.com",
          Referer: "https://tiktokio.com/",
          "User-Agent": "Mozilla/5.0"
        },
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    const results = {
      status: true,
      creator: "t.me/@Saxxxx4You",
      result: {
        title: $(".video-info h3").text().trim(),
        thumbnail: $(".video-info img").attr("src"),
        links: [],
      },
    };

    $(".download-links a").each((i, el) => {
      const link = $(el).attr("href");
      const type = $(el).text().trim();
      if (link) {
        results.result.links.push({ type, link });
      }
    });

    res.json(results);
  } catch (e) {
    res.status(500).json({
      status: false,
      creator: "t.me/@Saxxxx4You",
      error: e.message
    });
  }
});

// 2. Unlimited AI (Reasoning)
app.get("/api/unli-ai", async (req, res) => {
    try {
      const prompt = req.query.prompt;
      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Prompt tidak boleh kosong"
        });
      }

      const { wrapper } = require("axios-cookiejar-support");
      const { CookieJar } = require("tough-cookie");

      const jar = new CookieJar();
      const client = wrapper(axios.create({ jar }));

      const response = await client.post(
        "https://app.unlimitedai.chat/api/chat",
        {
          chatId: `f4901baf-${Math.random().toString(36).substring(2, 10)}`,
          deviceId: "139cfbf9-3ae2-4855-abbc-9b6394688aa4",
          locale: "id",
          messages: [
            {
              id: Math.random().toString(36).substring(2, 10),
              content: prompt,
              role: "user",
              createdAt: new Date().toISOString()
            }
          ],
          selectedChatModel: "chat-model-reasoning"
        },
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome Mobile Safari",
            Accept: "*/*",
            "Content-Type": "application/json",
            Referer: "https://app.unlimitedai.chat/chat/id",
            Origin: "https://app.unlimitedai.chat"
          },
          responseType: "text",
          timeout: 60000
        }
      );

      let fullText = "";

      for (let line of response.data.split("\n")) {

        line = line.trim();

        if (!line || line.startsWith(":")) continue;

        if (line.startsWith("data: ")) {
          line = line.slice(6);
        }

        try {
          const parsed = JSON.parse(line);

          if (parsed.type === "delta" && parsed.delta) {
            fullText += parsed.delta;
          }

          else if (parsed.choices?.[0]?.delta?.content) {
            fullText += parsed.choices[0].delta.content;
          }

          else if (parsed.content) {
            fullText += parsed.content;
          }

        } catch (e) {}

      }

      res.json({
        status: true,
        creator: "t.me/@Saxxxx4You",
        result: fullText.trim()
      });

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      });

    }

  });


// 3. Pinterest
app.get("/api/pinterest", async (req, res) => {

  try {

    const { apikey, q } = req.query;

    if (!apikey || !API_KEY.includes(apikey)) {
      return res.json({
        status: false,
        message: "Invalid API Key"
      });
    }

    if (!q) {
      return res.json({
        status: false,
        message: "query required"
      });
    }

    const { data } = await axios.get(
      `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(q)}&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(q)}%22%2C%22scope%22%3A%22pins%22%7D%2C%22context%22%3A%7B%7D%7D`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const result = data.resource_response.data.results
      .filter(v => v.images?.orig?.url)
      .map(v => v.images.orig.url);

    res.json({
      status: true,
      result: result.slice(0, 10)
    });

  } catch (e) {

    res.json({
      status: false,
      error: e.message
    });

  }

});

// 4. QR Generator
app.get("/api/qr", async (req, res) => {
  try {
    const qr = await QRCode.toDataURL(req.query.text || "Bayy");
    res.json({ status: true, result: qr });
  } catch (e) { res.json({ status: false, error: e.message }); }
});

// 5. Catbox Uploader
app.post("/api/catbox", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: false, message: "File required" });
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", req.file.buffer, req.file.originalname);
    const { data } = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders() });
    res.json({ status: true, result: data });
  } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

// 6. SSWeb & 7. Chord Gitar & 8. RemoveBG (Simpel)
app.get("/api/ssweb", (req, res) => res.json({ status: true, result: `https://image.thum.io/get/width/1200/${req.query.url}` }));

app.get("/api/removebg", async (req, res) => {
  try {
    const { apikey, url } = req.query;
    if (!apikey || !API_KEY.includes(apikey)) {
      return res.json({
        status: false,
        message: "Invalid API Key"
      });
    }

    if (!url) {
      return res.json({
        status: false,
        message: "url required"
      });
    }

    const domain =
      req.protocol + "://" + req.get("host");

    const response = await axios.get(
      `${domain}/api/tools/removebg`,
      {
        params: { url },
        responseType: "arraybuffer"
      }
    );

    res.set("Content-Type", "image/png");
    res.send(Buffer.from(response.data));
  } catch (e) {
    res.json({
      status: false,
      error: e.message
    });
  }
});

app.get("/api/chord", async (req, res) => {
  try {
    const { data } = await axios.get(`https://www.gitaretab.com/index.php?s=${encodeURIComponent(req.query.q)}`);
    const link = cheerio.load(data)("a.title").first().attr("href");
    const { data: c } = await axios.get(link);
    res.json({ status: true, result: cheerio.load(c)("pre").text().trim() });
  } catch (e) { res.json({ status: false, error: "Not found" }); }
});

app.get("/api/activity", (req, res) => res.json({ status: true, logs: activityLogs }));

// ======================
// UI DASHBOARD
// ======================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>BAYY API PORTAL</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root { --bg: #050507; --panel: #0d0d12; --primary: #00f2ff; --accent: #7000ff; --text: #ffffff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; }
    nav { height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 5%; border-bottom: 1px solid #1a1a22; position: sticky; top: 0; background: rgba(5,5,7,0.8); backdrop-filter: blur(10px); z-index: 100; }
    .nav-links { display: flex; gap: 25px; }
    .nav-item { cursor: pointer; font-weight: 700; font-size: 0.8rem; color: #4b5563; transition: 0.3s; }
    .nav-item.active { color: var(--primary); text-shadow: 0 0 10px var(--primary); }
    .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
    .page { display: none; } .page.active { display: block; animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
    .endpoint-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .api-card { background: var(--panel); border: 1px solid #1a1a22; border-radius: 15px; padding: 20px; transition: 0.3s; }
    .api-card:hover { border-color: var(--primary); transform: translateY(-5px); }
    .url-box { background: #000; padding: 10px; border-radius: 8px; font-family: 'JetBrains Mono'; font-size: 10px; color: var(--primary); margin: 15px 0; border: 1px dashed #333; display: flex; justify-content: space-between; cursor: pointer; }
    .btn { background: linear-gradient(90deg, var(--primary), var(--accent)); color: #000; border: none; padding: 10px; width: 100%; border-radius: 8px; font-weight: 800; cursor: pointer; }
    .terminal { background: #000; border-radius: 12px; height: 500px; overflow-y: auto; padding: 20px; font-family: 'JetBrains Mono'; font-size: 12px; border: 1px solid #1a1a22; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-content { background: var(--panel); width: 100%; max-width: 500px; padding: 30px; border-radius: 20px; border: 1px solid var(--primary); }
    input { width: 100%; background: #000; border: 1px solid #333; padding: 12px; border-radius: 8px; color: white; margin: 10px 0; }
    .res-box { background: #000; padding: 15px; border-radius: 10px; height: 200px; overflow: auto; font-family: 'JetBrains Mono'; font-size: 11px; color: #00ff00; border: 1px solid #111; }
  </style>
</head>
<body>
  <nav>
    <div style="font-weight:800; font-size: 1.2rem; color:var(--primary)">BAYY<span style="color:white">API</span></div>
    <div class="nav-links">
      <div class="nav-item active" onclick="switchPage('console', this)">CONSOLE</div>
      <div class="nav-item" onclick="switchPage('endpoints', this)">ENDPOINTS</div>
    </div>
  </nav>

  <div class="container">
    <div id="console" class="page active">
      <div class="terminal" id="logBody">> System encrypted... Online.</div>
    </div>
    <div id="endpoints" class="page">
      <div class="endpoint-grid" id="grid"></div>
    </div>
  </div>

  <div class="modal" id="modal">
    <div class="modal-content">
      <h3 id="m-title">Test API</h3>
      <div id="m-input-area"></div>
      <button class="btn" id="btnRun">RUN TEST</button>
      <div style="margin-top:15px; font-size:10px; color:#555">OUTPUT:</div>
      <div class="res-box"><pre id="m-res">Ready...</pre></div>
      <button onclick="closeModal()" style="margin-top:15px; background:none; border:none; color:#555; width:100%; cursor:pointer;">[ CLOSE ]</button>
    </div>
  </div>

  <script>
    const API_KEY = "@Saxxxx4You";
    const domain = window.location.origin;
    const apis = [
      { name: "TikTok DL", path: "/api/tiktok", param: "url", ph: "https://vt.tiktok..." },
      { name: "Unlimited AI", path: "/api/unli-ai", param: "prompt", ph: "Halo Bayy" },
      { name: "Pinterest", path: "/api/pinterest", param: "q", ph: "kucing lucu" },
      { name: "QR Maker", path: "/api/qr", param: "text", ph: "halo" },
      { name: "SS Website", path: "/api/ssweb", param: "url", ph: "google.com" },
      { name: "Chord Gitar", path: "/api/chord", param: "q", ph: "surat cinta" },
      { name: "RemoveBg", path: "/api/removebg", param: "url", ph: "url image" }
    ];

    function switchPage(id, el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      el.classList.add('active');
    }

    const grid = document.getElementById('grid');
    grid.innerHTML = apis.map(a => \`
      <div class="api-card">
        <h4>\${a.name}</h4>
        <div class="url-box" onclick="copy('\${domain}\${a.path}?apikey=\${API_KEY}&\${a.param}=')">
          <span>\${a.path}</span> <i class="far fa-copy"></i>
        </div>
        <button class="btn" onclick='openTest(\${JSON.stringify(a)})'>TRY API</button>
      </div>
    \`).join('');

    let currentApi = null;
    function openTest(api) {
      currentApi = api;
      document.getElementById('modal').style.display = 'flex';
      document.getElementById('m-title').innerText = api.name;
      document.getElementById('m-res').innerText = "Ready...";
      document.getElementById('m-input-area').innerHTML = \`<input id="val" placeholder="\${api.ph}">\`;
    }

    function closeModal() { document.getElementById('modal').style.display = 'none'; }

    document.getElementById('btnRun').onclick = async () => {
      const resBox = document.getElementById('m-res');
      const val = document.getElementById('val').value;
      resBox.innerText = "Processing...";
      try {
        const res = await fetch(\`\${currentApi.path}?apikey=\${API_KEY}&\${currentApi.param}=\${encodeURIComponent(val)}\`);
        const data = await res.json();
        resBox.innerText = JSON.stringify(data, null, 2);
      } catch (e) { resBox.innerText = "Error: " + e.message; }
    }

    async function fetchLogs() {
      const res = await fetch('/api/activity');
      const data = await res.json();
      document.getElementById('logBody').innerHTML = data.logs.map(l => \`
        <div style="margin-bottom:5px"><span style="color:#444">[\${l.timestamp}]</span> <span style="color:var(--primary)">\${l.method}</span> \${l.path}</div>
      \`).join('');
    }
    setInterval(fetchLogs, 3000);
    function copy(t) { navigator.clipboard.writeText(t); alert("URL Copied!"); }
  </script>
</body>
</html>
  `);
});

// ... kode API kamu di atas ...

// ======================
// VERCEL CONFIGURATION
// ======================

// Hapus atau komentari app.listen() yang lama
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 System Online`));
