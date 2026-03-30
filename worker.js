const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV-Auto 管理面板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .list-item-active { background-color: #dbeafe; border-left: 4px solid #3b82f6; }
        .log-v4 { color: #60a5fa; }
        .log-v6 { color: #f472b6; }
        .scroll-thin::-webkit-scrollbar { width: 4px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        /* 链接禁用状态样式 */
        .links-disabled { opacity: 0.5; filter: grayscale(1); pointer-events: none; }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="max-w-7xl mx-auto p-4">
        <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">IPTV-Auto 自动检测与管理</h1>
        
        <div class="flex border-b mb-4">
            <button onclick="switchTab('page1')" class="tab-btn px-4 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600" id="btn-page1">1. 源配置与分组</button>
            <button onclick="switchTab('page2')" class="tab-btn px-4 py-2 bg-gray-200 text-gray-600" id="btn-page2">2. 测速与导出</button>
            <button onclick="switchTab('page3')" class="tab-btn px-4 py-2 bg-gray-200 text-gray-600" id="btn-page3">3. 播放预览</button>
        </div>

        <div id="page1" class="tab-content active bg-white p-6 rounded shadow">
            <div class="mb-6">
                <h2 class="text-xl font-bold mb-2">输入直播源 (M3U 链接或内容)</h2>
                <div class="flex gap-2">
                    <textarea id="sourceInput" class="flex-1 h-24 p-2 border rounded" placeholder="在此粘贴 M3U 链接或内容..."></textarea>
                    <div class="w-64"><textarea id="groupTemplate" class="w-full h-24 p-2 border rounded text-xs">{ "央视": ["CCTV", "央视"], "卫视": ["卫视"], "高清": ["HD", "高清"], "4K": ["4K"] }</textarea></div>
                </div>
                <button id="parseBtn" onclick="parseSources()" class="mt-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">解析直播源</button>
            </div>
            <div class="grid grid-cols-12 gap-4 h-[450px]">
                <div class="col-span-3 border rounded bg-gray-50 flex flex-col overflow-hidden"><div class="bg-gray-200 p-2 font-bold">分组区</div><div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div></div>
                <div class="col-span-4 border rounded bg-gray-50 flex flex-col overflow-hidden"><div class="bg-gray-200 p-2 font-bold">频道区</div><div id="channelListEdit" class="flex-1 overflow-y-auto scroll-thin"></div></div>
                <div class="col-span-5 border rounded bg-gray-50 flex flex-col overflow-hidden"><div class="bg-gray-200 p-2 font-bold">源列表</div><div id="urlListEdit" class="flex-1 overflow-y-auto scroll-thin p-2 text-xs"></div></div>
            </div>
            <div class="mt-6 text-center"><button onclick="confirmAndGoToTest()" class="bg-green-600 text-white px-10 py-3 rounded-full font-bold hover:bg-green-700 shadow-lg">确认配置并进入测速</button></div>
        </div>

        <div id="page2" class="tab-content bg-white p-6 rounded shadow">
            <div id="networkInfo" class="mb-4 text-gray-700 font-bold p-2 bg-blue-50 rounded text-center">正在读取网络...</div>
            
            <div class="flex flex-wrap gap-4 mb-6 items-end justify-center">
                <div><label class="block text-xs text-gray-500 mb-1">保留 IPv4</label><input type="number" id="ipv4Count" value="5" class="border p-2 rounded w-24"></div>
                <div><label class="block text-xs text-gray-500 mb-1">保留 IPv6</label><input type="number" id="ipv6Count" value="5" class="border p-2 rounded w-24"></div>
                <button id="startTestBtn" onclick="startTesting()" class="bg-green-500 text-white px-8 py-2 rounded font-bold hover:bg-green-600">开始测速</button>
                <button id="stopTestBtn" onclick="stopTesting()" class="bg-red-500 text-white px-8 py-2 rounded font-bold hidden hover:bg-red-600">停止测速</button>
            </div>

            <div class="mb-2 flex justify-between text-sm font-medium">
                <span>测速进度</span>
                <span id="progressText">0 / 0</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div id="progressBar" class="bg-blue-600 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            
            <div id="testLog" class="h-64 overflow-y-auto bg-gray-900 text-gray-300 p-4 font-mono text-xs mb-6 rounded border-4 border-gray-800"></div>

            <div id="outputSection" class="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 links-disabled">
                <h3 class="text-lg font-bold mb-3 text-green-700 flex items-center">📦 测速完成，生成订阅链接：</h3>
                <div class="space-y-3" id="linksContainer">
                    <div class="text-sm text-gray-400 text-center py-4">测速完成后此处将自动显示链接</div>
                </div>
            </div>
        </div>

        <div id="page3" class="tab-content bg-white p-6 rounded shadow">
            <div class="max-w-4xl mx-auto flex flex-col gap-6">
                <div class="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative">
                    <video id="videoPlayer" controls class="w-full h-full"></video>
                    <div id="nowPlaying" class="absolute bottom-12 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm backdrop-blur-sm">未在播放</div>
                </div>
                
                <div class="border rounded-lg bg-gray-50 flex flex-col h-64 overflow-hidden">
                    <div class="bg-gray-200 p-2 text-sm font-bold">频道选择</div>
                    <div id="channelListPlayer" class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-1 p-1"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let rawGroups = [];
        let isTesting = false; // 测速状态开关
        let currentGroupIndex = -1;
        let currentChannelName = "";

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('bg-white', 'text-blue-600', 'border-t', 'border-l', 'border-r');
                el.classList.add('bg-gray-200', 'text-gray-600');
            });
            document.getElementById(tabId).classList.add('active');
            document.getElementById('btn-' + tabId).className = 'tab-btn px-4 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600';
        }

        // --- 逻辑函数 ---
        async function parseSources() {
            let text = document.getElementById('sourceInput').value.trim();
            const templates = JSON.parse(document.getElementById('groupTemplate').value);
            if (!text) return;
            if (text.startsWith('http')) {
                try { const res = await fetch(text); text = await res.text(); } 
                catch (e) { alert("CORS 限制，请粘贴文本内容"); return; }
            }
            const groupMap = {};
            text.split('\\n').forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF')) {
                    this.tempName = (line.match(/,(.*)$/) || [])[1];
                    this.tempG = (line.match(/group-title="(.*?)"/) || [])[1];
                } else if (line.startsWith('http')) {
                    let name = this.tempName || "未知";
                    let g = "其他";
                    for(let key in templates) if(templates[key].some(k => name.includes(k))) g = key;
                    if(g==="其他") g = this.tempG || "其他";
                    if(!groupMap[g]) groupMap[g] = {};
                    if(!groupMap[g][name]) groupMap[g][name] = { urls: [] };
                    groupMap[g][name].urls.push({ url: line, type: line.includes('[') || (line.match(/:/g)||[]).length>2 ? 'V6':'V4' });
                }
            });
            rawGroups = Object.keys(groupMap).map(k => ({ name: k, channels: groupMap[k] }));
            renderGroups();
        }

        function renderGroups() {
            const c = document.getElementById('groupList'); c.innerHTML = "";
            rawGroups.forEach((g, i) => {
                const d = document.createElement('div');
                d.className = \`p-2 border-b cursor-pointer hover:bg-blue-50 \${currentGroupIndex===i?'list-item-active':''}\`;
                d.innerHTML = \`<div class="flex justify-between"><span>\${g.name}</span><span class="text-xs text-gray-400">\${Object.keys(g.channels).length}</span></div>\`;
                d.onclick = () => { currentGroupIndex=i; renderGroups(); renderChannelsEdit(); };
                c.appendChild(d);
            });
        }

        function renderChannelsEdit() {
            const c = document.getElementById('channelListEdit'); c.innerHTML = "";
            const channels = rawGroups[currentGroupIndex].channels;
            for(let n in channels) {
                const d = document.createElement('div');
                d.className = "p-2 border-b cursor-pointer hover:bg-gray-100 text-sm";
                d.innerText = n;
                d.onclick = () => {
                    document.getElementById('urlListEdit').innerHTML = channels[n].urls.map(u => \`<div class="mb-1 p-1 bg-white border rounded"><span class="text-blue-500 font-bold">\${u.type}</span> \${u.url}</div>\`).join('');
                };
                c.appendChild(d);
            }
        }

        function confirmAndGoToTest() { switchTab('page2'); fetchNetworkInfo(); }

        async function fetchNetworkInfo() {
            const res = await fetch('/api/ip');
            const d = await res.json();
            document.getElementById('networkInfo').innerText = \`当前出口: \${d.ip} (\${d.country}) | \${d.asOrg || ''}\`;
        }

        // --- 测速核心控制 ---
        function stopTesting() {
            isTesting = false;
            document.getElementById('testLog').innerText += "\\n🛑 测速已由用户停止。";
        }

        async function startTesting() {
            isTesting = true;
            document.getElementById('startTestBtn').classList.add('hidden');
            document.getElementById('stopTestBtn').classList.remove('hidden');
            document.getElementById('outputSection').classList.add('links-disabled');
            
            const v4c = parseInt(document.getElementById('ipv4Count').value);
            const v6c = parseInt(document.getElementById('ipv6Count').value);
            const logDiv = document.getElementById('testLog');
            logDiv.innerHTML = "🚀 初始化任务队列...\\n";
            
            let tasks = [];
            rawGroups.forEach(g => {
                for(let n in g.channels) g.channels[n].urls.forEach(u => tasks.push({ g: g.name, n, u }));
            });

            const total = tasks.length;
            document.getElementById('progressText').innerText = \`0 / \${total}\`;

            for(let i=0; i<tasks.length; i++) {
                if(!isTesting) break; // 中断退出
                
                const task = tasks[i];
                const start = Date.now();
                try {
                    const ctrl = new AbortController();
                    const tid = setTimeout(() => ctrl.abort(), 2000);
                    await fetch(task.u.url, { mode: 'no-cors', signal: ctrl.signal });
                    clearTimeout(tid);
                    task.u.time = Date.now() - start;
                } catch(e) { task.u.time = 9999; }

                // 更新进度
                const done = i + 1;
                document.getElementById('progressText').innerText = \`\${done} / \${total}\`;
                document.getElementById('progressBar').style.width = \`\${(done/total)*100}%\`;
                logDiv.innerText += \`[\${task.u.time}ms] \${task.n}\\n\`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            if(isTesting) {
                logDiv.innerText += "\\n✅ 全部任务完成，正在同步 KV...\\n";
                // 过滤与保存逻辑
                const final = [];
                rawGroups.forEach(g => {
                    const chs = [];
                    for(let n in g.channels) {
                        const s = g.channels[n].urls.sort((a,b)=>a.time-b.time);
                        const f = [...s.filter(u=>u.type==='V4'&&u.time<9999).slice(0,v4c), ...s.filter(u=>u.type==='V6'&&u.time<9999).slice(0,v6c)];
                        if(f.length>0) chs.push({ name: n, urls: f });
                    }
                    if(chs.length>0) final.push({ name: g.name, channels: chs });
                });

                const res = await fetch('/api/save', { method:'POST', body: JSON.stringify(final) });
                const { id } = await res.json();
                renderLinks(id);
                renderPlayer(final);
                document.getElementById('outputSection').classList.remove('links-disabled');
            }

            document.getElementById('startTestBtn').classList.remove('hidden');
            document.getElementById('stopTestBtn').classList.add('hidden');
            isTesting = false;
        }

        function renderLinks(id) {
            const base = window.location.origin;
            const items = [
                { k:'M3U', u:\`\${base}/sub/\${id}.m3u\` },
                { k:'TXT', u:\`\${base}/sub/\${id}.txt\` },
                { k:'EPG', u:\`\${base}/epg/\${id}.xml\` }
            ];
            document.getElementById('linksContainer').innerHTML = items.map(i => \`
                <div class="flex items-center gap-2">
                    <span class="w-10 font-bold text-xs text-gray-500">\${i.k}:</span>
                    <input class="flex-1 border p-2 text-xs rounded bg-white" value="\${i.u}" readonly>
                    <button onclick="navigator.clipboard.writeText('\${i.u}'); alert('已复制')" class="bg-blue-600 text-white px-4 py-2 rounded text-xs">复制</button>
                </div>
            \`).join('');
        }

        function renderPlayer(data) {
            const c = document.getElementById('channelListPlayer'); c.innerHTML = "";
            data.forEach(g => {
                g.channels.forEach(ch => {
                    const d = document.createElement('div');
                    d.className = "p-2 bg-white border rounded shadow-sm text-xs hover:border-blue-500 cursor-pointer truncate";
                    d.innerText = ch.name;
                    d.onclick = () => {
                        const v = document.getElementById('videoPlayer');
                        document.getElementById('nowPlaying').innerText = "正在播放: " + ch.name;
                        if(Hls.isSupported()) { const h = new Hls(); h.loadSource(ch.urls[0].url); h.attachMedia(v); h.on(Hls.Events.MANIFEST_PARSED, ()=>v.play()); }
                        else { v.src = ch.urls[0].url; v.play(); }
                    };
                    c.appendChild(d);
                });
            });
        }
    </script>
</body>
</html>
\`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/ip') return new Response(JSON.stringify({ ip: request.headers.get('cf-connecting-ip'), country: request.headers.get('cf-ipcountry'), asOrg: request.cf?.asOrganization }));
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            await env.IPTV_DATA.put(id, await request.text(), { expirationTtl: 86400 * 30 });
            return new Response(JSON.stringify({ id }));
        }
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            const data = JSON.parse(await env.IPTV_DATA.get(id));
            if (url.pathname.endsWith('.m3u')) {
                let res = "#EXTM3U\\n";
                data.forEach(g => g.channels.forEach(ch => ch.urls.forEach(u => res += \`#EXTINF:-1 group-title="\${g.name}",\${ch.name}\\n\${u.url}\\n\`)));
                return new Response(res);
            }
            if (url.pathname.endsWith('.txt')) {
                let res = "";
                data.forEach(g => {
                    res += \`\\n\${g.name},#genre#\\n\`;
                    g.channels.forEach(ch => ch.urls.forEach(u => res += \`\${ch.name},\${u.url}\\n\`));
                });
                return new Response(res);
            }
        }
        return new Response(HTML_TEMPLATE, { headers: { "content-type": "text/html;charset=UTF-8" } });
    }
};
