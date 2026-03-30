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
            <h2 class="text-xl font-bold mb-2">输入直播源 (支持 TXT 格式: 频道名,URL)</h2>
            <textarea id="sourceInput" class="w-full h-48 p-2 border rounded mb-4" placeholder="CCTV-1,http://example.com/cctv1.m3u8\nCCTV-1 高清,http://example.com/cctv1hd.m3u8"></textarea>
            
            <h2 class="text-xl font-bold mb-2">分组模板定义 (JSON格式)</h2>
            <textarea id="groupTemplate" class="w-full h-24 p-2 border rounded mb-4">{
    "央视": ["CCTV", "央视"],
    "卫视": ["卫视"],
    "高清": ["HD", "高清", "1080"],
    "4K": ["4K"]
}</textarea>
            <button onclick="parseSources()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">解析并进入测速页面</button>
        </div>

        <div id="page2" class="tab-content bg-white p-6 rounded shadow">
            <div id="networkInfo" class="mb-4 text-gray-700 font-bold">正在获取网络信息...</div>
            <div class="mb-4">
                <label>保留IPv4数量: <input type="number" id="ipv4Count" value="3" class="border w-16 p-1"></label>
                <label class="ml-4">保留IPv6数量: <input type="number" id="ipv6Count" value="3" class="border w-16 p-1"></label>
                <button onclick="startTesting()" class="ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">开始测速 (测速受CORS影响仅供参考)</button>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div id="progressBar" class="bg-blue-600 h-4 rounded-full" style="width: 0%"></div>
            </div>
            <div id="testLog" class="h-48 overflow-y-auto bg-gray-900 text-green-400 p-2 font-mono text-sm mb-4">准备就绪...</div>

            <div id="outputSection" class="hidden border-t pt-4">
                <h3 class="text-lg font-bold mb-2">测速完成，生成订阅链接：</h3>
                <div class="space-y-2" id="linksContainer"></div>
            </div>
        </div>

        <div id="page3" class="tab-content bg-white p-6 rounded shadow flex gap-4">
            <div class="w-1/3 border-r pr-4 h-96 overflow-y-auto" id="channelList">
                <p class="text-gray-500">请先完成测速...</p>
            </div>
            <div class="w-2/3">
                <video id="videoPlayer" controls class="w-full bg-black rounded" style="height: 400px;"></video>
                <div id="nowPlaying" class="mt-2 text-lg font-bold"></div>
            </div>
        </div>
    </div>

    <script>
        let parsedChannels = {};
        let testedChannels = [];
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
            return "其他";
        }

        function isIPv6(url) {
            return url.includes('[') || /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:)/.test(url);
        }

        function parseSources() {
            const text = document.getElementById('sourceInput').value;
            const templates = JSON.parse(document.getElementById('groupTemplate').value);
            parsedChannels = {};
            
            const lines = text.split('\\n');
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const url = parts[1].trim();
                    const group = determineGroup(name, templates);
                    
                    if (!parsedChannels[name]) parsedChannels[name] = { group, urls: [] };
                    parsedChannels[name].urls.push({ url, type: isIPv6(url) ? 'v6' : 'v4', time: 9999 });
                }
            });
            alert('解析完成！检测到 ' + Object.keys(parsedChannels).length + ' 个独立频道。');
            switchTab('page2');
            fetchNetworkInfo();
        }

        async function fetchNetworkInfo() {
            try {
                const res = await fetch('/api/ip');
                const data = await res.json();
                document.getElementById('networkInfo').innerText = \`当前网络: IP \${data.ip} | 地区 \${data.country}\`;
            } catch (e) {
                document.getElementById('networkInfo').innerText = "无法获取网络信息";
            }
        }

        async function testSpeed(url) {
            const start = Date.now();
            try {
                // 使用 no-cors 避免浏览器跨域拦截，只测TTFB。不完美但浏览器端只能如此
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                await fetch(url, { mode: 'no-cors', signal: controller.signal });
                clearTimeout(timeoutId);
                return Date.now() - start;
            } catch (e) {
                return 9999;
            }
        }

        function log(msg) {
            const div = document.getElementById('testLog');
            div.innerHTML += \`<div>\${msg}</div>\`;
            div.scrollTop = div.scrollHeight;
        }

        async function startTesting() {
            const v4Count = parseInt(document.getElementById('ipv4Count').value);
            const v6Count = parseInt(document.getElementById('ipv6Count').value);
            
            let totalUrls = 0;
            let testedUrls = 0;
            for (let name in parsedChannels) totalUrls += parsedChannels[name].urls.length;

            log('开始测速...');
            for (let name in parsedChannels) {
                for (let i = 0; i < parsedChannels[name].urls.length; i++) {
                    const urlObj = parsedChannels[name].urls[i];
                    urlObj.time = await testSpeed(urlObj.url);
                    testedUrls++;
                    document.getElementById('progressBar').style.width = (testedUrls / totalUrls * 100) + '%';
                    log(\`[\${urlObj.time === 9999 ? '超时' : urlObj.time + 'ms'}] \${name} - \${urlObj.url}\`);
                }
                
                // 排序与筛选
                const sorted = parsedChannels[name].urls.sort((a, b) => a.time - b.time);
                const v4s = sorted.filter(u => u.type === 'v4' && u.time < 9999).slice(0, v4Count);
                const v6s = sorted.filter(u => u.type === 'v6' && u.time < 9999).slice(0, v6Count);
                parsedChannels[name].urls = [...v4s, ...v6s];
            }

            log('测速并过滤完成！正在上传保存...');
            
            // 剔除没有可用源的频道
            const finalChannels = [];
            for (let name in parsedChannels) {
                if (parsedChannels[name].urls.length > 0) {
                    finalChannels.push({ name, group: parsedChannels[name].group, urls: parsedChannels[name].urls });
                }
            }

            try {
                const res = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalChannels)
                });
                const data = await res.json();
                listId = data.id;
                
                showLinks(listId);
                renderPlayerList(finalChannels);
            } catch (e) {
                log('上传保存失败: ' + e.message);
            }
        }

        function showLinks(id) {
            const baseUrl = window.location.origin;
            const formats = [
                { name: 'M3U 订阅', path: \`/sub/\${id}.m3u\` },
                { name: 'TXT 订阅', path: \`/sub/\${id}.txt\` },
                { name: 'JSON 数据', path: \`/sub/\${id}.json\` },
                { name: 'EPG 节目单', path: \`/epg/\${id}.xml\` }
            ];

            const container = document.getElementById('linksContainer');
            container.innerHTML = '';
            formats.forEach(f => {
                const fullUrl = baseUrl + f.path;
                container.innerHTML += \`
                    <div class="flex items-center space-x-2">
                        <span class="w-24 font-bold text-gray-700">\${f.name}:</span>
                        <input type="text" readonly value="\${fullUrl}" class="flex-1 border p-1 rounded bg-gray-50 text-sm">
                        <button onclick="navigator.clipboard.writeText('\${fullUrl}'); alert('已复制')" class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">复制</button>
                    </div>
                \`;
            });
            document.getElementById('outputSection').classList.remove('hidden');
        }

        // --- HLS Player Logic ---
        function renderPlayerList(channels) {
            const container = document.getElementById('channelList');
            container.innerHTML = '';
            
            const groups = {};
            channels.forEach(ch => {
                if (!groups[ch.group]) groups[ch.group] = [];
                groups[ch.group].push(ch);
            });

            for (let group in groups) {
                const groupDiv = document.createElement('div');
                groupDiv.innerHTML = \`<h3 class="font-bold bg-gray-200 p-1 mt-2">\${group}</h3>\`;
                groups[group].forEach(ch => {
                    const chBtn = document.createElement('button');
                    chBtn.className = "w-full text-left p-1 hover:bg-blue-100 text-sm border-b";
                    chBtn.innerText = ch.name;
                    chBtn.onclick = () => playStream(ch.name, ch.urls[0].url);
                    groupDiv.appendChild(chBtn);
                });
                container.appendChild(groupDiv);
            }
        }

        function playStream(name, url) {
            document.getElementById('nowPlaying').innerText = "正在播放: " + name;
            const video = document.getElementById('videoPlayer');
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    video.play();
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.addEventListener('loadedmetadata', function() {
                    video.play();
                });
            }
        }
    </script>
</body>
</html>
`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 跨域处理
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        };
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // 1. 获取客户端IP信息
        if (url.pathname === '/api/ip') {
            const ip = request.headers.get('cf-connecting-ip') || 'Unknown';
            const country = request.headers.get('cf-ipcountry') || 'Unknown';
            return new Response(JSON.stringify({ ip, country }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 2. 接收测速结果并存入 KV
        if (url.pathname === '/api/save' && request.method === 'POST') {
            try {
                const data = await request.json();
                // 简单生成一个随机ID，如果你希望每个用户有固定ID，可以基于IP生成 hash
                const id = Math.random().toString(36).substring(2, 10);
                // 确保存入 KV
                if (env.IPTV_DATA) {
                    await env.IPTV_DATA.put(id, JSON.stringify(data));
                } else {
                    return new Response(JSON.stringify({ error: "KV 未绑定，无法保存状态" }), { status: 500, headers: corsHeaders });
                }
                return new Response(JSON.stringify({ id, success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
            } catch (e) {
                return new Response(e.message, { status: 500, headers: corsHeaders });
            }
        }

        // 3. 动态输出不同格式的订阅文件
        if (url.pathname.startsWith('/sub/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            const ext = url.pathname.split('.')[1];
            
            if (!env.IPTV_DATA) return new Response("KV 数据库未配置", { status: 500 });
            
            const rawData = await env.IPTV_DATA.get(id);
            if (!rawData) return new Response("找不到该播放列表", { status: 404 });
            
            const channels = JSON.parse(rawData);

            if (ext === 'json') {
                return new Response(rawData, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } 
            else if (ext === 'txt') {
                let txtContent = "";
                let currentGroup = "";
                channels.forEach(ch => {
                    if (ch.group !== currentGroup) {
                        txtContent += `\n${ch.group},#genre#\n`;
                        currentGroup = ch.group;
                    }
                    ch.urls.forEach(u => {
                        txtContent += `${ch.name},${u.url}\n`;
                    });
                });
                return new Response(txtContent.trim(), { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });
            } 
            else if (ext === 'm3u') {
                let m3uContent = "#EXTM3U x-tvg-url=\"\"\n";
                channels.forEach(ch => {
                    ch.urls.forEach(u => {
                        m3uContent += `#EXTINF:-1 tvg-name="${ch.name}" group-title="${ch.group}",${ch.name}\n${u.url}\n`;
                    });
                });
                return new Response(m3uContent, { headers: { ...corsHeaders, "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8" } });
            }
        }

        // 4. 简易 EPG 输出 (XMLTV 格式结构化假数据，因无真实EPG源，提供格式框架)
        if (url.pathname.startsWith('/epg/')) {
            const id = url.pathname.split('/')[2].split('.')[0];
            if (!env.IPTV_DATA) return new Response("KV 数据库未配置", { status: 500 });
            const rawData = await env.IPTV_DATA.get(id);
            if (!rawData) return new Response("找不到数据", { status: 404 });
            
            const channels = JSON.parse(rawData);
            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv date="${new Date().toISOString()}">\n`;
            
            channels.forEach(ch => {
                xml += `  <channel id="${ch.name}">\n    <display-name>${ch.name}</display-name>\n  </channel>\n`;
            });
            // 填充一个默认的占位节目单
            channels.forEach(ch => {
                xml += `  <programme start="${new Date().toISOString().replace(/[-:T]/g,'').substring(0,14)} +0000" stop="20990101000000 +0000" channel="${ch.name}">\n    <title>精彩节目</title>\n  </programme>\n`;
            });
            xml += `</tv>`;

            return new Response(xml, { headers: { ...corsHeaders, "Content-Type": "text/xml; charset=utf-8" } });
        }

        // 5. 默认返回前端 HTML
        return new Response(HTML_TEMPLATE, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    }
};
