const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ==================== API XVID ====================
app.get("/api/xvid", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const all = req.query.all;
    const totalPages = 125;
    try {
        if (all === "true") {
            const allVideos = [];
            const batchSize = 10;
            for (let i = 1; i <= totalPages; i += batchSize) {
                const batch = [];
                for (let j = i; j < i + batchSize && j <= totalPages; j++) batch.push(j);
                const results = await Promise.all(batch.map(async (p) => {
                    try {
                        const response = await axios.get("https://xvip.rgan.biz.id/api/total?page=" + p + "&q=", {
                            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
                        });
                        const data = response.data;
                        if (data && data.items && Array.isArray(data.items)) return data.items;
                        if (data && data.result && Array.isArray(data.result)) return data.result;
                        return [];
                    } catch (e) { return []; }
                }));
                allVideos.push(...results.flat());
            }
            return res.json({ success: true, total: allVideos.length, pages: totalPages, data: allVideos });
        }
        const response = await axios.get("https://xvip.rgan.biz.id/api/total?page=" + page + "&q=", {
            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
        });
        const data = response.data;
        const items = data.items || data.result || [];
        res.json({ success: true, page: page, total: data.total || items.length, pages: data.pages || totalPages, perPage: data.perPage || items.length, data: items });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get("/api/xvid/random", async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const randomPage = Math.floor(Math.random() * 125) + 1;
    try {
        const response = await axios.get("https://xvip.rgan.biz.id/api/total?page=" + randomPage + "&q=", {
            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
        });
        const data = response.data;
        const items = data.items || data.result || [];
        const shuffled = items.sort(() => Math.random() - 0.5);
        res.json({ success: true, total: shuffled.slice(0, limit).length, fromPage: randomPage, data: shuffled.slice(0, limit) });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==================== API TIKTOK ====================
app.get("/api/tiktok", async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) return res.status(400).json({ status: false, creator: "t.me/@Saxxxx4You", message: "Masukkan URL TikTok" });
        const getSession = await axios.get("https://tiktokio.com/");
        const cookies = getSession.headers["set-cookie"] ? getSession.headers["set-cookie"].join("; ") : "";
        const response = await axios.post("https://tiktokio.com/api/v1/tk/html", { vid: videoUrl, prefix: "tiktokio.com" }, {
            headers: { "Content-Type": "application/json", Cookie: cookies, Origin: "https://tiktokio.com", Referer: "https://tiktokio.com/", "User-Agent": "Mozilla/5.0" }
        });
        const $ = cheerio.load(response.data);
        const results = { status: true, creator: "t.me/@Saxxxx4You", result: { title: $(".video-info h3").text().trim(), thumbnail: $(".video-info img").attr("src"), links: [] } };
        $(".download-links a").each((i, el) => {
            const link = $(el).attr("href"); const type = $(el).text().trim();
            if (link) results.result.links.push({ type, link });
        });
        res.json(results);
    } catch (e) { res.status(500).json({ status: false, creator: "t.me/@Saxxxx4You", error: e.message }); }
});

// ==================== API UNLI-AI ====================
app.get("/api/unli-ai", async (req, res) => {
    try {
        const prompt = req.query.prompt;
        if (!prompt) return res.status(400).json({ status: false, message: "Prompt tidak boleh kosong" });
        const { wrapper } = require("axios-cookiejar-support");
        const { CookieJar } = require("tough-cookie");
        const jar = new CookieJar();
        const client = wrapper(axios.create({ jar }));
        const response = await client.post("https://app.unlimitedai.chat/api/chat", {
            chatId: "f4901baf-" + Math.random().toString(36).substring(2, 10),
            deviceId: "139cfbf9-3ae2-4855-abbc-9b6394688aa4",
            locale: "id",
            messages: [{ id: Math.random().toString(36).substring(2, 10), content: prompt, role: "user", createdAt: new Date().toISOString() }],
            selectedChatModel: "chat-model-reasoning"
        }, {
            headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome Mobile Safari", Accept: "*/*", "Content-Type": "application/json", Referer: "https://app.unlimitedai.chat/chat/id", Origin: "https://app.unlimitedai.chat" },
            responseType: "text", timeout: 60000
        });
        let fullText = "";
        for (let line of response.data.split("\n")) {
            line = line.trim();
            if (!line || line.startsWith(":")) continue;
            if (line.startsWith("data: ")) line = line.slice(6);
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === "delta" && parsed.delta) fullText += parsed.delta;
                else if (parsed.choices?.[0]?.delta?.content) fullText += parsed.choices[0].delta.content;
                else if (parsed.content) fullText += parsed.content;
            } catch (e) {}
        }
        res.json({ status: true, creator: "t.me/@Saxxxx4You", result: fullText.trim() });
    } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

// ==================== HALAMAN UTAMA ====================
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NEXUS API</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
:root {
    --bg: #06080d;
    --surface: #0d1117;
    --surface2: #151b25;
    --border: rgba(255,255,255,0.06);
    --border-hover: rgba(0,212,255,0.25);
    --text: #c9d1d9;
    --text-dim: #6e7681;
    --accent: #00d4ff;
    --accent2: #7c3aed;
    --red: #ff4757;
    --green: #00e676;
    --orange: #ff9f43;
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
}
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior: smooth; }
body { background: var(--bg); font-family: var(--font); color: var(--text); min-height:100vh; overflow-x:hidden; }
::-webkit-scrollbar { width:6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--surface2); border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* === PARTICLES === */
#particles { position:fixed; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none; }

/* === NAV === */
nav { position:fixed; top:0; left:0; right:0; z-index:100; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); background:rgba(6,8,13,0.75); border-bottom:1px solid var(--border); transition: all 0.3s; }
nav.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.4); }
.nav-inner { max-width:1100px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; }
.logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
.logo-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, var(--accent), var(--accent2)); display:flex; align-items:center; justify-content:center; font-size:16px; color:#fff; font-weight:800; box-shadow: 0 0 20px rgba(0,212,255,0.3); }
.logo-text { font-size:1.15rem; font-weight:700; color:#fff; letter-spacing:-0.5px; }
.logo-text span { color: var(--accent); }
.nav-links { display:flex; gap:6px; }
.nav-links a { color: var(--text-dim); text-decoration:none; font-size:0.82rem; font-weight:500; padding:7px 14px; border-radius:8px; transition:all 0.25s; }
.nav-links a:hover, .nav-links a.active { color:#fff; background:rgba(0,212,255,0.1); }

/* === HERO === */
.hero { position:relative; z-index:1; padding:140px 24px 60px; text-align:center; }
.hero-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(0,212,255,0.08); border:1px solid rgba(0,212,255,0.15); border-radius:50px; padding:6px 18px; font-size:0.75rem; color:var(--accent); font-weight:500; margin-bottom:28px; }
.hero-badge i { font-size:0.65rem; }
.hero h1 { font-size:clamp(2.2rem,6vw,3.8rem); font-weight:800; color:#fff; line-height:1.1; margin-bottom:18px; letter-spacing:-1.5px; }
.hero h1 .gradient { background:linear-gradient(135deg, var(--accent), var(--accent2), var(--red)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hero p { color:var(--text-dim); font-size:1.05rem; max-width:500px; margin:0 auto 36px; line-height:1.7; }
.hero-stats { display:flex; justify-content:center; gap:40px; flex-wrap:wrap; }
.stat-item { text-align:center; }
.stat-num { font-size:1.8rem; font-weight:800; color:#fff; letter-spacing:-1px; }
.stat-num span { color: var(--accent); }
.stat-label { font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }

/* === SECTIONS === */
.section { position:relative; z-index:1; max-width:1100px; margin:0 auto; padding:40px 24px 60px; }
.section-header { display:flex; align-items:center; gap:12px; margin-bottom:32px; }
.section-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; }
.section-icon.blue { background:rgba(0,212,255,0.1); color:var(--accent); }
.section-icon.purple { background:rgba(124,58,237,0.1); color:var(--accent2); }
.section-icon.red { background:rgba(255,71,87,0.1); color:var(--red); }
.section-icon.green { background:rgba(0,230,118,0.1); color:var(--green); }
.section-title { font-size:1.25rem; font-weight:700; color:#fff; letter-spacing:-0.5px; }
.section-sub { font-size:0.78rem; color:var(--text-dim); }

/* === API CARDS === */
.api-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px; }
.api-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:24px; transition:all 0.35s cubic-bezier(.4,0,.2,1); cursor:pointer; position:relative; overflow:hidden; }
.api-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg, transparent, var(--accent), transparent); opacity:0; transition:opacity 0.3s; }
.api-card:hover { border-color:var(--border-hover); transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,212,255,0.1); }
.api-card:hover::before { opacity:1; }
.card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.card-method { font-family:var(--mono); font-size:0.7rem; font-weight:600; padding:4px 10px; border-radius:6px; }
.card-method.get { background:rgba(0,230,118,0.1); color:var(--green); }
.card-status { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px rgba(0,230,118,0.5); animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
.card-name { font-size:1.05rem; font-weight:700; color:#fff; margin-bottom:6px; }
.card-desc { font-size:0.82rem; color:var(--text-dim); line-height:1.6; margin-bottom:16px; }
.card-endpoint { font-family:var(--mono); font-size:0.75rem; color:var(--accent); background:rgba(0,212,255,0.06); padding:8px 12px; border-radius:8px; border:1px solid rgba(0,212,255,0.08); word-break:break-all; }
.card-endpoint span { color:var(--text-dim); }

/* === PLAYGROUND === */
.playground { background:var(--surface); border:1px solid var(--border); border-radius:20px; overflow:hidden; }
.pg-tabs { display:flex; border-bottom:1px solid var(--border); overflow-x:auto; }
.pg-tab { padding:14px 22px; font-size:0.82rem; font-weight:600; color:var(--text-dim); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.25s; white-space:nowrap; display:flex; align-items:center; gap:8px; }
.pg-tab:hover { color:var(--text); background:rgba(255,255,255,0.02); }
.pg-tab.active { color:var(--accent); border-bottom-color:var(--accent); background:rgba(0,212,255,0.04); }
.pg-tab i { font-size:0.9rem; }
.pg-body { padding:24px; }
.pg-panel { display:none; }
.pg-panel.active { display:block; }
.pg-row { display:flex; gap:10px; margin-bottom:12px; }
.pg-input { flex:1; padding:12px 16px; background:var(--bg); border:1px solid var(--border); border-radius:10px; color:#fff; font-family:var(--mono); font-size:0.82rem; outline:none; transition:border 0.25s; }
.pg-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(0,212,255,0.08); }
.pg-input::placeholder { color:var(--text-dim); }
.pg-select { padding:12px 16px; background:var(--bg); border:1px solid var(--border); border-radius:10px; color:#fff; font-size:0.82rem; outline:none; min-width:120px; cursor:pointer; }
.pg-select option { background:var(--surface); }
.btn { padding:12px 24px; border:none; border-radius:10px; font-family:var(--font); font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; }
.btn-primary { background:linear-gradient(135deg, var(--accent), #0099cc); color:#000; box-shadow:0 4px 15px rgba(0,212,255,0.25); }
.btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 25px rgba(0,212,255,0.35); }
.btn-primary:active { transform:translateY(0); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
.btn-secondary { background:var(--surface2); color:var(--text); border:1px solid var(--border); }
.btn-secondary:hover { border-color:var(--text-dim); }
.pg-result { margin-top:16px; position:relative; }
.pg-result-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.pg-result-label { font-size:0.75rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:1px; }
.pg-result-actions { display:flex; gap:6px; }
.pg-result-actions button { background:transparent; border:1px solid var(--border); color:var(--text-dim); padding:4px 10px; border-radius:6px; font-size:0.7rem; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:4px; }
.pg-result-actions button:hover { border-color:var(--accent); color:var(--accent); }
.pg-output { background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:16px; font-family:var(--mono); font-size:0.78rem; color:var(--text); max-height:450px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; line-height:1.7; }
.pg-output .key { color:var(--accent); }
.pg-output .string { color:var(--green); }
.pg-output .number { color:var(--orange); }
.pg-output .bool { color:var(--accent2); }
.pg-output .null { color:var(--red); }
.pg-output .bracket { color:var(--text-dim); }
.pg-output .loading { color:var(--text-dim); font-style:italic; }

/* === AI CHAT === */
.chat-container { display:flex; flex-direction:column; height:400px; }
.chat-messages { flex:1; overflow-y:auto; padding:8px 0; display:flex; flex-direction:column; gap:12px; }
.chat-msg { display:flex; gap:10px; max-width:85%; animation: msgIn 0.3s ease; }
@keyframes msgIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
.chat-msg.user { align-self:flex-end; flex-direction:row-reverse; }
.chat-avatar { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; flex-shrink:0; }
.chat-msg.ai .chat-avatar { background:linear-gradient(135deg, var(--accent), var(--accent2)); color:#fff; }
.chat-msg.user .chat-avatar { background:var(--surface2); color:var(--text-dim); }
.chat-bubble { padding:12px 16px; border-radius:14px; font-size:0.85rem; line-height:1.6; }
.chat-msg.ai .chat-bubble { background:var(--surface2); border:1px solid var(--border); border-top-left-radius:4px; }
.chat-msg.user .chat-bubble { background:linear-gradient(135deg, var(--accent), #0099cc); color:#000; font-weight:500; border-top-right-radius:4px; }
.chat-input-row { display:flex; gap:10px; margin-top:12px; }

/* === FAB === */
.fab-container { position:fixed; bottom:28px; right:28px; z-index:200; display:flex; flex-direction:column-reverse; align-items:center; gap:12px; }
.fab-main { width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg, var(--accent), var(--accent2)); border:none; color:#fff; font-size:1.3rem; cursor:pointer; box-shadow:0 6px 25px rgba(0,212,255,0.35); transition:all 0.35s cubic-bezier(.4,0,.2,1); display:flex; align-items:center; justify-content:center; }
.fab-main:hover { transform:scale(1.08); box-shadow:0 8px 35px rgba(0,212,255,0.45); }
.fab-main.open { transform:rotate(45deg); border-radius:50%; }
.fab-main.open:hover { transform:rotate(45deg) scale(1.08); }
.fab-item { width:46px; height:46px; border-radius:12px; border:none; color:#fff; font-size:0.9rem; cursor:pointer; transition:all 0.3s cubic-bezier(.4,0,.2,1); display:flex; align-items:center; justify-content:center; opacity:0; transform:translateY(20px) scale(0.8); pointer-events:none; position:relative; }
.fab-item.show { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }
.fab-item:hover { transform:translateY(-2px) scale(1.08); }
.fab-item.xvid { background:linear-gradient(135deg, #ff4757, #c0392b); box-shadow:0 4px 15px rgba(255,71,87,0.3); }
.fab-item.tiktok { background:linear-gradient(135deg, #00f2ea, #ff0050); box-shadow:0 4px 15px rgba(0,242,234,0.25); }
.fab-item.ai { background:linear-gradient(135deg, var(--accent2), #5b21b6); box-shadow:0 4px 15px rgba(124,58,237,0.3); }
.fab-item.top { background:var(--surface2); border:1px solid var(--border); color:var(--text-dim); box-shadow:none; }
.fab-item.top:hover { color:#fff; border-color:var(--accent); }
.fab-tooltip { position:absolute; right:58px; top:50%; transform:translateY(-50%); background:var(--surface2); color:#fff; padding:6px 12px; border-radius:8px; font-size:0.72rem; font-weight:600; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity 0.2s; border:1px solid var(--border); }
.fab-item:hover .fab-tooltip { opacity:1; }

/* === TOAST === */
.toast-container { position:fixed; top:80px; right:24px; z-index:300; display:flex; flex-direction:column; gap:8px; }
.toast { padding:12px 20px; border-radius:10px; font-size:0.82rem; font-weight:500; color:#fff; animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards; display:flex; align-items:center; gap:8px; box-shadow:0 8px 30px rgba(0,0,0,0.4); }
.toast.success { background:linear-gradient(135deg, #00c853, #00897b); }
.toast.error { background:linear-gradient(135deg, #ff4757, #c0392b); }
.toast.info { background:linear-gradient(135deg, var(--accent), #0099cc); }
@keyframes toastIn { from{opacity:0;transform:translateX(40px);} to{opacity:1;transform:translateX(0);} }
@keyframes toastOut { from{opacity:1;transform:translateX(0);} to{opacity:0;transform:translateX(40px);} }

/* === FOOTER === */
footer { position:relative; z-index:1; text-align:center; padding:40px 24px; border-top:1px solid var(--border); }
footer p { color:var(--text-dim); font-size:0.78rem; }
footer a { color:var(--accent); text-decoration:none; }
footer a:hover { text-decoration:underline; }

/* === MODAL === */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:250; display:none; align-items:center; justify-content:center; padding:20px; }
.modal-overlay.show { display:flex; }
.modal { background:var(--surface); border:1px solid var(--border); border-radius:20px; max-width:500px; width:100%; max-height:80vh; overflow-y:auto; animation: modalIn 0.3s ease; }
@keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(10px);} to{opacity:1;transform:scale(1) translateY(0);} }
.modal-header { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.modal-header h3 { font-size:1rem; font-weight:700; color:#fff; }
.modal-close { background:none; border:none; color:var(--text-dim); font-size:1.2rem; cursor:pointer; padding:4px; transition:color 0.2s; }
.modal-close:hover { color:#fff; }
.modal-body { padding:24px; }
.modal-body label { display:block; font-size:0.78rem; font-weight:600; color:var(--text-dim); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
.modal-body input, .modal-body select { width:100%; padding:12px 16px; background:var(--bg); border:1px solid var(--border); border-radius:10px; color:#fff; font-size:0.85rem; outline:none; margin-bottom:16px; transition:border 0.25s; }
.modal-body input:focus, .modal-body select:focus { border-color:var(--accent); }
.modal-body .btn { width:100%; justify-content:center; }

/* === RESPONSIVE === */
@media (max-width:768px) {
    .nav-links { display:none; }
    .hero { padding:120px 16px 40px; }
    .hero-stats { gap:24px; }
    .section { padding:30px 16px 40px; }
    .api-grid { grid-template-columns:1fr; }
    .pg-row { flex-direction:column; }
    .pg-tabs { gap:0; }
    .pg-tab { padding:12px 16px; font-size:0.78rem; }
    .chat-msg { max-width:92%; }
    .fab-container { bottom:20px; right:20px; }
}

/* === ANIMATIONS === */
@keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
.animate-float { animation: float 4s ease-in-out infinite; }
</style>
</head>
<body>

<canvas id="particles"></canvas>

<!-- NAV -->
<nav id="navbar">
    <div class="nav-inner">
        <a href="#" class="logo">
            <div class="logo-icon">N</div>
            <div class="logo-text">NEXUS<span>API</span></div>
        </a>
        <div class="nav-links">
            <a href="#home" class="active">Home</a>
            <a href="#apis">APIs</a>
            <a href="#playground">Playground</a>
        </div>
    </div>
</nav>

<!-- HERO -->
<section class="hero" id="home">
    <div class="hero-badge"><i class="fas fa-circle"></i> All systems operational</div>
    <h1>Powerful API<br><span class="gradient">At Your Fingertips</span></h1>
    <p>Kumpulan API siap pakai dengan performa tinggi. Integrasi mudah, dokumentasi lengkap, dan playground interaktif.</p>
    <div class="hero-stats">
        <div class="stat-item">
            <div class="stat-num" id="statReqs">0<span>+</span></div>
            <div class="stat-label">Requests</div>
        </div>
        <div class="stat-item">
            <div class="stat-num">3<span></span></div>
            <div class="stat-label">Endpoints</div>
        </div>
        <div class="stat-item">
            <div class="stat-num">99<span>%</span></div>
            <div class="stat-label">Uptime</div>
        </div>
    </div>
</section>

<!-- APIs -->
<section class="section" id="apis">
    <div class="section-header">
        <div class="section-icon blue"><i class="fas fa-plug"></i></div>
        <div>
            <div class="section-title">Available Endpoints</div>
            <div class="section-sub">Klik kartu untuk langsung test di playground</div>
        </div>
    </div>
    <div class="api-grid">
        <div class="api-card" onclick="openPlayground('xvid')">
            <div class="card-top">
                <span class="card-method get">GET</span>
                <div class="card-status"></div>
            </div>
            <div class="card-name">XVID Video</div>
            <div class="card-desc">Akses koleksi video dari 125 halaman. Support paginasi, random, dan fetch semua data sekaligus.</div>
            <div class="card-endpoint"><span>GET</span> /api/xvid?page=1</div>
        </div>
        <div class="api-card" onclick="openPlayground('tiktok')">
            <div class="card-top">
                <span class="card-method get">GET</span>
                <div class="card-status"></div>
            </div>
            <div class="card-name">TikTok Downloader</div>
            <div class="card-desc">Download video TikTok tanpa watermark. Dapatkan thumbnail, judul, dan multiple download links.</div>
            <div class="card-endpoint"><span>GET</span> /api/tiktok?url=...</div>
        </div>
        <div class="api-card" onclick="openPlayground('unli-ai')">
            <div class="card-top">
                <span class="card-method get">GET</span>
                <div class="card-status"></div>
            </div>
            <div class="card-name">Unlimited AI</div>
            <div class="card-desc">AI reasoning model gratis. Tanyakan apa saja dan dapatkan jawaban cerdas dalam hitungan detik.</div>
            <div class="card-endpoint"><span>GET</span> /api/unli-ai?prompt=...</div>
        </div>
    </div>
</section>

<!-- PLAYGROUND -->
<section class="section" id="playground">
    <div class="section-header">
        <div class="section-icon purple"><i class="fas fa-terminal"></i></div>
        <div>
            <div class="section-title">API Playground</div>
            <div class="section-sub">Test semua endpoint langsung dari browser</div>
        </div>
    </div>
    <div class="playground">
        <div class="pg-tabs">
            <div class="pg-tab active" data-tab="xvid"><i class="fas fa-play"></i> XVID</div>
            <div class="pg-tab" data-tab="tiktok"><i class="fab fa-tiktok"></i> TikTok</div>
            <div class="pg-tab" data-tab="unli-ai"><i class="fas fa-robot"></i> AI Chat</div>
        </div>

        <!-- XVID Panel -->
        <div class="pg-body">
            <div class="pg-panel active" id="panel-xvid">
                <div class="pg-row">
                    <select class="pg-select" id="xvidMode">
                        <option value="page">By Page</option>
                        <option value="random">Random</option>
                        <option value="all">Fetch All</option>
                    </select>
                    <input class="pg-input" id="xvidInput" placeholder="Page number (1-125) atau limit untuk random..." type="number" min="1" value="1">
                </div>
                <div class="pg-row">
                    <button class="btn btn-primary" id="xvidBtn" onclick="fetchXvid()"><i class="fas fa-paper-plane"></i> Send Request</button>
                    <button class="btn btn-secondary" onclick="clearResult('xvidOutput')"><i class="fas fa-eraser"></i> Clear</button>
                </div>
                <div class="pg-result">
                    <div class="pg-result-header">
                        <span class="pg-result-label">Response</span>
                        <div class="pg-result-actions">
                            <button onclick="copyResult('xvidOutput')"><i class="fas fa-copy"></i> Copy</button>
                            <button onclick="downloadResult('xvidOutput','xvid-result.json')"><i class="fas fa-download"></i> Save</button>
                        </div>
                    </div>
                    <div class="pg-output" id="xvidOutput"><span class="loading">// Klik Send Request untuk test API...</span></div>
                </div>
            </div>

            <!-- TikTok Panel -->
            <div class="pg-panel" id="panel-tiktok">
                <div class="pg-row">
                    <input class="pg-input" id="tiktokInput" placeholder="https://vt.tiktok.com/ZSxxxxxxx/ atau https://www.tiktok.com/@user/video/xxx" type="url">
                </div>
                <div class="pg-row">
                    <button class="btn btn-primary" id="tiktokBtn" onclick="fetchTiktok()"><i class="fas fa-paper-plane"></i> Send Request</button>
                    <button class="btn btn-secondary" onclick="clearResult('tiktokOutput')"><i class="fas fa-eraser"></i> Clear</button>
                </div>
                <div class="pg-result">
                    <div class="pg-result-header">
                        <span class="pg-result-label">Response</span>
                        <div class="pg-result-actions">
                            <button onclick="copyResult('tiktokOutput')"><i class="fas fa-copy"></i> Copy</button>
                            <button onclick="downloadResult('tiktokOutput','tiktok-result.json')"><i class="fas fa-download"></i> Save</button>
                        </div>
                    </div>
                    <div class="pg-output" id="tiktokOutput"><span class="loading">// Paste URL TikTok lalu klik Send Request...</span></div>
                </div>
            </div>

            <!-- AI Panel -->
            <div class="pg-panel" id="panel-unli-ai">
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="chat-msg ai">
                            <div class="chat-avatar"><i class="fas fa-robot"></i></div>
                            <div class="chat-bubble">Halo! Saya AI reasoning. Tanyakan apa saja dan saya akan menjawab dengan penalaran mendalam.</div>
                        </div>
                    </div>
                    <div class="chat-input-row">
                        <input class="pg-input" id="aiInput" placeholder="Ketik pesan..." onkeydown="if(event.key==='Enter')sendAi()">
                        <button class="btn btn-primary" id="aiBtn" onclick="sendAi()"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- FOOTER -->
<footer>
    <p>NEXUS API &mdash; Built with <i class="fas fa-heart" style="color:var(--red);font-size:0.7rem;"></i> &mdash; <a href="https://t.me/Saxxxx4You" target="_blank">t.me/@Saxxxx4You</a></p>
</footer>

<!-- FAB MENU -->
<div class="fab-container" id="fabContainer">
    <button class="fab-item top" onclick="window.scrollTo({top:0,behavior:'smooth'})">
        <i class="fas fa-arrow-up"></i>
        <span class="fab-tooltip">Back to Top</span>
    </button>
    <button class="fab-item ai" onclick="openPlayground('unli-ai')">
        <i class="fas fa-robot"></i>
        <span class="fab-tooltip">AI Chat</span>
    </button>
    <button class="fab-item tiktok" onclick="openModal('tiktok')">
        <i class="fab fa-tiktok"></i>
        <span class="fab-tooltip">TikTok DL</span>
    </button>
    <button class="fab-item xvid" onclick="openModal('xvid')">
        <i class="fas fa-play"></i>
        <span class="fab-tooltip">Random Video</span>
    </button>
    <button class="fab-main" id="fabMain" onclick="toggleFab()">
        <i class="fas fa-plus"></i>
    </button>
</div>

<!-- TOAST -->
<div class="toast-container" id="toastContainer"></div>

<!-- MODAL: XVID -->
<div class="modal-overlay" id="modal-xvid">
    <div class="modal">
        <div class="modal-header">
            <h3><i class="fas fa-play" style="color:var(--red);margin-right:8px;"></i>Quick: Random XVID</h3>
            <button class="modal-close" onclick="closeModal('xvid')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <label>Jumlah Video</label>
            <input type="number" id="modalXvidLimit" min="1" max="50" value="5" placeholder="1-50">
            <button class="btn btn-primary" onclick="quickXvid()"><i class="fas fa-bolt"></i> Fetch Random</button>
        </div>
    </div>
</div>

<!-- MODAL: TIKTOK -->
<div class="modal-overlay" id="modal-tiktok">
    <div class="modal">
        <div class="modal-header">
            <h3><i class="fab fa-tiktok" style="color:var(--accent);margin-right:8px;"></i>Quick: TikTok Download</h3>
            <button class="modal-close" onclick="closeModal('tiktok')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <label>Video URL</label>
            <input type="url" id="modalTiktokUrl" placeholder="https://vt.tiktok.com/ZSxxxxxxx/">
            <button class="btn btn-primary" onclick="quickTiktok()"><i class="fas fa-bolt"></i> Download</button>
        </div>
    </div>
</div>

<script>
// ===== PARTICLES =====
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
document.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener("mouseleave", () => { mouse.x = null; mouse.y = null; });

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (mouse.x !== null) {
            const dx = this.x - mouse.x, dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                const force = (120 - dist) / 120;
                this.x += dx * force * 0.02;
                this.y += dy * force * 0.02;
            }
        }
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${this.opacity})`;
        ctx.fill();
    }
}

for (let i = 0; i < 80; i++) particles.push(new Particle());

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 130)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

// ===== NAV SCROLL =====
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.classList.remove("active");
        if (a.getAttribute("href") === "#" + getVisibleSection()) a.classList.add("active");
    });
});

function getVisibleSection() {
    const sections = ["home", "apis", "playground"];
    for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) return id;
    }
    return "home";
}

// ===== STAT COUNTER =====
let reqCount = parseInt(localStorage.getItem("nexReqCount") || "12847");
function animateCounter(el, target) {
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.innerHTML = current.toLocaleString() + "<span>+</span>";
    }, 20);
}
animateCounter(document.getElementById("statReqs"), reqCount);

function incrementReqs() {
    reqCount++;
    localStorage.setItem("nexReqCount", reqCount);
    document.getElementById("statReqs").innerHTML = reqCount.toLocaleString() + "<span>+</span>";
}

// ===== TABS =====
document.querySelectorAll(".pg-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".pg-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".pg-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    });
});

function openPlayground(tab) {
    document.querySelectorAll(".pg-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.tab === tab);
    });
    document.querySelectorAll(".pg-panel").forEach(p => p.classList.remove("active"));
    document.getElementById("panel-" + tab).classList.add("active");
    document.getElementById("playground").scrollIntoView({ behavior: "smooth" });
}

// ===== JSON SYNTAX HIGHLIGHT =====
function syntaxHighlight(json) {
    if (typeof json !== "string") json = JSON.stringify(json, null, 2);
    json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return json.replace(
        /("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = "number";
            if (/^"/.test(match)) {
                if (/:$/.test(match)) { cls = "key"; }
                else { cls = "string"; }
            } else if (/true|false/.test(match)) { cls = "bool"; }
            else if (/null/.test(match)) { cls = "null"; }
            return '<span class="' + cls + '">' + match + "</span>";
        }
    );
}

// ===== RAW TEXT FOR COPY/DOWNLOAD =====
let rawResults = {};

function clearResult(id) {
    document.getElementById(id).innerHTML = '<span class="loading">// Cleared</span>';
    delete rawResults[id];
}

function copyResult(id) {
    if (rawResults[id]) {
        navigator.clipboard.writeText(rawResults[id]).then(() => showToast("Copied to clipboard!", "success"));
    }
}

function downloadResult(id, filename) {
    if (rawResults[id]) {
        const blob = new Blob([rawResults[id]], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        showToast("File downloaded!", "success");
    }
}

// ===== TOAST =====
function showToast(msg, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    const icons = { success: "fa-check-circle", error: "fa-exclamation-circle", info: "fa-info-circle" };
    toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i> ' + msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// ===== XVID API =====
async function fetchXvid() {
    const mode = document.getElementById("xvidMode").value;
    const val = document.getElementById("xvidInput").value;
    const btn = document.getElementById("xvidBtn");
    const output = document.getElementById("xvidOutput");
    let url = "/api/xvid";

    if (mode === "page") url += "?page=" + (parseInt(val) || 1);
    else if (mode === "random") url += "/random?limit=" + (parseInt(val) || 10);
    else if (mode === "all") url += "?all=true";

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    output.innerHTML = '<span class="loading">// Fetching data...</span>';

    try {
        const res = await fetch(url);
        const data = await res.json();
        rawResults["xvidOutput"] = JSON.stringify(data, null, 2);
        output.innerHTML = syntaxHighlight(data);
        incrementReqs();
        showToast("XVID: " + (data.total || data.data?.length || 0) + " items loaded", "success");
    } catch (e) {
        output.innerHTML = '<span class="null">Error: ' + e.message + "</span>";
        showToast("Request failed", "error");
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
}

// ===== TIKTOK API =====
async function fetchTiktok() {
    const url = document.getElementById("tiktokInput").value.trim();
    const btn = document.getElementById("tiktokBtn");
    const output = document.getElementById("tiktokOutput");

    if (!url) { showToast("Masukkan URL TikTok!", "error"); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    output.innerHTML = '<span class="loading">// Processing TikTok URL...</span>';

    try {
        const res = await fetch("/api/tiktok?url=" + encodeURIComponent(url));
        const data = await res.json();
        rawResults["tiktokOutput"] = JSON.stringify(data, null, 2);
        output.innerHTML = syntaxHighlight(data);
        incrementReqs();
        if (data.status) showToast("Video found! " + (data.result?.links?.length || 0) + " links available", "success");
        else showToast(data.message || "Failed to process", "error");
    } catch (e) {
        output.innerHTML = '<span class="null">Error: ' + e.message + "</span>";
        showToast("Request failed", "error");
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
}

// ===== AI CHAT =====
async function sendAi() {
    const input = document.getElementById("aiInput");
    const msg = input.value.trim();
    if (!msg) return;

    const messagesEl = document.getElementById("chatMessages");

    // User message
    messagesEl.innerHTML += '<div class="chat-msg user"><div class="chat-avatar"><i class="fas fa-user"></i></div><div class="chat-bubble">' + msg.replace(/</g,"&lt;").replace(/>/g,"&gt;") + '</div></div>';
    input.value = "";

    // Loading
    const loadingId = "ai-loading-" + Date.now();
    messagesEl.innerHTML += '<div class="chat-msg ai" id="' + loadingId + '"><div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble"><i class="fas fa-circle-notch fa-spin"></i> Berpikir...</div></div>';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const btn = document.getElementById("aiBtn");
    btn.disabled = true;

    try {
        const res = await fetch("/api/unli-ai?prompt=" + encodeURIComponent(msg));
        const data = await res.json();
        const answer = data.result || data.error || "No response";
        const el = document.getElementById(loadingId);
        if (el) el.querySelector(".chat-bubble").innerHTML = answer.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g, "<br>");
        incrementReqs();
    } catch (e) {
        const el = document.getElementById(loadingId);
        if (el) el.querySelector(".chat-bubble").innerHTML = '<span style="color:var(--red);">Error: ' + e.message + "</span>";
        showToast("AI request failed", "error");
    }

    btn.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===== FAB =====
let fabOpen = false;
function toggleFab() {
    fabOpen = !fabOpen;
    document.getElementById("fabMain").classList.toggle("open", fabOpen);
    document.querySelectorAll(".fab-item").forEach((item, i) => {
        if (fabOpen) setTimeout(() => item.classList.add("show"), i * 50);
        else { item.classList.remove("show"); }
    });
}
document.addEventListener("click", e => {
    if (fabOpen && !document.getElementById("fabContainer").contains(e.target)) toggleFab();
});

// ===== MODAL =====
function openModal(name) { document.getElementById("modal-" + name).classList.add("show"); if (fabOpen) toggleFab(); }
function closeModal(name) { document.getElementById("modal-" + name).classList.remove("show"); }
document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => { if (e.target === m) m.classList.remove("show"); });
});

async function quickXvid() {
    const limit = document.getElementById("modalXvidLimit").value || 5;
    closeModal("xvid");
    openPlayground("xvid");
    document.getElementById("xvidMode").value = "random";
    document.getElementById("xvidInput").value = limit;
    setTimeout(fetchXvid, 400);
}

async function quickTiktok() {
    const url = document.getElementById("modalTiktokUrl").value.trim();
    if (!url) { showToast("Masukkan URL!", "error"); return; }
    closeModal("tiktok");
    openPlayground("tiktok");
    document.getElementById("tiktokInput").value = url;
    setTimeout(fetchTiktok, 400);
}

// ===== XVID MODE CHANGE =====
document.getElementById("xvidMode").addEventListener("change", function() {
    const input = document.getElementById("xvidInput");
    if (this.value === "page") { input.placeholder = "Page number (1-125)"; input.value = 1; }
    else if (this.value === "random") { input.placeholder = "Limit (jumlah video)"; input.value = 10; }
    else { input.placeholder = "Tidak perlu parameter"; input.value = ""; input.disabled = true; }
    if (this.value !== "all") input.disabled = false;
});

// ===== INTERSECTION OBSERVER FOR CARDS =====
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll(".api-card").forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = "all 0.6s cubic-bezier(.4,0,.2,1) " + (i * 0.1) + "s";
    observer.observe(card);
});
</script>
</body>
</html>`);
});

// ==================== 404 ====================
app.use((req, res) => {
    res.status(404).json({ success: false, error: "Endpoint not found" });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
module.exports = app;
