/**
 * IPTV-Auto v2.2 - 修复构建时的语法解析错误
 */

const HTML_HEAD = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>IPTV-Auto 聚合管理</title><script src="https://cdn.tailwindcss.com"></script><style>.tab-content{display:none}.tab-content.active{display:block}.list-item-active{background-color:#dbeafe;border-left:4px solid #3b82f6}.scroll-thin::-webkit-scrollbar{width:4px}.scroll-thin::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}button:disabled{opacity:0.3;cursor:not-allowed}</style></head><body class="bg-gray-100 font-sans"><div class="max-w-7xl mx-auto p-4">';

const HTML_BODY = `
    <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">IPTV-Auto 多源聚合面板</h1>
    
    <div class="flex border-b mb-4">
        <button onclick="switchTab('page1')" class="tab-btn px-4 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600" id="btn-page1">1. 聚合与编辑</button>
        <button onclick="switchTab('page2')" class="tab-btn px-4 py-2 bg-gray-200 text-gray-600" id="btn-page2">2. 测速与导出</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded shadow">
        <div class="mb-6">
            <h2 class="text-xl font-bold mb-2 text-gray-700">添加直播源 (支持多次添加以合并)</h2>
            <div class="flex gap-4">
                <textarea id="sourceInput" class="flex-1 h-32 p-2 border rounded text-sm font-mono" placeholder="粘贴 M3U 链接或文本..."></textarea>
                <div class="w-80">
                    <span class="text-xs font-bold text-gray-500">自动分组模板 (JSON)</span>
                    <textarea id="groupTemplate" class="w-full h-24 p-2 border rounded text-xs">{"央视":["CCTV","央视"],"卫视":["卫视"],"高清":["HD","高清"],"4K":["4K"]}</textarea>
                </div>
            </div>
            <div class="mt-2 flex gap-2">
                <button onclick="parseSources()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">解析并追加合并</button>
                <button onclick="if(confirm('清空数据?')){data=[];renderG();renderC();}" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">清空所有</button>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[500px]">
            <div class="col-span-3 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 flex justify-between items-center">
                    <span class="font-bold text-sm">分组</span>
                    <div class="flex gap-1">
                        <button onclick="moveGroup(-1)" class="px-1 bg-white border rounded text-xs">↑</button>
                        <button onclick="moveGroup(1)" class="px-1 bg-white border rounded text-xs">↓</button>
                        <button onclick="addGroup()" class="px-1 bg-green-500 text-white rounded text-xs">+</button>
                        <button onclick="removeGroup()" class="px-1 bg-red-500 text-white rounded text-xs">🗑️</button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-4 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 flex justify-between items-center">
                    <span class="font-bold text-sm">频道</span>
                    <div class="flex gap-1">
                        <button onclick="moveChannel(-1)" class="px-1 bg-white border rounded text-xs">↑</button>
                        <button onclick="moveChannel(1)" class="px-1 bg-white border rounded text-xs">↓</button>
                        <button onclick="removeChannel()" class="px-1 bg-red-500 text-white rounded text-xs">🗑️</button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-5 border rounded bg-gray-50 flex flex-col overflow-hidden">
                <div class="bg-gray-200 p-2 font-bold text-sm">直播地址</div>
                <textarea id="urlEditor" class="w-full flex-1 p-2 border text-xs font-mono" onchange="updateUrls()"></textarea>
            </div>
        </div>
        <div class="mt-6 text-center">
            <button onclick="switchTab('page2')" class="bg-green-600 text-white px-10 py-3 rounded-full font-bold shadow-lg">确认并测速</button>
        </div>
    </div>

    <div id="page2" class="tab-content bg-white p-6 rounded shadow">
        <div id="networkInfo" class="mb-4 text-center p-2 bg-blue-50 rounded font-bold text-sm">等待测速...</div>
        <div class="flex justify-center mb-6"><button id="startTestBtn" onclick="startTesting()" class="bg-green-500 text-white px-12 py-3 rounded font-bold">开始全自动测速</button></div>
        <div class="w-full bg-gray-200 rounded-full h-4 mb-4"><div id="progressBar" class="bg-blue-600 h-4 rounded-full w-0 transition-all"></div></div>
        <div id="testLog" class="h-64 overflow-y-auto bg-gray-900 text-gray-300 p-4 font-mono text-xs rounded"></div>
        <div id="outputSection" class="mt-6 p-4 border border-dashed rounded bg-gray-50">
            <h3 class="font-bold text-green-700 mb-2">生成订阅：</h3>
            <div id="linksContainer" class="space-y-2"></div>
        </div>
    </div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1;
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
        } else { processM3U(text); break; }
    }
    document.getElementById('sourceInput').value = ""; renderG();
}
function processM3U(content){
    const tmpl = JSON.parse(document.getElementById('groupTemplate').value);
    let tN;
    content.split('\\n').forEach(l => {
        l = l.trim();
        if(l.startsWith('#EXTINF')) tN = (l.match(/,(.*)$/)||[])[1];
        else if(l.startsWith('http')){
            let gN = "其他";
            for(let k in tmpl) if(tmpl[k].some(key => tN && tN.includes(key))) { gN = k; break; }
            let g = data.find(x => x.name === gN);
            if(!g){ g = {name: gN, channels: []}; data.push(g); }
            let c = g.channels.find(x => x.name === tN);
            if(!c){ c = {name: tN, urls: []}; g.channels.push(c); }
            if(!c.urls.includes(l)) c.urls.push(l);
        }
    });
}
function renderG(){
    const c = document.getElementById('groupList');
    c.innerHTML = data.map((g, i) => '<div onclick="selectG('+i+')" class="p-2 border-b cursor-pointer text-sm '+(curG===i?'list-item-active':'')+'">'+g.name+' <span class="text-xs text-gray-400">('+g.channels.length+')</span></div>').join('');
    if(curG >= 0) renderC();
}
function renderC(){
    const c = document.getElementById('channelList');
    if(curG < 0 || !data[curG]) { c.innerHTML=""; return; }
    c.innerHTML = data[curG].channels.map((ch, i) => '<div onclick="selectC('+i+')" class="p-2 border-b cursor-pointer text-sm '+(curC===i?'list-item-active':'')+'">'+ch.name+' <span class="text-xs text-gray-400">('+ch.urls.length+')</span></div>').join('');
    renderU();
}
function renderU(){
    const e = document.getElementById('urlEditor');
    if(curG >=0 && curC >=0 && data[curG].channels[curC]) e.value = data[curG].channels[curC].urls.join('\\n');
    else e.value = "";
}
function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i){ curC=i; renderC(); }
function addGroup(){ const n=prompt("分组名"); if(n){ data.push({name:n, channels:[]}); renderG(); } }
function removeGroup(){ if(confirm("删除?")){ data.splice(curG,1); curG=-1; renderG(); renderC(); } }
function removeChannel(){ if(confirm("删除?")){ data[curG].channels.splice(curC,1); renderC(); } }
function updateUrls(){ if(curG>=0 && curC>=0) data[curG].channels[curC].urls = document.getElementById('urlEditor').value.trim().split('\\n').filter(u=>u); }
function moveGroup(d){ if(curG+d>=0 && curG+d<data.length){ [data[curG],data[curG+d]]=[data[curG+d],data[curG]]; curG+=d; renderG(); } }
function moveChannel(d){ let cs=data[curG].channels; if(curC+d>=0 && curC+d<cs.length){ [cs[curC],cs[curC+d]]=[cs[curC+d],cs[curC]]; curC+=d; renderC(); } }

async function startTesting(){
    document.getElementById('startTestBtn').classList.add('hidden');
    const log = document.getElementById('testLog'); log.innerHTML="开始合并测速...\\n";
    let all = [];
    data.forEach(g => g.channels.forEach(c => c.urls.forEach(u => all.push({g:g.name, c:c.name, url:u}))));
    for(let i=0; i<all.length; i++){
        const item = all[i]; const start = Date.now();
        try { await fetch(item.url, {mode:'no-cors', signal: AbortSignal.timeout(2000)}); item.time = Date.now()-start; } catch(e) { item.time = 9999; }
        document.getElementById('progressBar').style.width = ((i+1)/all.length*100)+'%';
        log.innerText += '['+(item.time<9999?item.time+'ms':'超时')+'] '+item.c+'\\n'; log.scrollTop = log.scrollHeight;
    }
    const res = await fetch('/api/save', {method:'POST', body: JSON.stringify(data)});
    const {id} = await res.json();
    const b = window.location.origin;
    document.getElementById('linksContainer').innerHTML = '<div class="text-xs">M3U: '+b+'/sub/'+id+'.m3u</div><div class="text-xs">TXT: '+b+'/sub/'+id+'.txt</div>';
}
</script>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/ip') return new Response(JSON.stringify({ip: request.headers.get('cf-connecting-ip')}));
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            await env.IPTV_DATA.put(id, await request.text(), {expirationTtl: 2592000});
            return new Response(JSON.stringify({id}));
        }
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            const raw = await env.IPTV_DATA.get(id);
            if(!raw) return new Response("404");
            const d = JSON.parse(raw);
            let res = url.pathname.endsWith('.m3u') ? "#EXTM3U\n" : "";
            for(const g of d) {
                for(const c of g.channels) {
                    for(const u of c.urls) {
                        if(url.pathname.endsWith('.m3u')) {
                            res += '#EXTINF:-1 group-title="' + g.name + '",' + c.name + '\n' + u + '\n';
                        } else {
                            res += c.name + ',' + u + '\n';
                        }
                    }
                }
            }
            return new Response(res);
        }
        return new Response(HTML_HEAD + HTML_BODY + JS_LOGIC + "</body></html>", {
            headers: {"content-type": "text/html;charset=UTF-8"}
        });
    }
};