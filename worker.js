/**
 * IPTV-Auto Worker 完整逻辑
 * 功能：提供管理界面、解析M3U、检测直播源速度、保存结果至KV、输出订阅链接
 */

// 将复杂的 HTML 界面拆分为两个常量，防止因字符串过长导致部分编辑器截断
const HTML_PART1 = `
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
        .scroll-thin::-webkit-scrollbar { width: 4px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
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
                    <div class="w-64">
                        <textarea id="groupTemplate" class="w-full h-24 p-2 border rounded text-xs">
{
  "央视": ["CCTV", "央视"],
  "卫视": ["卫视"],
  "高清": ["HD", "高清"],
  "4K": ["4K"]
}</textarea>
                        <p class="text-[10px] text-gray-400 mt-1">分组关键词过滤模板(JSON)</p>
                    </div>
                </div>
                <button id="parseBtn" onclick="parseSources()" class="mt-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">解析直播源</button>
            </div>
            
            <div class="grid grid-cols-12 gap-4 h-[450px]">
                <div class="col-span-3 border rounded bg-gray-50 flex flex-col overflow-hidden">
                    <div class="bg-gray-200 p-2 font-bold text-sm">分组列表</div>
                    <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
                </div>
                <div class="col-span-4 border rounded bg-gray-50 flex flex-col overflow-hidden">
                    <div class="bg-gray-200 p-2 font-bold text-sm">频道名</div>
                    <div id="channelListEdit" class="flex-1 overflow-y-auto scroll-thin"></div>
                </div>
                <div class="col-span-5 border rounded bg-gray-50 flex flex-col overflow-hidden">
                    <div class="bg-gray-200 p-2 font-bold text-sm">原始链接地址</div>
                    <div id="urlListEdit" class="flex-1 overflow-y-auto scroll-thin p-2 text-xs text-gray-600 italic"></div>
                </div>
            </div>
            <div class="mt-6 text-center">
                <button onclick="confirmAndGoToTest()" class="bg-green-600 text-white px-10 py-3 rounded-full font-bold hover:bg-green-700 shadow-lg">确认配置并进入测速</button>
            </div>
        </div>

        <div id="page2" class="tab-content bg-white p-6 rounded shadow">
            <div id="networkInfo" class="mb-4 text-gray-700 font-bold p-2 bg-blue-50 rounded text-center">正在读取网络...</div>
            <div class="flex flex-wrap gap-4 mb-6 items-end justify-center">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">每频道保留 IPv4 数量</label>
                    <input type="number" id="ipv4Count" value="5" class="border p-2 rounded w-24">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">每频道保留 IPv6 数量</label>
                    <input type="number" id="ipv6Count" value="5" class="border p-2 rounded w-24">
                </div>
                <button id="startTestBtn" onclick="startTesting()" class="bg-green-500 text-white px-8 py-2 rounded font-bold hover:bg-green-600">开始全自动测速</button>
                <button id="stopTestBtn" onclick="stopTesting()" class="bg-red-500 text-white px-8 py-2 rounded font-bold hidden hover:bg-red-600">停止测速</button>
            </div>

            <div class="mb-2 flex justify-between text-sm font-medium">
                <span>总体进度</span>
                <span id="progressText">0 / 0</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div id="progressBar" class="bg-blue-600 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            
            <div id="testLog" class="h-64 overflow-y-auto bg-gray-900 text-gray-300 p-4 font-mono text-xs mb-6 rounded border-4 border-gray-800"></div>

            <div id="outputSection" class="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 links-disabled">
                <h3 class="text-lg font-bold mb-3 text-green-700">📦 测速完成，生成永久订阅链接：</h3>
                <div class="space-y-3" id="linksContainer">
                    <div class="text-sm text-gray-400 text-center py-4">测速完成后此处将自动显示链接</div>
                </div>
            </div>
        </div>
`;

