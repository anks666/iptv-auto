/**
 * IPTV-Auto v3.1 - 专业聚合编辑器 (含 EPG 支持)
 */

const HTML_HEAD = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>IPTV-Auto EPG Pro</title><script src="https://cdn.tailwindcss.com"></script><style>.tab-content{display:none}.tab-content.active{display:block}.list-item-active{background-color:#dbeafe;border-left:4px solid #3b82f6}.scroll-thin::-webkit-scrollbar{width:4px}.scroll-thin::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}.clipboard-active{border:2px dashed #ef4444 !important;}</style></head><body class="bg-gray-100 font-sans"><div class="max-w-full mx-auto p-4">';

const HTML_BODY = `
    <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">IPTV-Auto EPG 专业管理面板</h1>
    
    <div class="flex border-b mb-4">
        <button onclick="switchTab('page1')" class="tab-btn px-6 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600" id="btn-page1">1. 源码与编辑</button>
        <button onclick="switchTab('page2')" class="tab-btn px-6 py-2 bg-gray-200 text-gray-600" id="btn-page2">2. 测速与导出</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded shadow">
        <div class="grid grid-cols-12 gap-4 mb-6">
            <div class="col-span-12 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                <label class="block text-xs font-bold text-blue-800 mb-1">EPG 节目单地址 (多个请用逗号隔开)</label>
                <input id="epgInput" type="text" class="w-full p-2 border rounded text-xs" placeholder="例如: http://epg.51zmt.top:8000/e.xml" value="http://epg.51zmt.top:8000/e.xml">
            </div>
            <div class="col-span-7">
                <h2 class="text-sm font-bold mb-2 text-gray-600">直播源内容</h2>
                <textarea id="sourceInput" class="w-full h-40 p-2 border rounded text-xs font-mono bg-gray-50 focus:bg-white" placeholder="粘贴 M3U 链接或内容..."></textarea>
                <div class="mt-2 flex gap-2">
                    <button onclick="parseSources()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm shadow hover:bg-blue-700">🚀 解析合并</button>
                    <button onclick="applyTemplate()" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm shadow hover:bg-indigo-700">🔄 模板重排</button>
                </div>
            </div>
            <div class="col-span-5">
                <h2 class="text-sm font-bold mb-2 text-gray-600">分组模板 (JSON)</h2>
                <textarea id="groupTemplate" class="w-full h-40 p-2 border rounded text-xs font-mono leading-relaxed bg-gray-50" onblur="formatJSON()">{\\n  "央视": ["CCTV", "央视"],\\n  "卫视": ["卫视"],\\n  "高清": ["HD", "高清"],\\n  "4K": ["4K"]\\n}</textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[550px]">
            <div class="col-span-3 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 flex justify-between items-center font-bold text-sm text-gray-700"><span>分组</span><button onclick="addG()" class="px-2 bg-green-500 text-white rounded">+</button></div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-4 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 flex justify-between items-center font-bold text-sm text-gray-700">
                    <span>频道</span>
                    <div class="flex gap-1">
                        <button onclick="clipAction('cut')" class="px-1 bg-white border rounded">✂️</button>
                        <button onclick="clipAction('paste')" class="px-1 bg-white border rounded">📥</button>
                        <button onclick="mergeChannel()" class="px-1 bg-white border rounded">🔗</button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin p-1"></div>
            </div>
            <div class="col-span-5 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 font-bold text-sm flex justify-between text-gray-700">
                    <span>频道信息 & 地址</span>
                    <div class="flex gap-2 font-normal text-xs">
                        <button onclick="editChannelInfo()" class="text-blue-600">修改名称/EPG ID</button>
                    </div>
                </div>
                <div class="p-2 border-b bg-white text-[10px] text-gray-500" id="channelDetailDisplay">未选中频道</div>
                <textarea id="urlEditor" class="w-full flex-1 p-3 border-none text-xs font-mono leading-loose focus:ring-0" onchange="updateUrls()" placeholder="选中频道后编辑 URL..."></textarea>
            </div>
        </div>

        <div class="mt-8 text-center"><button onclick="switchTab('page2')" class="bg-green-600 text-white px-16 py-4 rounded-full font-bold shadow-xl">保存修改并进入测速</button></div>
    </div>

    <div id="page2" class="tab-content bg-white p-6 rounded shadow">
        <div id="networkInfo" class="mb-4 text-center p-3 bg-blue-50 rounded-lg font-bold">测速准备中...</div>
        <div class="flex justify-center mb-8"><button id="startTestBtn" onclick="startTesting()" class="bg-green-500 text-white px-12 py-3 rounded-full font-bold shadow-lg">🚀 开始检测并生成 EPG 订阅</button></div>
        <div class="w-full bg-gray-200 rounded-full h-4 mb-4"><div id="progressBar" class="bg-blue-600 h-full w-0 transition-all duration-300"></div></div>
        <div id="testLog" class="h-64 overflow-y-auto bg-gray-900 text-green-400 p-4 font-mono text-[10px] rounded-lg"></div>
        <div id="outputSection" class="mt-8 p-6 border-2 border-dashed border-green-200 rounded-lg bg-green-50">
            <h3 class="font-bold text-green-800 mb-4">生成结果 (包含 EPG 自动关联)：</h3>
            <div id="linksContainer" class="space-y-3"></div>
        </div>
    </div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1; let clipboard = null;

function formatJSON(){ try{const a=document.getElementById('groupTemplate');a.value=JSON.stringify(JSON.parse(a.value),null,2);}catch(e){} }
function switchTab(t){
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.getElementById(t).classList.add('active');
}

async function parseSources(){
    let text = document.getElementById('sourceInput').value.trim();
    if(!text) return;
    const lines = text.split('\\n');
    for(let line of lines){
        line = line.trim();
        if(line.startsWith('http')){
            try { const r = await fetch(line); processM3U(await r.text()); } catch(e) {}
        } else if(line.length > 5) { processM3U(text); break; }
    }
    renderG();
}

function processM3U(content){
    const tmpl = JSON.parse(document.getElementById('groupTemplate').value);
    let meta = {};
    content.split('\\n').forEach(l => {
        l = l.trim();
        if(l.startsWith('#EXTINF')){
            const name = (l.match(/,(.*)$/)||[])[1];
            const tvgId = (l.match(/tvg-id="(.*?)"/)||[])[1] || name;
            const logo = (l.match(/tvg-logo="(.*?)"/)||[])[1] || "";
            meta = { name, tvgId, logo };
        } else if(l.startsWith('http')){
            let gN = "其他";
            for(let k in tmpl) if(tmpl[k].some(key => meta.name && meta.name.includes(key))) { gN = k; break; }
            let g = data.find(x => x.name === gN);
            if(!g){ g = {name: gN, channels: []}; data.push(g); }
            let c = g.channels.find(x => x.name === meta.name);
            if(!c){ c = {name: meta.name, tvgId: meta.tvgId, logo: meta.logo, urls: []}; g.channels.push(c); }
            if(!c.urls.includes(l)) c.urls.push(l);
        }
    });
}

function renderG(){
    const c = document.getElementById('groupList');
    c.innerHTML = data.map((g, i) => '<div onclick="selectG('+i+')" class="p-2 border-b cursor-pointer text-sm '+(curG===i?'list-item-active':'')+' flex justify-between"><span>'+g.name+'</span><span class="text-xs text-gray-400">'+g.channels.length+'</span></div>').join('');
    if(curG >= 0) renderC();
}
function renderC(){
    const c = document.getElementById('channelList');
    if(curG < 0 || !data[curG]) { c.innerHTML=""; return; }
    c.innerHTML = data[curG].channels.map((ch, i) => '<div onclick="selectC('+i+')" class="p-2 border-b cursor-pointer text-xs mb-1 '+(curC===i?'list-item-active':'')+'">'+ch.name+'</div>').join('');
    renderU();
}
function renderU(){
    const e = document.getElementById('urlEditor');
    const d = document.getElementById('channelDetailDisplay');
    if(curG >=0 && curC >=0 && data[curG].channels[curC]) {
        const ch = data[curG].channels[curC];
        e.value = ch.urls.join('\\n');
        d.innerText = 'EPG ID: ' + ch.tvgId + ' | Logo: ' + (ch.logo || '无');
    } else { e.value = ""; d.innerText = "未选中频道"; }
}

function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i){ curC=i; renderC(); }
function updateUrls(){ if(curG>=0 && curC>=0) data[curG].channels[curC].urls = document.getElementById('urlEditor').value.trim().split('\\n').filter(u=>u); }

function editChannelInfo(){
    if(curG<0 || curC<0) return;
    const ch = data[curG].channels[curC];
    const newId = prompt("输入新的 EPG ID (tvg-id):", ch.tvgId);
    if(newId !== null) ch.tvgId = newId;
    renderU();
}

function clipAction(t){
    if(curG<0 || curC<0) return;
    if(t==='cut') { clipboard = {data: data[curG].channels[curC], parent: data[curG], index: curC}; alert("已剪切"); }
    else if(t==='paste' && clipboard) {
        data[curG].channels.splice(curC+1, 0, JSON.parse(JSON.stringify(clipboard.data)));
        clipboard.parent.channels.splice(clipboard.index, 1);
        clipboard = null; renderG();
    }
}

async function startTesting(){
    document.getElementById('startTestBtn').classList.add('hidden');
    const log = document.getElementById('testLog'); log.innerHTML="🚦 正在生成含 EPG 的直播源...\\n";
    let all = [];
    data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => all.push({c:c.name, url:u}))));
    
    // 简易测速
    for(let i=0; i<all.length; i++){
        const item = all[i]; const start = Date.now();
        try { await fetch(item.url, {mode:'no-cors', signal: AbortSignal.timeout(2000)}); item.time = Date.now()-start; } catch(e) { item.time = 9999; }
        document.getElementById('progressBar').style.width = ((i+1)/all.length*100)+'%';
        log.innerText += '['+item.time+'ms] '+item.c+'\\n'; log.scrollTop = log.scrollHeight;
    }

    const payload = { epg: document.getElementById('epgInput').value, data: data };
    const res = await fetch('/api/save', {method:'POST', body: JSON.stringify(payload)});
    const {id} = await res.json();
    const b = window.location.origin;
    document.getElementById('linksContainer').innerHTML = \`
        <div class="p-2 bg-white rounded shadow-sm text-xs break-all"><strong>M3U (含EPG):</strong> \${b}/sub/\${id}.m3u</div>
        <div class="p-2 bg-white rounded shadow-sm text-xs"><strong>TXT (无标签):</strong> \${b}/sub/\${id}.txt</div>
    \`;
}
</script>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            await env.IPTV_DATA.put(id, await request.text(), {expirationTtl: 2592000});
            return new Response(JSON.stringify({id}));
        }
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            const raw = await env.IPTV_DATA.get(id);
            if(!raw) return new Response("404");
            const payload = JSON.parse(raw);
            const epgUrl = payload.epg || "";
            const d = payload.data;
            
            if(url.pathname.endsWith('.m3u')) {
                let res = '#EXTM3U x-tvg-url="' + epgUrl + '"\n';
                d.forEach(g => g.channels.forEach(c => c.urls.forEach(u => {
                    res += '#EXTINF:-1 tvg-id="' + c.tvgId + '" tvg-logo="' + (c.logo||'') + '" group-title="' + g.name + '",' + c.name + '\n' + u + '\n';
                })));
                return new Response(res);
            } else {
                let res = "";
                d.forEach(g => g.channels.forEach(c => c.urls.forEach(u => { res += c.name + ',' + u + '\n'; })));
                return new Response(res);
            }
        }
        return new Response(HTML_HEAD + HTML_BODY + JS_LOGIC + "</body></html>", {
            headers: {"content-type": "text/html;charset=UTF-8"}
        });
    }
};