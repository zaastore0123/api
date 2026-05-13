const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const QRCode = require("qrcode");
const path = require("path");
const FormData = require("form-data");
const multer = require("multer");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = "@Saxxxx4You";
const API_KEY_ENABLED = true;
const upload = multer({ storage: multer.memoryStorage() });

let activityLogs = [];
const MAX_LOG = 30;

function addLog(statusCode, method, originalUrl, ip, queryParams = {}) {
  let cleanUrl = originalUrl;
  let cleanQuery = { ...queryParams };
  
  if (API_KEY_ENABLED && cleanQuery.apikey) {
    cleanQuery.apikey = "[HIDDEN]";
    cleanUrl = originalUrl.replace(/([?&])apikey=[^&]+/, '$1apikey=[HIDDEN]');
  }
  
  const log = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString('id-ID'),
    status: statusCode,
    method: method,
    path: originalUrl.split('?')[0],
    query: cleanQuery,
    url: cleanUrl,
    ip: ip
  };
  
  activityLogs.unshift(log);
  if (activityLogs.length > MAX_LOG) activityLogs.pop();
  
  if (!originalUrl.startsWith('/api/activity') && originalUrl !== '/') {
    console.log(`
━━━━━━━━━━━━━━━━━━
🚀 API REQUEST
━━━━━━━━━━━━━━━━━━
🌍 IP     : ${ip}
📍 Path   : ${cleanUrl}
⚡ Method : ${method}
📊 Status : ${statusCode}
━━━━━━━━━━━━━━━━━━
    `);
  }
  
  return log;
}

// ======================
// MIDDLEWARE API KEY CHECK (WAJIB)
// ======================
function checkApiKey(req, res, next) {
  if (req.path === '/' || req.path === '/api/activity') {
    return next();
  }
  
  const apiKey = req.query.apikey || req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    addLog(401, req.method, req.originalUrl, ip, req.query);
    return res.status(401).json({
      status: false,
      error: "Invalid or missing API Key",
      message: "Silakan sertakan apikey=@Saxxxx4You"
    });
  }
  
  next();
}

app.use(checkApiKey);