const HTML_PART2 = `
        <div id="page3" class="tab-content bg-white p-6 rounded shadow">
            <div class="max-w-4xl mx-auto flex flex-col gap-6 text-center">
                <div class="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative">
                    <video id="videoPlayer" controls class="w-full h-full"></video>
                    <div id="nowPlaying" class="absolute bottom-12 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm backdrop-blur-sm">未在播放</div>
                </div>
                <div class="border rounded-lg bg-gray-50 flex flex-col h-64 overflow-hidden">
                    <div class="bg-gray-200 p-2 text-sm font-bold">已通过测速的频道列表</div>
                    <div id="channelListPlayer" class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-1 p-1"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        /** 前端核心逻辑 **/
        let rawGroups = [];
        let isTesting = false;
        let currentGroupIndex = -1;

        // 切换标签页
        function switchTab(t) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('bg-white', 'text-blue-600', 'border-t', 'border-l', 'border-r');
                el.classList.add('bg-gray-200', 'text-gray-600');
            });
            document.getElementById(t).classList.add('active');
            document.getElementById('btn-' + t).className = 'tab-btn px-4 py-2 bg-white border-t border-l border-r rounded-t font-bold text-blue-600';
        }

        // 解析 M3U 源
        async function parseSources() {
            let text = document.getElementById('sourceInput').value.trim();
            const templates = JSON.parse(document.getElementById('groupTemplate').value);
            if (!text) return;

            // 如果输入的是链接，尝试抓取
            if (text.startsWith('http')) {
                try {
                    const res = await fetch(text);
                    text = await res.text();
                } catch (e) {
                    alert("由于跨域限制，无法直接读取链接。请手动将文件内容粘贴进输入框。");
                    return;
                }
            }

            const groupMap = {};
            let tempName, tempGroup;

            text.split('\\n').forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF')) {
                    tempName = (line.match(/,(.*)$/) || [])[1];
                    tempGroup = (line.match(/group-title="(.*?)"/) || [])[1];
                } else if (line.startsWith('http')) {
                    let name = tempName || "未知频道";
                    let finalGroup = "其他";
                    
                    // 根据模板匹配分组
                    for (let key in templates) {
                        if (templates[key].some(keyword => name.includes(keyword))) {
                            finalGroup = key;
                            break;
                        }
                    }
                    if (finalGroup === "其他" && tempGroup) finalGroup = tempGroup;

                    if (!groupMap[finalGroup]) groupMap[finalGroup] = {};
                    if (!groupMap[finalGroup][name]) groupMap[finalGroup][name] = { urls: [] };
                    
                    // 判断 IP 版本
                    const type = line.includes('[') || (line.match(/:/g) || []).length > 2 ? 'V6' : 'V4';
                    groupMap[finalGroup][name].urls.push({ url: line, type });
                }
            });

            rawGroups = Object.keys(groupMap).map(k => ({ name: k, channels: groupMap[k] }));
            renderGroups();
        }

        function renderGroups() {
            const container = document.getElementById('groupList');
            container.innerHTML = "";
            rawGroups.forEach((g, i) => {
                const div = document.createElement('div');
                div.className = \`p-2 border-b cursor-pointer hover:bg-blue-50 \${currentGroupIndex === i ? 'list-item-active' : ''}\`;
                div.innerHTML = \`<div class="flex justify-between"><span>\${g.name}</span><span class="text-xs text-gray-400">\${Object.keys(g.channels).length}</span></div>\`;
                div.onclick = () => {
                    currentGroupIndex = i;
                    renderGroups();
                    renderChannelsEdit();
                };
                container.appendChild(div);
            });
        }

        function renderChannelsEdit() {
            const container = document.getElementById('channelListEdit');
            container.innerHTML = "";
            const channels = rawGroups[currentGroupIndex].channels;
            for (let name in channels) {
                const div = document.createElement('div');
                div.className = "p-2 border-b cursor-pointer hover:bg-gray-100 text-sm";
                div.innerText = name;
                div.onclick = () => {
                    document.getElementById('urlListEdit').innerHTML = channels[name].urls.map(u => 
                        \`<div class="mb-1 p-1 bg-white border rounded shadow-sm"><span class="text-blue-500 font-bold">\${u.type}</span> \${u.url}</div>\`
                    ).join('');
                };
                container.appendChild(div);
            }
        }

        function confirmAndGoToTest() {
            switchTab('page2');
            fetchNetworkInfo();
        }

        async function fetchNetworkInfo() {
            const res = await fetch('/api/ip');
            const data = await res.json();
            document.getElementById('networkInfo').innerText = \`当前出口 IP: \${data.ip} (\${data.country})\`;
        }

        function stopTesting() {
            isTesting = false;
            document.getElementById('testLog').innerText += "\\n🛑 测速已由用户停止。";
        }

        async function startTesting() {
            isTesting = true;
            document.getElementById('startTestBtn').classList.add('hidden');
            document.getElementById('stopTestBtn').classList.remove('hidden');

            const v4Max = parseInt(document.getElementById('ipv4Count').value);
            const v6Max = parseInt(document.getElementById('ipv6Count').value);
            const logDiv = document.getElementById('testLog');
            logDiv.innerHTML = "🚀 任务启动中...\\n";

            let allTasks = [];
            rawGroups.forEach(g => {
                for (let n in g.channels) {
                    g.channels[n].urls.forEach(u => allTasks.push({ gName: g.name, chName: n, info: u }));
                }
            });

            const total = allTasks.length;
            for (let i = 0; i < allTasks.length; i++) {
                if (!isTesting) break;
                const task = allTasks[i];
                const start = Date.now();
                
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
                    await fetch(task.info.url, { mode: 'no-cors', signal: controller.signal });
                    clearTimeout(timeoutId);
                    task.info.time = Date.now() - start;
                } catch (e) {
                    task.info.time = 9999;
                }

                document.getElementById('progressText').innerText = \`\${i + 1} / \${total}\`;
                document.getElementById('progressBar').style.width = \`\${((i + 1) / total) * 100}%\`;
                logDiv.innerText += \`[\${task.info.time}ms] \${task.chName}\\n\`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            if (isTesting) {
                // 筛选最优结果
                const finalData = [];
                rawGroups.forEach(g => {
                    const activeChannels = [];
                    for (let n in g.channels) {
                        const sortedUrls = g.channels[n].urls.sort((a, b) => a.time - b.time);
                        const filtered = [
                            ...sortedUrls.filter(u => u.type === 'V4' && u.time < 9999).slice(0, v4Max),
                            ...sortedUrls.filter(u => u.type === 'V6' && u.time < 9999).slice(0, v6Max)
                        ];
                        if (filtered.length > 0) activeChannels.push({ name: n, urls: filtered });
                    }
                    if (activeChannels.length > 0) finalData.push({ name: g.name, channels: activeChannels });
                });

                // 保存至 KV
                const res = await fetch('/api/save', { method: 'POST', body: JSON.stringify(finalData) });
                const { id } = await res.json();
                renderLinks(id);
                renderPlayer(finalData);
                document.getElementById('outputSection').classList.remove('links-disabled');
            }

            document.getElementById('startTestBtn').classList.remove('hidden');
            document.getElementById('stopTestBtn').classList.add('hidden');
        }

        function renderLinks(id) {
            const base = window.location.origin;
            const items = [
                { label: 'M3U 订阅', url: \`\${base}/sub/\${id}.m3u\` },
                { label: 'TXT 订阅', url: \`\${base}/sub/\${id}.txt\` }
            ];
            document.getElementById('linksContainer').innerHTML = items.map(item => \`
                <div class="flex items-center gap-2">
                    <span class="w-20 font-bold text-xs text-gray-500">\${item.label}:</span>
                    <input class="flex-1 border p-2 text-xs rounded bg-white" value="\${item.url}" readonly>
                    <button onclick="navigator.clipboard.writeText('\${item.url}'); alert('复制成功！')" class="bg-blue-600 text-white px-4 py-2 rounded text-xs">复制</button>
                </div>
            \`).join('');
        }

        function renderPlayer(data) {
            const container = document.getElementById('channelListPlayer');
            container.innerHTML = "";
            data.forEach(g => {
                g.channels.forEach(ch => {
                    const div = document.createElement('div');
                    div.className = "p-2 bg-white border rounded shadow-sm text-xs hover:border-blue-500 cursor-pointer truncate";
                    div.innerText = ch.name;
                    div.onclick = () => {
                        const video = document.getElementById('videoPlayer');
                        document.getElementById('nowPlaying').innerText = "正在播放: " + ch.name;
                        const streamUrl = ch.urls[0].url;
                        if (Hls.isSupported()) {
                            const hls = new Hls();
                            hls.loadSource(streamUrl);
                            hls.attachMedia(video);
                            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
                        } else {
                            video.src = streamUrl;
                            video.play();
                        }
                    };
                    container.appendChild(div);
                });
            });
        }
    </script>
</body>
</html>
\`;

// 拼接 HTML
const HTML_TEMPLATE = HTML_PART1 + HTML_PART2;

/** Worker 后端路由处理 **/
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // API: 获取客户端 IP 信息
        if (url.pathname === '/api/ip') {
            return new Response(JSON.stringify({
                ip: request.headers.get('cf-connecting-ip'),
                country: request.headers.get('cf-ipcountry')
            }));
        }

        // API: 保存测速结果到 KV (有效期 30 天)
        if (url.pathname === '/api/save') {
            const id = Math.random().toString(36).substring(7);
            const content = await request.text();
            await env.IPTV_DATA.put(id, content, { expirationTtl: 2592000 });
            return new Response(JSON.stringify({ id }));
        }

        // API: 订阅导出 (支持 .m3u 和 .txt)
        if (url.pathname.startsWith('/sub/')) {
            const parts = url.pathname.split('/');
            const id = parts[2].split('.')[0];
            const rawData = await env.IPTV_DATA.get(id);
            if (!rawData) return new Response("订阅已失效或不存在", { status: 404 });

            const data = JSON.parse(rawData);
            
            if (url.pathname.endsWith('.m3u')) {
                let m3u = "#EXTM3U\\n";
                data.forEach(g => {
                    g.channels.forEach(ch => {
                        ch.urls.forEach(u => {
                            m3u += \`#EXTINF:-1 group-title="\${g.name}",\${ch.name}\\n\${u.url}\\n\`;
                        });
                    });
                });
                return new Response(m3u, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            }

            if (url.pathname.endsWith('.txt')) {
                let txt = "";
                data.forEach(g => {
                    txt += \`\\n\${g.name},#genre#\\n\`;
                    g.channels.forEach(ch => {
                        ch.urls.forEach(u => {
                            txt += \`\${ch.name},\${u.url}\\n\`;
                        });
                    });
                });
                return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            }
        }

        // 默认返回管理页面
        return new Response(HTML_TEMPLATE, {
            headers: { "content-type": "text/html;charset=UTF-8" }
        });
    }
};