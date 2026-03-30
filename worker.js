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
        .log-v4 { color: #60a5fa; }
        .log-v6 { color: #f472b6; }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="max-w-5xl mx-auto p-4">
        <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">IPTV-Auto 自动检测与管理</h1>
        
        <div class="flex border-b mb-4">
            <button onclick="switchTab('page1')" class="tab-btn px-4 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600" id="btn-page1">1. 源配置与分组</button>
            <button onclick="switchTab('page2')" class="tab-btn px-4 py-2 bg-gray-200 text-gray-600" id="btn-page2">2. 测速与导出</button>
            <button onclick="switchTab('page3')" class="tab-btn px-4 py-2 bg-gray-200 text-gray-600" id="btn-page3">3. 播放预览</button>
        </div>

        <div id="page1" class="tab-content active bg-white p-6 rounded shadow">
            <h2 class="text-xl font-bold mb-2">输入直播源 (支持 M3U 链接、M3U 内容或 TXT 格式)</h2>
            <textarea id="sourceInput" class="w-full h-48 p-2 border rounded mb-4" placeholder="可以直接粘贴 M3U 链接，例如：https://example.com/live.m3u\n或者粘贴 M3U/TXT 内容..."></textarea>
            
            <h2 class="text-xl font-bold mb-2">分组模板定义 (JSON格式)</h2>
            <textarea id="groupTemplate" class="w-full h-24 p-2 border rounded mb-4">{
    "央视": ["CCTV", "央视"],
    "卫视": ["卫视"],
    "高清": ["HD", "高清", "1080"],
    "4K": ["4K", "超高清"]
}</textarea>
            <button id="parseBtn" onclick="parseSources()" class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 flex items-center justify-center">
                解析并进入测速页面
            </button>
            <p class="mt-2 text-sm text-gray-500 italic">提示：如果粘贴 URL 解析失败，请尝试先在浏览器打开链接，全选内容后粘贴到上方框内。</p>
        </div>

        <div id="page2" class="tab-content bg-white p-6 rounded shadow">
            <div id="networkInfo" class="mb-4 text-gray-700 font-bold p-2 bg-blue-50 rounded">正在获取网络信息...</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div>
                    <label class="block text-sm">保留 IPv4 数量:</label>
                    <input type="number" id="ipv4Count" value="3" class="border w-full p-2 rounded">
                </div>
                <div>
                    <label class="block text-sm">保留 IPv6 数量:</label>
                    <input type="number" id="ipv6Count" value="3" class="border w-full p-2 rounded">
                </div>
                <button onclick="startTesting()" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 h-10">开始测速</button>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div id="progressBar" class="bg-blue-600 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div id="testLog" class="h-64 overflow-y-auto bg-gray-900 text-gray-300 p-4 font-mono text-xs mb-4 rounded">准备就绪...</div>

            <div id="outputSection" class="hidden border-t pt-4">
                <h3 class="text-lg font-bold mb-2 text-green-600">🎉 测速完成，生成订阅链接：</h3>
                <div class="space-y-3" id="linksContainer"></div>
            </div>
        </div>

        <div id="page3" class="tab-content bg-white p-6 rounded shadow flex flex-col md:flex-row gap-4">
            <div class="w-full md:w-1/3 border rounded h-96 overflow-y-auto bg-gray-50" id="channelList">
                <p class="p-4 text-gray-500 text-center">请先完成测速并保存...</p>
            </div>
            <div class="w-full md:w-2/3">
                <div class="aspect-video bg-black rounded relative overflow-hidden">
                    <video id="videoPlayer" controls class="w-full h-full"></video>
                </div>
                <div id="nowPlaying" class="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 font-bold">尚未播放</div>
            </div>
        </div>
    </div>

    <script>
        let parsedChannels = {};
        let listId = 'default';

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('bg-white', 'text-blue-600', 'border-t', 'border-l', 'border-r');
                el.classList.add('bg-gray-200', 'text-gray-600');
            });
            document.getElementById(tabId).classList.add('active');
            document.getElementById('btn-' + tabId).classList.remove('bg-gray-200', 'text-gray-600');
            document.getElementById('btn-' + tabId).classList.add('bg-white', 'text-blue-600', 'border-t', 'border-l', 'border-r');
        }

        function determineGroup(name, templates) {
            for (let group in templates) {
                if (templates[group].some(keyword => name.toUpperCase().includes(keyword.toUpperCase()))) {
                    return group;
                }
            }
            return null;
        }

        function isIPv6(url) {
            return url.includes('[') || (url.match(/:/g) || []).length > 2;
        }

        async function parseSources() {
            const btn = document.getElementById('parseBtn');
            let text = document.getElementById('sourceInput').value.trim();
            const templates = JSON.parse(document.getElementById('groupTemplate').value);
            
            if (!text) return alert("请输入内容或链接");

            btn.disabled = true;
            btn.innerText = "正在获取/解析...";

            // 如果是 URL
            if (text.startsWith('http')) {
                try {
                    const res = await fetch(text);
                    if (!res.ok) throw new Error("网络请求失败");
                    text = await res.text();
                } catch (e) {
                    alert("无法直接读取链接。原因可能是跨域(CORS)限制。\\n请在浏览器打开该链接，复制全部内容并粘贴回此处再试。");
                    btn.disabled = false;
                    btn.innerText = "解析并进入测速页面";
                    return;
                }
            }

            parsedChannels = {};
            const lines = text.split('\\n');
            let tempName = null;
            let tempGroup = null;

            lines.forEach(line => {
                line = line.trim();
                if (!line) return;

                // M3U 格式解析
                if (line.startsWith('#EXTINF')) {
                    const groupMatch = line.match(/group-title="(.*?)"/);
                    const nameMatch = line.match(/,(.*)$/);
                    tempGroup = groupMatch ? groupMatch[1] : null;
                    tempName = nameMatch ? nameMatch[1].trim() : null;
                } else if (line.startsWith('http')) {
                    const url = line;
                    const name = tempName || "未知频道";
                    const group = determineGroup(name, templates) || tempGroup || "其他";
                    
                    if (!parsedChannels[name]) parsedChannels[name] = { group, urls: [] };
                    parsedChannels[name].urls.push({ url, type: isIPv6(url) ? 'v6' : 'v4', time: 9999 });
                    tempName = null; // 重置
                } 
                // TXT 格式解析
                else if (line.includes(',') && !line.startsWith('#')) {
                    const [name, url] = line.split(',').map(s => s.trim());
                    if (name && url) {
                        const group = determineGroup(name, templates) || "其他";
                        if (!parsedChannels[name]) parsedChannels[name] = { group, urls: [] };
                        parsedChannels[name].urls.push({ url, type: isIPv6(url) ? 'v6' : 'v4', time: 9999 });
                    }
                }
            });

            const count = Object.keys(parsedChannels).length;
            btn.disabled = false;
            btn.innerText = "解析并进入测速页面";

            if (count > 0) {
                alert(\`解析成功！共识别 \${count} 个频道。\`);
                switchTab('page2');
                fetchNetworkInfo();
            } else {
                alert("未识别到有效频道，请检查输入格式。");
            }
        }

        async function fetchNetworkInfo() {
            try {
                const res = await fetch('/api/ip');
                const data = await res.json();
                document.getElementById('networkInfo').innerText = \`当前网络: \${data.ip} (\${data.country}) | ISP: \${data.asOrg || '未知'}\`;
            } catch (e) {
                document.getElementById('networkInfo').innerText = "获取网络信息失败";
            }
        }

        async function testSpeed(url) {
            const start = Date.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5秒超时
                await fetch(url, { mode: 'no-cors', signal: controller.signal });
                clearTimeout(timeoutId);
                return Date.now() - start;
            } catch (e) {
                return 9999;
            }
        }

        function log(msg, type) {
            const div = document.getElementById('testLog');
            const span = document.createElement('div');
            if (type) span.className = 'log-' + type;
            span.innerText = msg;
            div.appendChild(span);
            div.scrollTop = div.scrollHeight;
        }

        async function startTesting() {
            const v4Count = parseInt(document.getElementById('ipv4Count').value);
            const v6Count = parseInt(document.getElementById('ipv6Count').value);
            document.getElementById('testLog').innerHTML = "";
            log('🚀 开始全量测速...');

            let total = 0;
            for (let k in parsedChannels) total += parsedChannels[k].urls.length;
            let current = 0;

            for (let name in parsedChannels) {
                for (let urlObj of parsedChannels[name].urls) {
                    urlObj.time = await testSpeed(urlObj.url);
                    current++;
                    document.getElementById('progressBar').style.width = (current / total * 100) + '%';
                    log(\`[\${urlObj.time === 9999 ? '超时' : urlObj.time + 'ms'}] \${name} (\${urlObj.type.toUpperCase()})\`, urlObj.type);
                }
                
                // 排序与筛选
                const sorted = parsedChannels[name].urls.sort((a, b) => a.time - b.time);
                const v4s = sorted.filter(u => u.type === 'v4' && u.time < 9999).slice(0, v4Count);
                const v6s = sorted.filter(u => u.type === 'v6' && u.time < 9999).slice(0, v6Count);
                parsedChannels[name].urls = [...v4s, ...v6s];
            }

            log('✅ 测速完成，正在生成结果...');
            const finalData = [];
            for (let name in parsedChannels) {
                if (parsedChannels[name].urls.length > 0) {
                    finalData.push({ name, group: parsedChannels[name].group, urls: parsedChannels[name].urls });
                }
            }

            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            const result = await res.json();
            listId = result.id;
            showLinks(listId);
            renderPlayerList(finalData);
        }

        function showLinks(id) {
            const baseUrl = window.location.origin;
            const formats = [
                { name: 'M3U', path: \`/sub/\${id}.m3u\` },
                { name: 'TXT', path: \`/sub/\${id}.txt\` },
                { name: 'EPG', path: \`/epg/\${id}.xml\` }
            ];
            const container = document.getElementById('linksContainer');
            container.innerHTML = '';
            formats.forEach(f => {
                const fullUrl = baseUrl + f.path;
                container.innerHTML += \`
                    <div class="flex items-center space-x-2">
                        <span class="w-12 font-bold">\${f.name}:</span>
                        <input type="text" readonly value="\${fullUrl}" class="flex-1 border p-1 rounded bg-gray-50 text-xs">
                        <button onclick="navigator.clipboard.writeText('\${fullUrl}'); alert('复制成功')" class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200">复制</button>
                    </div>\`;
            });
            document.getElementById('outputSection').classList.remove('hidden');
        }

        function renderPlayerList(channels) {
            const container = document.getElementById('channelList');
            container.innerHTML = '';
            const groups = {};
            channels.forEach(ch => {
                if (!groups[ch.group]) groups[ch.group] = [];
                groups[ch.group].push(ch);
            });
            for (let g in groups) {
                const gTitle = document.createElement('div');
                gTitle.className = "bg-gray-200 px-3 py-1 text-sm font-bold sticky top-0";
                gTitle.innerText = g;
                container.appendChild(gTitle);
                groups[g].forEach(ch => {
                    const item = document.createElement('div');
                    item.className = "p-2 border-b hover:bg-blue-50 cursor-pointer text-sm transition";
                    item.innerText = ch.name;
                    item.onclick = () => play(ch.name, ch.urls[0].url);
                    container.appendChild(item);
                });
            }
        }

        let hls = null;
        function play(name, url) {
            document.getElementById('nowPlaying').innerText = "▶️ 正在播放: " + name;
            const video = document.getElementById('videoPlayer');
            if (hls) hls.destroy();
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.play();
            }
        }
    </script>
</body>
</html>
`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // API: 获取 IP 信息
        if (url.pathname === '/api/ip') {
            return new Response(JSON.stringify({
                ip: request.headers.get('cf-connecting-ip'),
                country: request.headers.get('cf-ipcountry'),
                asOrg: request.cf ? request.cf.asOrganization : null
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // API: 保存数据
        if (url.pathname === '/api/save' && request.method === 'POST') {
            const data = await request.json();
            const id = Math.random().toString(36).substring(2, 10);
            if (env.IPTV_DATA) {
                await env.IPTV_DATA.put(id, JSON.stringify(data), { expirationTtl: 86400 * 30 }); // 默认存30天
                return new Response(JSON.stringify({ id }), { headers: corsHeaders });
            }
            return new Response("KV Not Bound", { status: 500 });
        }

        // API: 订阅输出
        if (url.pathname.startsWith('/sub/') || url.pathname.startsWith('/epg/')) {
            const isEpg = url.pathname.startsWith('/epg/');
            const parts = url.pathname.split('/');
            const filename = parts[parts.length - 1];
            const id = filename.split('.')[0];
            const ext = filename.split('.')[1];

            const raw = await env.IPTV_DATA.get(id);
            if (!raw) return new Response("Not Found", { status: 404 });
            const data = JSON.parse(raw);

            if (isEpg) {
                let xml = `<?xml version="1.0" encoding="UTF-8"?><tv><channel id="1"><display-name>Live</display-name></channel></tv>`;
                return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
            }

            if (ext === 'm3u') {
                let m3u = "#EXTM3U\n";
                data.forEach(ch => {
                    ch.urls.forEach(u => {
                        m3u += `#EXTINF:-1 group-title="${ch.group}",${ch.name}\n${u.url}\n`;
                    });
                });
                return new Response(m3u, { headers: { "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8" } });
            }
            
            if (ext === 'txt') {
                let txt = "";
                data.forEach(ch => {
                    ch.urls.forEach(u => { txt += `${ch.name},${u.url}\n`; });
                });
                return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            }
        }

        return new Response(HTML_TEMPLATE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
};
