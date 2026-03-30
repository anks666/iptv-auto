/**
 * IPTV-Auto v3.5 - 终极修复版 (代理突破跨域, 沉浸式电视UI, 完美大字版)
 */

const HTML_HEAD = `<!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><title>IPTV-Auto v3.5 Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-content { display:none; } .tab-content.active { display:block; }
        .list-item-active { background-color:#eff6ff; border-left:4px solid #2563eb; font-weight:bold; }
        #groupTemplate { white-space: pre !important; font-family: monospace; }
        .btn-icon { @apply p-1.5 hover:bg-slate-300 rounded text-base transition-colors cursor-pointer flex items-center justify-center; }
        .scroll-thin::-webkit-scrollbar { width:6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
    </style></head><body class="bg-slate-100 text-slate-800">`;

const HTML_BODY = `
<div class="max-w-[1500px] mx-auto p-4">
    <h1 class="text-3xl font-black text-center mb-6 text-blue-600 tracking-wide">IPTV-Auto 多源聚合管理面板 v3.5</h1>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" class="px-8 py-3 font-bold rounded-t-lg text-blue-700 bg-white" id="btn-page1">1. 配置管理</button>
        <button onclick="switchTab('page2')" class="px-8 py-3 font-bold rounded-t-lg text-slate-500" id="btn-page2">2. 测速环境</button>
        <button onclick="switchTab('page3')" class="px-8 py-3 font-bold rounded-t-lg text-slate-500" id="btn-page3">3. 电视直播预览</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7">
                <h2 class="text-sm font-bold text-slate-600 uppercase mb-2">直播源 (输入链接自动代理解析)</h2>
                <textarea id="sourceInput" class="w-full h-44 p-4 border-2 rounded-xl text-sm font-mono bg-slate-50 focus:bg-white focus:border-blue-400 outline-none" placeholder="粘贴内容...">https://m3u.ibert.me/fmml_itv.m3u</textarea>
                <div class="mt-3 flex gap-3">
                    <button onclick="parseSources()" id="parseBtn" class="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold shadow hover:bg-blue-700">🚀 解析并追加合并</button>
                    <button onclick="applyTemplate()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 px-8 py-3 rounded-lg text-sm font-bold">🔄 重新应用分组</button>
                </div>
            </div>
            <div class="col-span-5">
                <h2 class="text-sm font-bold text-slate-600 uppercase mb-2">分组定义 (JSON 自动换行)</h2>
                <textarea id="groupTemplate" class="w-full h-44 p-4 border-2 rounded-xl text-sm bg-slate-900 text-emerald-400 outline-none scroll-thin" onblur="formatJSON()"></textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[600px]">
            <div class="col-span-3 border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-3 text-sm font-bold flex justify-between items-center text-slate-700">
                    <span>📁 分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="sortItem('g', 'auto')" title="A-Z 自动排序" class="btn-icon">🔠</button>
                        <button onclick="moveItem('g', -1)" title="向上移动" class="btn-icon">⬆️</button>
                        <button onclick="moveItem('g', 1)" title="向下移动" class="btn-icon">⬇️</button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-4 border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-3 text-sm font-bold flex justify-between items-center text-slate-700">
                    <span>📺 频道列表</span>
                    <div class="flex gap-1">
                        <button onclick="sortItem('c', 'auto')" title="A-Z 自动排序" class="btn-icon">🔠</button>
                        <button onclick="moveItem('c', -1)" title="向上移动" class="btn-icon">⬆️</button>
                        <button onclick="moveItem('c', 1)" title="向下移动" class="btn-icon">⬇️</button>
                        <div class="w-px h-6 bg-slate-300 mx-1"></div>
                        <button onclick="clipAction('cut')" title="剪切选中频道" class="btn-icon">✂️</button>
                        <button onclick="clipAction('paste')" title="在此粘贴频道" class="btn-icon">📥</button>
                        <button onclick="mergeChannel()" title="将URL合并至上方频道" class="btn-icon">🔗</button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-5 border-2 border-slate-200 rounded-xl bg-white overflow-hidden flex flex-col">
                <div class="p-3 bg-slate-200 text-sm font-bold border-b text-slate-700 flex justify-between">
                    <span>🔗 直播源地址 (每行一个)</span>
                    <span id="urlCount" class="text-xs font-normal text-slate-500"></span>
                </div>
                <textarea id="urlEditor" class="w-full flex-1 p-4 text-sm font-mono leading-loose outline-none resize-none scroll-thin bg-slate-50" onchange="updateUrls()"></textarea>
            </div>
        </div>
    </div>

    <div id="page2" class="tab-content bg-white p-8 rounded-b-xl shadow-lg border">
        <div id="netStatus" class="mb-6 p-4 bg-slate-800 text-white rounded-xl font-mono text-sm">正在探测网络环境...</div>
        <div class="flex justify-center mb-8">
            <button id="startTestBtn" onclick="startTesting()" class="bg-blue-600 text-white px-12 py-3 rounded-full font-bold shadow-lg">🚀 开始自动化测速</button>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-4 mb-4 shadow-inner"><div id="progressBar" class="bg-blue-600 h-full w-0 transition-all duration-300 rounded-full"></div></div>
        <div id="testLog" class="h-64 bg-slate-900 text-emerald-400 p-4 font-mono text-sm rounded-xl overflow-y-auto scroll-thin"></div>
        <div id="outputLinks" class="mt-6 hidden p-4 border border-blue-200 bg-blue-50 rounded-lg"></div>
    </div>

    <div id="page3" class="tab-content bg-slate-900 p-6 rounded-b-xl min-h-[700px]">
        <h2 class="text-white text-xl font-bold mb-4 flex items-center gap-2">📺 沉浸式电视预览</h2>
        <div class="flex h-[600px] gap-6">
            <div class="w-1/4 bg-slate-800 rounded-xl overflow-hidden flex flex-col border border-slate-700 shadow-xl">
                <div class="p-3 bg-slate-950 text-slate-300 font-bold text-sm border-b border-slate-700">频道导航</div>
                <div id="tvSidebar" class="flex-1 overflow-y-auto scroll-thin p-2 space-y-2"></div>
            </div>
            <div class="w-3/4 bg-black rounded-xl overflow-hidden shadow-2xl relative border-4 border-slate-800 flex items-center justify-center">
                <video id="videoPlayer" controls class="w-full h-full max-h-full"></video>
                <div id="vInfo" class="absolute top-4 left-4 bg-black/70 p-3 text-xs text-emerald-400 font-mono rounded-lg hidden backdrop-blur-sm"></div>
                <div id="vTitle" class="absolute bottom-16 left-4 text-white text-2xl font-black drop-shadow-md"></div>
            </div>
        </div>
    </div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1; let clipboard = null; let hls = null;

// 默认配置
const defaultJson = {
    "央视": ["CCTV", "央视"],
    "卫视": ["卫视"],
    "影院": ["电影", "影院"],
    "其他": []
};

// 初始化
window.onload = () => {
    document.getElementById('groupTemplate').value = JSON.stringify(defaultJson, null, 2);
    fetchNet();
    parseSources(); // 页面加载后自动尝试解析默认源
};

async function fetchNet() {
    try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        document.getElementById('netStatus').innerHTML = \`🌐 IP: \${d.ip} | 🚀 ISP: \${d.org} | 📍 位置: \${d.city}, \${d.region}\`;
    } catch(e) { document.getElementById('netStatus').innerText = "网络探测完毕。"; }
}

function formatJSON() {
    const a = document.getElementById('groupTemplate');
    try { a.value = JSON.stringify(JSON.parse(a.value), null, 2); } catch(e){}
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(el => {
        const btnId = 'btn-' + el.id;
        if(el.id === t) {
            document.getElementById(btnId).className = "px-8 py-3 font-bold rounded-t-lg text-blue-700 bg-white";
        } else {
            document.getElementById(btnId).className = "px-8 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent";
        }
    });
    if(t === 'page3') buildTvSidebar();
}

// ================== 解析核心代码 (含跨域代理) ==================
async function parseSources() {
    const btn = document.getElementById('parseBtn');
    btn.innerText = "⏳ 解析中...";
    const input = document.getElementById('sourceInput').value.trim();
    if(!input) { btn.innerText = "🚀 解析并追加合并"; return; }
    
    let content = input;
    // 检测到是以 http 开头的链接，通过 Worker 后端代理请求绕过 CORS
    if(input.startsWith('http')) {
        try {
            const res = await fetch('/api/proxy?url=' + encodeURIComponent(input));
            if(!res.ok) throw new Error("获取源失败");
            content = await res.text();
        } catch(e) {
            alert("跨域抓取失败，请检查链接是否有效。");
            btn.innerText = "🚀 解析并追加合并";
            return;
        }
    }
    
    processRaw(content);
    formatJSON();
    renderG();
    btn.innerText = "🚀 解析并追加合并";
}

function processRaw(text) {
    let tmpl;
    try { tmpl = JSON.parse(document.getElementById('groupTemplate').value); } 
    catch(e) { tmpl = defaultJson; }
    
    const lines = text.split('\\n');
    let tempName = "", tempTvgId = "";

    lines.forEach(line => {
        line = line.trim();
        if(line.startsWith('#EXTINF')) {
            tempName = (line.match(/,(.*)$/)||[])[1] || "未知频道";
            tempTvgId = (line.match(/tvg-id="(.*?)"/)||[])[1] || tempName;
        } else if(line.startsWith('http')) {
            let gN = "其他";
            for(let key in tmpl) {
                if(tmpl[key].some(k => tempName.includes(k))) { gN = key; break; }
            }
            let g = data.find(x => x.name === gN);
            if(!g) { g = {name: gN, channels: []}; data.push(g); }
            let c = g.channels.find(x => x.name === tempName);
            if(!c) { 
                c = {name: tempName, tvgId: tempTvgId, urls: []}; 
                g.channels.push(c); 
            }
            if(!c.urls.includes(line)) c.urls.push(line);
        }
    });
}
// =============================================================

// ================== 排序与移动逻辑 ==================
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
function sortItem(type) {
    if(type === 'g') {
        data.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
        renderG();
    } else if(type === 'c' && curG >= 0) {
        data[curG].channels.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
        renderC();
    }
}
function clipAction(t){
    if(curG<0 || curC<0) return;
    if(t==='cut') { clipboard = {data: data[curG].channels[curC], parent: data[curG], index: curC}; alert("频道已剪切"); }
    else if(t==='paste' && clipboard) {
        data[curG].channels.splice(curC+1, 0, JSON.parse(JSON.stringify(clipboard.data)));
        clipboard.parent.channels.splice(clipboard.index, 1);
        clipboard = null; renderG();
    }
}
function mergeChannel(){
    if(curG<0 || curC<=0) return;
    const current = data[curG].channels[curC];
    const prev = data[curG].channels[curC-1];
    current.urls.forEach(u => { if(!prev.urls.includes(u)) prev.urls.push(u); });
    data[curG].channels.splice(curC, 1);
    curC--; renderC();
}
// =============================================================

function renderG() {
    const c = document.getElementById('groupList');
    c.innerHTML = data.map((g, i) => \`<div onclick="selectG(\${i})" class="p-3 border-b cursor-pointer text-sm transition-colors \${curG===i?'list-item-active':'hover:bg-slate-200'} flex justify-between"><span>\${g.name}</span><span class="text-slate-400 text-xs bg-white px-2 rounded-full border">\${g.channels.length}</span></div>\`).join('');
    if(curG >= 0) renderC();
}
function renderC() {
    const c = document.getElementById('channelList');
    if(!data[curG]) return;
    c.innerHTML = data[curG].channels.map((ch, i) => \`<div onclick="selectC(\${i})" class="p-3 border-b cursor-pointer text-sm transition-colors \${curC===i?'list-item-active':'hover:bg-slate-200'}">\${ch.name} <span class="text-xs text-slate-400">(\${ch.urls.length}源)</span></div>\`).join('');
    renderU();
}
function renderU() {
    const e = document.getElementById('urlEditor');
    if(curG>=0 && curC>=0 && data[curG].channels[curC]) {
        const urls = data[curG].channels[curC].urls;
        e.value = urls.join('\\n');
        document.getElementById('urlCount').innerText = '共 ' + urls.length + ' 个';
    } else {
        e.value = '';
        document.getElementById('urlCount').innerText = '';
    }
}

function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i){ curC=i; renderC(); }
function updateUrls(){ if(curG>=0 && curC>=0) data[curG].channels[curC].urls = document.getElementById('urlEditor').value.trim().split('\\n').filter(u=>u); }

// ================== TV 侧边栏与播放逻辑 ==================
function buildTvSidebar() {
    const sb = document.getElementById('tvSidebar');
    let html = '';
    data.forEach((g, gIdx) => {
        html += \`<div class="text-emerald-400 font-bold text-xs mt-3 mb-1 px-2 border-l-2 border-emerald-400">\${g.name}</div>\`;
        g.channels.forEach((c, cIdx) => {
            html += \`<div onclick="playTv(\${gIdx}, \${cIdx})" class="text-slate-200 text-sm py-1.5 px-3 rounded hover:bg-slate-700 cursor-pointer truncate transition-colors">\${c.name}</div>\`;
        });
    });
    sb.innerHTML = html;
}

function playTv(gIdx, cIdx) {
    const v = document.getElementById('videoPlayer');
    const ch = data[gIdx].channels[cIdx];
    if(!ch || !ch.urls[0]) return;
    
    document.getElementById('vTitle').innerText = ch.name;
    const info = document.getElementById('vInfo');
    info.classList.remove('hidden');
    info.innerText = '正在加载流...';

    if(hls) hls.destroy();
    if(Hls.isSupported()){
        hls = new Hls();
        hls.loadSource(ch.urls[0]);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => v.play());
        hls.on(Hls.Events.LEVEL_LOADED, (e, d) => {
            const res = d.details.width + 'x' + d.details.height;
            info.innerHTML = \`📺 \${res}<br>⚡ \${Math.round(d.details.bitrate/1024)} Kbps\`;
        });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = ch.urls[0];
        v.play();
    }
}

// ================== 测速与导出逻辑 ==================
async function startTesting(){
    document.getElementById('startTestBtn').classList.add('hidden');
    const log = document.getElementById('testLog'); log.innerHTML="🚦 正在进行模拟探测并打包...\\n";
    let all = [];
    data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => all.push({c:c.name, url:u}))));
    
    for(let i=0; i<all.length; i++){
        const item = all[i];
        document.getElementById('progressBar').style.width = ((i+1)/all.length*100)+'%';
        log.innerText += '[模拟检测] ' + item.c + ' -> ' + item.url.substring(0,30) + '...\\n'; 
        log.scrollTop = log.scrollHeight;
    }

    const payload = { data: data };
    const res = await fetch('/api/save', {method:'POST', body: JSON.stringify(payload)});
    const {id} = await res.json();
    const b = window.location.origin;
    
    const out = document.getElementById('outputLinks');
    out.classList.remove('hidden');
    out.innerHTML = \`
        <p class="text-sm font-bold text-blue-800 mb-2">🎉 处理完成！您的专属订阅地址：</p>
        <div class="flex flex-col gap-2">
            <div class="bg-white p-2 rounded border font-mono text-xs">\${b}/sub/\${id}.m3u</div>
            <div class="bg-white p-2 rounded border font-mono text-xs">\${b}/sub/\${id}.txt</div>
        </div>
    \`;
}
</script>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // 核心修复点：添加后端 CORS 代理
        if (url.pathname === '/api/proxy') {
            const target = url.searchParams.get('url');
            if (!target) return new Response('Missing URL', { status: 400 });
            try {
                // 由 Cloudflare 后端发起请求，不受浏览器跨域限制
                const targetReq = new Request(target, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                const res = await fetch(targetReq);
                return new Response(res.body, { headers: { 'Access-Control-Allow-Origin': '*' } });
            } catch(e) {
                return new Response('Fetch failed', { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
            }
        }

        // 保存配置
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            await env.IPTV_DATA.put(id, await request.text(), {expirationTtl: 2592000});
            return new Response(JSON.stringify({id}));
        }

        // 输出 M3U 订阅
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            let raw = await env.IPTV_DATA.get(id);
            if (!raw) return new Response("订阅不存在", {status:404});
            const payload = JSON.parse(raw);
            
            if (url.pathname.endsWith('.txt')) {
                let txt = "";
                payload.data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => txt += c.name + ',' + u + '\n')));
                return new Response(txt, { headers: {"Content-Type":"text/plain;charset=UTF-8"} });
            } else {
                let res = '#EXTM3U\n';
                payload.data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => {
                    res += '#EXTINF:-1 tvg-id="' + c.tvgId + '" group-title="' + g.name + '",' + c.name + '\n' + u + '\n';
                })));
                return new Response(res, { headers: {"Content-Type":"text/plain;charset=UTF-8"} });
            }
        }
        
        return new Response(HTML_HEAD + HTML_BODY + JS_LOGIC + "</body></html>", {
            headers: {"content-type": "text/html;charset=UTF-8"}
        });
    }
};