// ======================
// LOGGER MIDDLEWARE
// ======================
app.use((req, res, next) => {
  if (req.path === '/api/activity' || req.path === '/') {
    return next();
  }
  
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  
  res.on('finish', () => {
    const status = res.statusCode;
    addLog(status, req.method, req.originalUrl, ip, req.query);
  });
  
  next();
});

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

      const response = await axios.get(
        "http://localhost:3000/api/tools/removebg",
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

app.get("/api/qr", async (req, res) => {
    try {
      const apikey = req.query.apikey;
      const text = req.query.text;
      if (!apikey || !API_KEY.includes(apikey)) {
        return res.json({
          status: false,
          message: "Invalid API Key"
        });
      }
      if (!text) {
        return res.json({
          status: false,
          message: "text required"
        });
      }
      const qr = await QRCode.toDataURL(text);
      res.json({
        status: true,
        result: qr
      });
    } catch (e) {
      res.json({
        status: false,
        error: e.message
      });
    }
  });

app.post("/api/catbox", upload.single("file"), async (req, res) => {
    try {
      const apikey = req.query.apikey;
      if (!apikey || !API_KEY.includes(apikey)) {
        return res.status(403).json({
          status: false,
          message: "Invalid API Key"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: false,
          message: "File tidak ditemukan"
        });
      }
      
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", req.file.buffer, req.file.originalname);
      form.append("userhash", "");
      const response = await axios.post(
        "https://catbox.moe/user/api.php",
        form,
        {
          headers: form.getHeaders()
        }
      );
      res.json({
        status: true,
        result: response.data
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        error: e.message
      });
    }
  });


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

// ======================
// API ACTIVITY (UNTUK LIVE CONSOLE)
// ======================
app.get("/api/activity", (req, res) => {
  res.json({
    status: true,
    logs: activityLogs
  });
});

// ======================
// HALAMAN WEBSITE (DASHBOARD + TRY API) dengan full URL + apikey
// ======================
// ======================
// HALAMAN WEBSITE (CONSOLE + ENDPOINTS + TRY FEATURE)
// ======================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bayy API | Developer Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #050507;
      --card: #0f1117;
      --primary: #6366f1;
      --secondary: #ec4899;
      --accent: #22d3ee;
      --success: #10b981;
      --border: rgba(255, 255, 255, 0.07);
      --text-main: #f3f4f6;
      --text-dim: #9ca3af;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg);
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text-main);
      min-height: 100vh;
    }

    /* NAVBAR */
    nav {
      background: rgba(15, 17, 23, 0.8);
      backdrop-filter: blur(15px);
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 5%;
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }

    .nav-links { display: flex; gap: 30px; }
    .nav-item {
      color: var(--text-dim);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: 0.3s;
      padding: 10px 0;
      position: relative;
    }
    .nav-item.active { color: var(--primary); }
    .nav-item.active::after {
      content: ''; position: absolute; bottom: 0; left: 0; 
      width: 100%; height: 2px; background: var(--primary);
    }

    /* PAGE CONTROL */
    .container { max-width: 1400px; margin: 30px auto; padding: 0 20px; }
    .page { display: none; animation: fadeIn 0.4s ease; }
    .page.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }

    /* CONSOLE */
    .terminal-container {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .terminal-header {
      background: #1a1b1e;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }
    .terminal-body {
      height: 600px;
      padding: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      overflow-y: auto;
    }

    /* ENDPOINTS */
    .endpoint-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 25px;
    }
    .api-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      transition: 0.3s;
    }
    .url-box {
      background: rgba(0,0,0,0.4);
      padding: 12px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--accent);
      margin: 15px 0;
      border: 1px dashed rgba(34, 211, 238, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    /* BUTTONS */
    .btn-try {
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
    }
    .btn-try:hover { filter: brightness(1.2); }

    /* MODAL */
    .modal {
      display: none; position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
      align-items: center; justify-content: center;
    }
    .modal-content {
      background: var(--card);
      width: 90%; max-width: 600px;
      padding: 30px; border-radius: 20px;
      border: 1px solid var(--border);
    }
    input {
      width: 100%; background: #1a1b1e; border: 1px solid var(--border);
      padding: 12px; border-radius: 8px; color: white; margin: 10px 0;
    }
    .res-box {
      background: #000; padding: 15px; border-radius: 10px;
      height: 250px; overflow: auto; font-family: 'JetBrains Mono'; font-size: 12px;
    }

    /* LOG COLORS */
    .status-200 { color: var(--success); }
    .status-401 { color: #facc15; }
    .status-500 { color: var(--secondary); }
  </style>
</head>
<body>

  <nav>
    <div style="font-weight: 800; font-size: 1.5rem;">
      <i class="fas fa-bolt" style="color: var(--primary)"></i> BAYY<span style="color: var(--text-dim)">API</span>
    </div>
    <div class="nav-links">
      <div class="nav-item active" onclick="switchPage('console', this)">CONSOLE</div>
      <div class="nav-item" onclick="switchPage('endpoints', this)">ENDPOINTS</div>
    </div>
  </nav>

  <div class="container">
    
    <div id="console" class="page active">
      <div class="terminal-container">
        <div class="terminal-header">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-dim)">TRAFFIC_MONITOR.LOG</span>
          <span id="reqCount" style="color: var(--primary); font-size: 12px;">0 Requests</span>
        </div>
        <div class="terminal-body" id="logBody">
          <div style="color: #4b5563;">> Booting system... Online.</div>
        </div>
      </div>
    </div>

    <div id="endpoints" class="page">
      <h2 style="margin-bottom: 25px;">API Documentation</h2>
      <div class="endpoint-grid" id="endpointGrid"></div>
    </div>

  </div>

  <div class="modal" id="modal">
    <div class="modal-content">
      <h3 id="m-name">Test API</h3>
      <div id="m-inputs" style="margin: 20px 0;"></div>
      <button class="btn-try" id="btnRun" style="margin-bottom: 15px;">RUN TEST</button>
      <div class="res-box">
        <pre id="m-res" style="color: var(--success);">{ "status": "waiting" }</pre>
      </div>
      <button onclick="closeModal()" style="background:none; border:none; color:var(--text-dim); margin-top:15px; cursor:pointer; width:100%;">Close</button>
    </div>
  </div>

  <script>
    const API_KEY = "@Saxxxx4You";
    const domain = window.location.origin;

    const apiData = [
      {
        name: "TikTok Downloader",
        path: "/api/tiktok",
        param: "url",
        placeholder: "https://vt.tiktok.com/..."
      },
      {
        name: "Unlimited AI",
        path: "/api/unli-ai",
        param: "prompt",
        placeholder: "Halo Bayy AI!"
      },
      {
        name: "Tourl Carbox",
        path: "/api/catbox",
        param: "",
        placeholder: "only file/image dll"
      },
      {
        name: "QR Generator",
        path: "/api/qr",
        param: "text",
        placeholder: "masukan text"
      },
      {
        name: "remove",
        path: "/api/removebg",
        param: "url",
        placeholder: "url foto"
      }
    ];

    function switchPage(id, el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      el.classList.add('active');
    }

    function renderEndpoints() {
      const grid = document.getElementById('endpointGrid');
      grid.innerHTML = apiData.map(api => {
        const fullUrl = \`\${domain}\${api.path}?apikey=\${API_KEY}&\${api.param}=\`;
        return \`
          <div class="api-card">
            <h3 style="margin-bottom: 10px;">\${api.name}</h3>
            <div style="font-size: 11px; color: var(--primary);">BASE URL (Click to Copy):</div>
            <div class="url-box" onclick="copyText('\${fullUrl}')">
              <span>\${fullUrl}</span>
              <i class="far fa-copy"></i>
            </div>
            <button class="btn-try" onclick='openTest(\${JSON.stringify(api)})'>
              <i class="fas fa-flask"></i> TRY TEST
            </button>
          </div>
        \`;
      }).join('');
    }

    let activeApi = null;
    function openTest(api) {
      activeApi = api;
      document.getElementById('modal').style.display = 'flex';
      document.getElementById('m-name').innerText = "Test: " + api.name;
      document.getElementById('m-inputs').innerHTML = \`
        <label style="font-size: 12px;">Input \${api.param}:</label>
        <input type="text" id="inp_val" placeholder="\${api.placeholder}">
      \`;
    }

    function closeModal() { document.getElementById('modal').style.display = 'none'; }

    document.getElementById('btnRun').onclick = async () => {
      const resBox = document.getElementById('m-res');
      const val = document.getElementById('inp_val').value;
      resBox.innerText = "Loading...";
      
      try {
        const url = \`\${activeApi.path}?apikey=\${API_KEY}&\${activeApi.param}=\${encodeURIComponent(val)}\`;
        const res = await fetch(url);
        const data = await res.json();
        resBox.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        resBox.innerText = "Error: " + e.message;
      }
    }

    function copyText(t) {
      navigator.clipboard.writeText(t);
      alert("Copied!");
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        const body = document.getElementById('logBody');
        document.getElementById('reqCount').innerText = data.logs.length + ' Requests';
        
        if (data.logs.length > 0) {
          body.innerHTML = data.logs.map(log => \`
            <div style="margin-bottom: 10px; border-bottom: 1px solid #111; padding-bottom: 5px;">
              <span style="color: #4b5563;">[\${log.timestamp}]</span> 
              <span class="status-\${log.status}">\${log.status}</span> 
              <span style="color: var(--accent);">\${log.path}</span>
              <span style="color: #334155; font-size: 11px;"> - \${JSON.stringify(log.query)}</span>
            </div>
          \`).join('');
        }
      } catch (e) {}
    }

    renderEndpoints();
    setInterval(fetchLogs, 3000);
  </script>
</body>
</html>
  `);
});


// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
  console.log("📊 Dashboard: http://localhost:" + PORT);
  console.log("🔐 API Key WAJIB: " + API_KEY);
  console.log("✅ Console log hanya untuk request API ASLI (bukan polling)");
});
