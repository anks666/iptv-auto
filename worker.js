/**
 * IPTV-Auto v3.4 - 深度逻辑修复版
 */

const HTML_HEAD = `<!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><title>IPTV-Auto v3.4</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-content { display:none; } .tab-content.active { display:block; }
        .list-item-active { background-color:#eff6ff; border-left:4px solid #2563eb; font-weight:600; }
        #groupTemplate { white-space: pre !important; font-family: monospace; }
        .btn-icon { @apply p-1 hover:bg-slate-200 rounded transition-colors text-slate-600; }
    </style></head><body class="bg-slate-100 text-slate-800">`;

const HTML_BODY = `
<div class="max-w-[1400px] mx-auto p-4">
    <h1 class="text-2xl font-black text-center mb-6 text-blue-600">IPTV-Auto 深度修复版 v3.4</h1>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" class="px-6 py-3 font-bold rounded-t-lg" id="btn-page1">1. 配置管理</button>
        <button onclick="switchTab('page2')" class="px-6 py-3 font-bold rounded-t-lg" id="btn-page2">2. 测速环境</button>
        <button onclick="switchTab('page3')" class="px-6 py-3 font-bold rounded-t-lg" id="btn-page3">3. 直播预览</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7">
                <h2 class="text-[10px] font-bold text-slate-400 uppercase mb-2">直播源 (支持 M3U 链接或 文本内容)</h2>
                <textarea id="sourceInput" class="w-full h-44 p-4 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white outline-none" placeholder="粘贴内容..."></textarea>
                <div class="mt-3 flex gap-2">
                    <button onclick="parseSources()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700">🚀 解析并追加合并</button>
                    <button onclick="applyTemplate()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 px-6 py-2 rounded-lg text-sm font-bold">🔄 重新应用分组</button>
                </div>
            </div>
            <div class="col-span-5">
                <h2 class="text-[10px] font-bold text-slate-400 uppercase mb-2">分组定义 (JSON 自动换行)</h2>
                <textarea id="groupTemplate" class="w-full h-44 p-4 border rounded-xl text-xs bg-slate-900 text-emerald-400 outline-none" onblur="formatJSON()">{\\n  "央视": ["CCTV", "央视"],\\n  "卫视": ["卫视"],\\n  "其他": []\\n}</textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[500px]">
            <div class="col-span-3 border rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-2 text-[10px] font-bold flex justify-between items-center">
                    <span>分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="moveItem('g', -1)" title="向上移动分组" class="btn-icon">↑</button>
                        <button onclick="moveItem('g', 1)" title="向下移动分组" class="btn-icon">↓</button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto"></div>
            </div>
            <div class="col-span-4 border rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-2 text-[10px] font-bold flex justify-between items-center">
                    <span>频道列表</span>
                    <div class="flex gap-1">
                        <button onclick="moveItem('c', -1)" title="向上移动频道" class="btn-icon">↑</button>
                        <button onclick="moveItem('c', 1)" title="向下移动频道" class="btn-icon">↓</button>
                        <button onclick="clipAction('cut')" title="剪切频道" class="btn-icon">✂️</button>
                        <button onclick="clipAction('paste')" title="在此粘贴" class="btn-icon">📥</button>
                        <button onclick="mergeChannel()" title="与上方合并" class="btn-icon">🔗</button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto"></div>
            </div>
            <div class="col-span-5 border rounded-xl bg-white overflow-hidden flex flex-col">
                <div class="p-2 bg-slate-100 text-[10px] font-bold border-b">直播源地址 (每行一个)</div>
                <textarea id="urlEditor" class="w-full flex-1 p-4 text-xs font-mono leading-7 outline-none resize-none" onchange="updateUrls()"></textarea>
            </div>
        </div>
    </div>

    <div id="page2" class="tab-content bg-white p-8 rounded-b-xl shadow-lg border">
        <div id="netStatus" class="mb-6 p-4 bg-slate-800 text-white rounded-xl font-mono text-sm">
            正在探测网络环境...
        </div>
        <div class="flex justify-center mb-8">
            <button id="startTestBtn" onclick="startTesting()" class="bg-blue-600 text-white px-12 py-3 rounded-full font-bold shadow-lg">开始自动化测速</button>
        </div>
        <div id="testLog" class="h-64 bg-slate-900 text-blue-400 p-4 font-mono text-xs rounded-xl overflow-y-auto"></div>
    </div>

    <div id="page3" class="tab-content bg-slate-900 p-10 rounded-b-xl">
        <div class="flex flex-col items-center">
            <div class="w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border-4 border-slate-800">
                <video id="videoPlayer" controls class="w-full h-full"></video>
                <div id="vInfo" class="absolute top-4 left-4 bg-black/60 p-2 text-[10px] text-emerald-400 font-mono rounded"></div>
            </div>
        </div>
    </div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1; let clipboard = null; let hls = null;

// 初始化 JSON 换行
setTimeout(formatJSON, 100);
fetchNet();

async function fetchNet() {
    try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        document.getElementById('netStatus').innerHTML = \`🌐 IP: \${d.ip} | 🚀 ISP: \${d.org} | 📍 位置: \${d.city}, \${d.region}\`;
    } catch(e) { document.getElementById('netStatus').innerText = "网络探测失败，建议检查浏览器拦截设置。"; }
}

function formatJSON() {
    const a = document.getElementById('groupTemplate');
    try { a.value = JSON.stringify(JSON.parse(a.value), null, 2); } catch(e){}
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    if(t === 'page3') loadVideo();
}

// 核心解析逻辑修复
async function parseSources() {
    const input = document.getElementById('sourceInput').value.trim();
    if(!input) return;
    
    // 如果输入是 URL，则获取内容
    let content = input;
    if(input.startsWith('http')) {
        try {
            const res = await fetch(input);
            content = await res.json(); // 兼容 JSON 或 文本
        } catch(e) {
            const res = await fetch(input);
            content = await res.text();
        }
    }
    
    processRaw(content);
    formatJSON(); // 确保解析后 JSON 依然整齐
    renderG();
}

function processRaw(text) {
    const tmpl = JSON.parse(document.getElementById('groupTemplate').value);
    const lines = text.split('\\n');
    let tempName = "", tempTvgId = "", tempLogo = "";

    lines.forEach(line => {
        line = line.trim();
        if(line.startsWith('#EXTINF')) {
            tempName = (line.match(/,(.*)$/)||[])[1] || "未知频道";
            tempTvgId = (line.match(/tvg-id="(.*?)"/)||[])[1] || tempName;
            tempLogo = (line.match(/tvg-logo="(.*?)"/)||[])[1] || "";
        } else if(line.startsWith('http')) {
            let gN = "其他";
            for(let key in tmpl) {
                if(tmpl[key].some(k => tempName.includes(k))) { gN = key; break; }
            }
            let g = data.find(x => x.name === gN);
            if(!g) { g = {name: gN, channels: []}; data.push(g); }
            let c = g.channels.find(x => x.name === tempName);
            if(!c) { 
                c = {name: tempName, tvgId: tempTvgId, logo: tempLogo, urls: []}; 
                g.channels.push(c); 
            }
            if(!c.urls.includes(line)) c.urls.push(line);
        }
    });
}

function moveItem(type, dir) {
    if(type === 'g' && curG >= 0) {
        let target = curG + dir;
        if(target >= 0 && target < data.length) {
            [data[curG], data[target]] = [data[target], data[curG]];
            curG = target; renderG();
        }
    } else if(type === 'c' && curG >= 0 && curC >= 0) {
        let list = data[curG].channels;
        let target = curC + dir;
        if(target >= 0 && target < list.length) {
            [list[curC], list[target]] = [list[target], list[curC]];
            curC = target; renderC();
        }
    }
}

function renderG() {
    const c = document.getElementById('groupList');
    c.innerHTML = data.map((g, i) => \`<div onclick="selectG(\${i})" class="p-3 border-b cursor-pointer text-xs \${curG===i?'list-item-active':''}">\${g.name} (\${g.channels.length})</div>\`).join('');
    if(curG >= 0) renderC();
}

function renderC() {
    const c = document.getElementById('channelList');
    if(!data[curG]) return;
    c.innerHTML = data[curG].channels.map((ch, i) => \`<div onclick="selectC(\${i})" class="p-3 border-b cursor-pointer text-xs \${curC===i?'list-item-active':''}">\${ch.name}</div>\`).join('');
    renderU();
}

function renderU() {
    const e = document.getElementById('urlEditor');
    if(curG>=0 && curC>=0) e.value = data[curG].channels[curC].urls.join('\\n');
}

function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i){ curC=i; renderC(); }
function updateUrls(){ if(curG>=0 && curC>=0) data[curG].channels[curC].urls = document.getElementById('urlEditor').value.trim().split('\\n'); }

function loadVideo() {
    const v = document.getElementById('videoPlayer');
    const ch = data[curG]?.channels[curC];
    if(!ch || !ch.urls[0]) return;
    if(hls) hls.destroy();
    if(Hls.isSupported()){
        hls = new Hls();
        hls.loadSource(ch.urls[0]);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => v.play());
    }
}
</script>
`;

export default {
    async fetch(request, env) {
        return new Response(HTML_HEAD + HTML_BODY + JS_LOGIC + "</body></html>", {
            headers: {"content-type": "text/html;charset=UTF-8"}
        });
    }
};