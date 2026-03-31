/**
 * IPTV-Auto v3.7 - 旗舰同步版 (数据双向联动, 失效源自动剔除, 编码解析)
 */

const HTML_HEAD = `<!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><title>IPTV-Auto v3.7 Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-content { display:none; } .tab-content.active { display:block; }
        .list-item-active { background-color:#eff6ff; border-left:4px solid #2563eb; font-weight:bold; }
        .tv-group-active { background-color:#1e293b; border-left:4px solid #10b981; color:#34d399; font-weight:bold; }
        .tv-channel-active { background-color:#334155; color:#fff; font-weight:bold; }
        #groupTemplate { font-family: 'Cascadia Code', monospace; white-space: pre; }
        .btn-icon { @apply p-1.5 hover:bg-slate-300 rounded text-base transition-colors cursor-pointer flex items-center justify-center; }
        .scroll-thin::-webkit-scrollbar { width:6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
    </style></head><body class="bg-slate-100 text-slate-800">`;

const HTML_BODY = `
<div class="max-w-[1500px] mx-auto p-4">
    <h1 class="text-3xl font-black text-center mb-6 text-blue-600 tracking-wide">IPTV-Auto 自动化管理面板 v3.7</h1>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" class="px-8 py-3 font-bold rounded-t-lg text-blue-700 bg-white" id="btn-page1">1. 源配置</button>
        <button onclick="switchTab('page2')" class="px-8 py-3 font-bold rounded-t-lg text-slate-500" id="btn-page2">2. 测速与导出</button>
        <button onclick="switchTab('page3')" class="px-8 py-3 font-bold rounded-t-lg text-slate-500" id="btn-page3">3. 电视沉浸预览</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7">
                <h2 class="text-sm font-bold text-slate-600 uppercase mb-2">直播源 (解析后将自动按模板归类)</h2>
                <textarea id="sourceInput" class="w-full h-40 p-4 border-2 rounded-xl text-sm font-mono bg-slate-50 outline-none focus:border-blue-400">https://m3u.ibert.me/fmml_ipv6.m3u</textarea>
                <div class="mt-3 flex gap-3">
                    <button onclick="parseSources()" id="parseBtn" class="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold shadow hover:bg-blue-700">🚀 解析并追加合并</button>
                    <button onclick="data=[];renderG();" class="bg-slate-200 text-slate-600 px-8 py-3 rounded-lg text-sm font-bold">🧹 清空所有数据</button>
                </div>
            </div>
            <div class="col-span-5">
                <h2 class="text-sm font-bold text-slate-600 uppercase mb-2">分组定义 (同步修改此处或下方列表)</h2>
                <textarea id="groupTemplate" class="w-full h-40 p-4 border-2 rounded-xl text-xs bg-slate-900 text-emerald-400 outline-none scroll-thin" onblur="syncJsonToUI()"></textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[550px]">
            <div class="col-span-3 border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-3 text-sm font-bold flex justify-between items-center text-slate-700">
                    <span>📁 分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="uiAddGroup()" class="p-1 hover:bg-emerald-200 text-emerald-600 rounded" title="添加分组">➕</button>
                        <button onclick="uiDelGroup()" class="p-1 hover:bg-red-200 text-red-600 rounded" title="删除分组">🗑️</button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-4 border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                <div class="bg-slate-200 p-3 text-sm font-bold flex justify-between items-center text-slate-700">
                    <span>📺 频道列表</span>
                    <div class="flex gap-1"><button onclick="sortItem('c')" title="A-Z" class="btn-icon">🔠</button><button onclick="clipAction('cut')" class="btn-icon">✂️</button><button onclick="clipAction('paste')" class="btn-icon">📥</button></div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-5 border-2 border-slate-200 rounded-xl bg-white overflow-hidden flex flex-col">
                <div class="p-3 bg-slate-200 text-sm font-bold border-b text-slate-700 flex justify-between"><span id="cNameDisplay">🔗 地址列表</span><span id="urlCount" class="text-xs font-normal text-slate-500"></span></div>
                <textarea id="urlEditor" class="w-full flex-1 p-4 text-sm font-mono leading-loose outline-none resize-none scroll-thin bg-slate-50" onchange="updateUrls()"></textarea>
            </div>
        </div>
    </div>

    <div id="page2" class="tab-content bg-white p-8 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-2 gap-6 mb-6">
            <div class="p-5 bg-slate-800 text-white rounded-xl shadow-inner">
                <div class="text-xs text-slate-400 mb-2">系统实时探测 (仅供参考)</div>
                <div id="netStatus" class="font-mono text-sm leading-relaxed text-emerald-400">正在探测...</div>
            </div>
            <div class="p-5 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                <div class="font-bold mb-3 text-blue-600">强制覆盖测速环境标识</div>
                <div class="flex gap-4">
                    <select id="sel-city" class="flex-1 p-2 border rounded"><option value="潍坊">潍坊</option><option value="北京">北京</option><option value="上海">上海</option><option value="广州">广州</option></select>
                    <select id="sel-isp" class="flex-1 p-2 border rounded"><option value="中国电信">中国电信</option><option value="中国联通">中国联通</option><option value="中国移动">中国移动</option></select>
                </div>
                <button onclick="startTesting()" class="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700">⚡ 开始测速并自动过滤失效源</button>
            </div>
        </div>
        
        <div class="relative w-full bg-slate-200 rounded-full h-8 mb-4 shadow-inner overflow-hidden">
            <div id="progressBar" class="bg-blue-500 h-full w-0 transition-all"></div>
            <div id="progressText" class="absolute inset-0 flex items-center justify-center text-xs font-black">等待开始... (0/0)</div>
        </div>
        <div id="testLog" class="h-64 bg-slate-900 text-emerald-400 p-4 font-mono text-xs rounded-xl overflow-y-auto scroll-thin"></div>
        <div id="outputLinks" class="mt-6 hidden p-5 border-2 border-emerald-500 bg-emerald-50 rounded-xl"></div>
    </div>

    <div id="page3" class="tab-content bg-slate-950 p-4 rounded-b-xl">
        <div class="flex h-[600px] rounded-xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800">
            <div class="w-1/3 flex border-r border-slate-800">
                <div id="tvGroups" class="w-1/3 bg-black overflow-y-auto py-2"></div>
                <div id="tvChannels" class="w-2/3 bg-slate-900/50 overflow-y-auto py-2"></div>
            </div>
            <div class="w-2/3 bg-black relative flex items-center justify-center" oncontextmenu="toggleVideoInfo(event); return false;">
                <video id="videoPlayer" controls class="w-full h-full object-contain"></video>
                <div id="vInfoPanel" class="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-slate-700 text-[11px] font-mono text-slate-300 opacity-0 transition-opacity pointer-events-none w-64 shadow-2xl">
                    <div id="vi-name" class="text-blue-400 font-bold mb-2 border-b border-slate-700 pb-1 truncate">频道加载中...</div>
                    <div class="space-y-1">
                        <div class="flex justify-between"><span>状态</span><span id="vi-status" class="text-emerald-400">连接中...</span></div>
                        <div class="flex justify-between"><span>分辨率</span><span id="vi-res" class="text-white">-</span></div>
                        <div class="flex justify-between"><span>视频编码</span><span id="vi-codec" class="text-yellow-500">-</span></div>
                        <div class="flex justify-between"><span>实时码率</span><span id="vi-bitrate" class="text-emerald-400">-</span></div>
                    </div>
                    <div id="vi-url" class="mt-3 p-2 bg-slate-800 rounded break-all text-[9px] text-slate-500">...</div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1; let tvCurG = 0; let clipboard = null; let hls = null;
let currentPlayInfo = { name: '', url: '', timer: null, panelPinned: false };

const defaultJson = { "央视": ["CCTV", "央视"], "卫视": ["卫视"], "其他": [] };

window.onload = () => {
    const saved = localStorage.getItem('iptv_template');
    document.getElementById('groupTemplate').value = saved || JSON.stringify(defaultJson, null, 2);
    syncJsonToUI(); 
    fetchNet();
};

// ================== 问题 1: JSON 与 UI 双向联动重构 ==================
function syncJsonToUI() {
    const el = document.getElementById('groupTemplate');
    try {
        const tmpl = JSON.parse(el.value);
        localStorage.setItem('iptv_template', el.value);
        
        // 更新现有数据的分组映射，但不清空频道
        const keys = Object.keys(tmpl);
        // 如果 data 为空，根据模板初始化
        if(data.length === 0) {
            data = keys.map(k => ({ name: k, channels: [] }));
        } else {
            // 同步分组名称
            keys.forEach(k => { if(!data.find(x=>x.name===k)) data.push({name:k, channels:[]}); });
            // 移除不再模板中的空分组
            data = data.filter(g => keys.includes(g.name) || g.channels.length > 0);
        }
        renderG();
        formatJsonDisplay();
    } catch(e) { console.error("JSON 语法错误"); }
}

function formatJsonDisplay() {
    const el = document.getElementById('groupTemplate');
    try {
        const obj = JSON.parse(el.value);
        let str = "{\\n";
        const keys = Object.keys(obj);
        keys.forEach((k, idx) => {
            str += \`  "\${k}": \${JSON.stringify(obj[k])}\${idx < keys.length-1 ? ',' : ''}\\n\`;
        });
        str += "}";
        el.value = str;
    } catch(e){}
}

function uiAddGroup() {
    const name = prompt("请输入新分组名称:");
    if(!name) return;
    try {
        const tmpl = JSON.parse(document.getElementById('groupTemplate').value);
        if(tmpl[name]) return alert("分组已存在");
        tmpl[name] = [];
        document.getElementById('groupTemplate').value = JSON.stringify(tmpl);
        syncJsonToUI();
    } catch(e){}
}

function uiDelGroup() {
    if(curG < 0) return alert("请先选择一个分组");
    if(!confirm(\`确定删除分组 [\${data[curG].name}] 吗？里面的频道也会被清除！\`)) return;
    try {
        const tmpl = JSON.parse(document.getElementById('groupTemplate').value);
        delete tmpl[data[curG].name];
        document.getElementById('groupTemplate').value = JSON.stringify(tmpl);
        data.splice(curG, 1);
        curG = -1;
        syncJsonToUI();
    } catch(e){}
}

// ================== 解析与基础渲染 ==================
async function parseSources() {
    const btn = document.getElementById('parseBtn');
    btn.innerText = "⏳ 解析中...";
    const input = document.getElementById('sourceInput').value.trim();
    if(!input) return btn.innerText = "🚀 解析并追加合并";
    
    let content = input;
    if(input.startsWith('http')) {
        const res = await fetch('/api/proxy?url=' + encodeURIComponent(input));
        if(res.ok) content = await res.text();
    }
    
    const lines = content.split('\\n');
    let tmpl = JSON.parse(document.getElementById('groupTemplate').value);
    let tName = "", tId = "";

    lines.forEach(line => {
        line = line.trim();
        if(line.startsWith('#EXTINF')) {
            tName = (line.match(/,(.*)$/)||[])[1] || "未知频道";
            tId = (line.match(/tvg-id="(.*?)"/)||[])[1] || tName;
        } else if(line.startsWith('http')) {
            let gN = "其他";
            for(let key in tmpl) { if(tmpl[key].some(k => tName.includes(k))) { gN = key; break; } }
            let g = data.find(x => x.name === gN);
            if(!g) { g = {name: gN, channels: []}; data.push(g); }
            let c = g.channels.find(x => x.name === tName);
            if(!c) { c = {name: tName, tvgId: tId, urls: []}; g.channels.push(c); }
            if(!c.urls.includes(line)) c.urls.push(line);
        }
    });
    renderG();
    btn.innerText = "🚀 解析并追加合并";
}

function renderG() {
    const el = document.getElementById('groupList');
    el.innerHTML = data.map((g, i) => \`
        <div onclick="selectG(\${i})" class="p-3 border-b cursor-pointer text-sm \${curG===i?'list-item-active':'hover:bg-slate-200'} flex justify-between">
            <span>\${g.name}</span><span class="text-[10px] bg-slate-200 px-1.5 rounded">\${g.channels.length}</span>
        </div>\`).join('');
    if(curG >= 0) renderC();
}
function renderC() {
    const el = document.getElementById('channelList');
    if(!data[curG]) return;
    el.innerHTML = data[curG].channels.map((ch, i) => \`
        <div onclick="selectC(\${i})" class="p-3 border-b cursor-pointer text-sm \${curC===i?'list-item-active':'hover:bg-slate-200'} truncate">\${ch.name}</div>\`).join('');
    renderU();
}
function renderU() {
    const e = document.getElementById('urlEditor');
    if(curG>=0 && curC>=0 && data[curG].channels[curC]) {
        const ch = data[curG].channels[curC];
        document.getElementById('cNameDisplay').innerText = ch.name;
        e.value = ch.urls.join('\\n');
        document.getElementById('urlCount').innerText = '共 ' + ch.urls.length + ' 个';
    } else { e.value = ''; }
}
function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i){ curC=i; renderC(); }
function updateUrls(){ if(curG>=0 && curC>=0) data[curG].channels[curC].urls = document.getElementById('urlEditor').value.trim().split('\\n').filter(u=>u); }

// ================== 问题 2: 测速与失效源自动剔除 ==================
async function startTesting() {
    const log = document.getElementById('testLog');
    log.innerHTML = "<div>🚦 开始并发测速并自动清洗失效源...</div>";
    
    let allUrls = [];
    data.forEach((g, gi) => g.channels.forEach((c, ci) => c.urls.forEach((u, ui) => {
        allUrls.push({gi, ci, ui, url: u, name: c.name});
    })));

    let total = allUrls.length;
    let completed = 0;
    let failedCount = 0;
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressText');

    async function check(item) {
        try {
            const start = Date.now();
            const controller = new AbortController();
            const tid = setTimeout(()=>controller.abort(), 2500);
            await fetch(item.url, {method:'HEAD', mode:'no-cors', signal:controller.signal});
            clearTimeout(tid);
            item.ms = Date.now() - start;
        } catch(e) { item.ms = -1; failedCount++; }
        completed++;
        const p = Math.round(completed/total*100);
        bar.style.width = p+'%';
        txt.innerText = \`测速中 \${p}% (\${completed}/\${total})\`;
        log.innerHTML += \`<div>\${item.name} -> \${item.ms>0 ? item.ms+'ms' : '<span class="text-red-500">失效</span>'}</div>\`;
        log.scrollTop = log.scrollHeight;
    }

    const chunks = [];
    for(let i=0; i<allUrls.length; i+=15) chunks.push(allUrls.slice(i, i+15));
    for(let chunk of chunks) await Promise.all(chunk.map(check));

    // 执行自动剔除逻辑
    data.forEach(g => {
        g.channels.forEach(c => {
            c.urls = c.urls.filter(u => {
                const res = allUrls.find(x => x.url === u);
                return res && res.ms > 0;
            });
        });
        g.channels = g.channels.filter(c => c.urls.length > 0);
    });
    data = data.filter(g => g.channels.length > 0);

    log.innerHTML += \`<div class="text-white mt-2">✅ 测速完成！已自动剔除 \${failedCount} 个失效链接。</div>\`;
    
    // 保存并生成链接
    const meta = { city: document.getElementById('sel-city').value, isp: document.getElementById('sel-isp').value };
    await fetch('/api/save-iptv-auto', {method:'POST', body: JSON.stringify({data, meta})});
    
    const b = window.location.origin;
    const out = document.getElementById('outputLinks');
    out.classList.remove('hidden');
    out.innerHTML = \`
        <div class="text-emerald-700 font-bold mb-2">🎉 订阅已纯净化生成 (iptv-auto)</div>
        <input class="w-full p-2 border rounded text-xs mb-2" readonly value="\${b}/sub/iptv-auto.m3u">
        <div class="text-[10px] text-slate-500">环境标识: \${meta.city} \${meta.isp} | 剩余有效频道: \${data.reduce((a,b)=>a+b.channels.length, 0)}</div>
    \`;
    renderG();
}

async function fetchNet() {
    try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        document.getElementById('netStatus').innerHTML = \`IP: \${d.ip} | 运营商: \${d.org} | 位置: \${d.city}\`;
    } catch(e){ document.getElementById('netStatus').innerText = "获取环境失败，请手动选择"; }
}

// ================== 问题 3: HLS 编码与码率深度解析 ==================
function playTv(gi, ci) {
    const v = document.getElementById('videoPlayer');
    const ch = data[gi].channels[ci];
    if(!ch || !ch.urls[0]) return;
    
    currentPlayInfo.name = ch.name;
    currentPlayInfo.url = ch.urls[0];
    
    // UI 更新
    document.getElementById('vi-name').innerText = ch.name;
    document.getElementById('vi-url').innerText = ch.urls[0];
    document.getElementById('vi-status').innerText = "正在握手...";
    document.getElementById('vi-res').innerText = "-";
    document.getElementById('vi-codec').innerText = "-";
    document.getElementById('vi-bitrate').innerText = "-";
    showInfoOverlay(true);

    if(hls) hls.destroy();

    if(Hls.isSupported()){
        hls = new Hls({ enableWorker: true });
        hls.loadSource(ch.urls[0]);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            v.play();
            document.getElementById('vi-status').innerText = "播放中";
        });
        
        hls.on(Hls.Events.LEVEL_LOADED, (e, d) => {
            const level = d.details;
            // 修复分辨率显示
            document.getElementById('vi-res').innerText = \`\${d.totalDuration > 0 ? '直播' : '点播'} \${level.width||'未知'}x\${level.height||'未知'}\`;
            
            // 获取编码信息
            const sn = hls.levels[hls.currentLevel];
            if(sn && sn.videoCodec) {
                let codec = sn.videoCodec.includes('hev') || sn.videoCodec.includes('hvc') ? 'H.265 (HEVC)' : 'H.264 (AVC)';
                document.getElementById('vi-codec').innerText = codec;
            }
        });

        // 实时码率计算
        hls.on(Hls.Events.FRAG_LOADED, (e, d) => {
            const bps = Math.round(d.stats.bwEstimate / 1024);
            document.getElementById('vi-bitrate').innerText = bps + " Kbps";
        });

        hls.on(Hls.Events.ERROR, (e, d) => {
            if(d.fatal) document.getElementById('vi-status').innerText = "源已失效/跨域错误";
        });
    }
}

function buildTvUI() {
    const gEl = document.getElementById('tvGroups');
    gEl.innerHTML = data.map((g, i) => \`
        <div onclick="tvCurG=\${i};buildTvUI()" class="px-2 py-4 text-xs text-center cursor-pointer \${tvCurG===i?'tv-group-active':'text-slate-500'}">\${g.name}</div>
    \`).join('');
    const cEl = document.getElementById('tvChannels');
    if(!data[tvCurG]) return;
    cEl.innerHTML = data[tvCurG].channels.map((c, i) => \`
        <div onclick="playTv(\${tvCurG}, \${i})" class="px-4 py-3 text-sm text-slate-300 border-b border-slate-800 hover:bg-slate-800 cursor-pointer">\${c.name}</div>
    \`).join('');
}

function showInfoOverlay(auto) {
    const p = document.getElementById('vInfoPanel');
    p.classList.remove('opacity-0');
    if(currentPlayInfo.timer) clearTimeout(currentPlayInfo.timer);
    if(auto && !currentPlayInfo.panelPinned) {
        currentPlayInfo.timer = setTimeout(()=>p.classList.add('opacity-0'), 5000);
    }
}
function toggleVideoInfo(e){ e.preventDefault(); currentPlayInfo.panelPinned = !currentPlayInfo.panelPinned; showInfoOverlay(!currentPlayInfo.panelPinned); }
function switchTab(t){
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    if(t==='page3') buildTvUI();
}
</script>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/proxy') {
            const target = url.searchParams.get('url');
            return fetch(new Request(target, { headers: { 'User-Agent': 'Mozilla/5.0' } }));
        }
        if (url.pathname === '/api/save-iptv-auto') {
            await env.IPTV_DATA.put('iptv-auto', await request.text());
            return new Response('ok');
        }
        if (url.pathname.startsWith('/sub/')) {
            const raw = await env.IPTV_DATA.get('iptv-auto');
            if(!raw) return new Response("None");
            const payload = JSON.parse(raw);
            let res = '#EXTM3U\n';
            payload.data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => {
                // 此处修正了转义字符，确保 Wrangler 编译通过
                res += `#EXTINF:-1 tvg-id="${c.tvgId}" group-title="${g.name}",${c.name}\n${u}\n`;
            })));
            return new Response(res);
        }
        return new Response(HTML_HEAD + HTML_BODY + JS_LOGIC + "</body></html>", { headers: {"content-type":"text/html;charset=UTF-8"} });
    }
};