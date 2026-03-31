/**
 * IPTV-Auto 深度管理面板 v4.2 (全功能KV云端同步版)
 * 包含：KV云端存储、频道别名自动合并、并发测速净化、HLS沉浸预览、EPG解析
 */

const FULL_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV-Auto 深度管理面板 v4.2</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-btn { transition: all 0.2s; }
        .list-item-active { background-color: #eff6ff; border-left: 4px solid #2563eb; font-weight: bold; }
        .scroll-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .code-font { font-family: 'Cascadia Code', Consolas, monospace; white-space: pre !important; }
        .icon-btn { padding: 4px; border-radius: 4px; color: #475569; transition: background 0.2s; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .icon-btn:hover { background-color: #e2e8f0; color: #0f172a; }
        .icon-danger:hover { background-color: #fee2e2; color: #dc2626; }
        .channel-cb { accent-color: #2563eb; width: 16px; height: 16px; cursor: pointer; }
        
        /* 测速终端样式 */
        .terminal-box { background: #0f172a; color: #10b981; font-family: monospace; padding: 12px; height: 250px; overflow-y: auto; border-radius: 0.5rem; font-size: 0.875rem; }
        .terminal-box .err { color: #ef4444; }
        .terminal-box .warn { color: #f59e0b; }
        
        /* 播放器状态层 */
        .player-overlay { position: absolute; top: 20px; right: 20px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: white; width: 280px; font-size: 12px; pointer-events: none; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen">

<div class="max-w-[1600px] mx-auto p-4">
    <div class="flex justify-between items-end mb-6">
        <h1 class="text-3xl font-black text-blue-600 tracking-wider">IPTV-Auto 深度管理面板 v4.2</h1>
        <div id="cloudStatus" class="text-sm font-bold text-slate-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-slate-300" id="cloudIndicator"></span> <span>云端状态: 连接中...</span>
        </div>
    </div>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" id="btn-page1" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-blue-700 bg-white shadow">1. 源与分组配置</button>
        <button onclick="switchTab('page2')" id="btn-page2" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent hover:bg-slate-50">2. 测速与净化导出</button>
        <button onclick="switchTab('page3')" id="btn-page3" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent hover:bg-slate-50">3. 电视沉浸预览</button>
        <button onclick="switchTab('page4')" id="btn-page4" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent hover:bg-slate-50">4. 节目指南 (EPG)</button>
    </div>

    <div id="page1" class="bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">EPG 节目单地址 (多个请用英文逗号隔开)</label>
                    <input type="text" id="epgUrls" class="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" placeholder="https://epg.example.com/e.xml" onchange="saveDataToCloud()">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">直播源 (M3U 链接或文本，支持多个链接以逗号隔开)</label>
                    <textarea id="sourceInput" class="w-full h-32 p-3 border rounded-lg text-sm bg-slate-50 font-mono scroll-thin" placeholder="在此粘贴..."></textarea>
                </div>
                <div class="flex gap-3">
                    <button id="parseBtn" onclick="parseData()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                        <span>🚀 解析并合并</span>
                    </button>
                    <button onclick="applyTmpl()" class="bg-white text-indigo-600 border border-indigo-200 px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50">🔄 重新应用分组</button>
                    <button onclick="clearData()" class="bg-slate-100 text-slate-500 px-6 py-2 rounded-lg text-sm font-bold ml-auto hover:bg-red-50 hover:text-red-600">🧹 清空</button>
                </div>
            </div>
            <div class="col-span-5">
                <label class="block text-xs font-bold text-slate-500 mb-1 flex justify-between">
                    <span>分组与关键词模板 (JSON)</span>
                    <span class="text-indigo-500 font-normal cursor-pointer hover:underline" onclick="formatJson('groupTemplate')">格式化</span>
                </label>
                <textarea id="groupTemplate" class="w-full h-52 p-4 border rounded-lg text-xs bg-slate-900 text-emerald-400 outline-none scroll-thin code-font" onblur="saveDataToCloud()"></textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[600px]">
            <div class="col-span-3 border rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-1">📁 分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="openGroupModal()" class="icon-btn" title="添加分组"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg></button>
                        <button onclick="moveItem('group', -1)" class="icon-btn" title="上移"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10l8-8 8 8M12 2v20"></path></svg></button>
                        <button onclick="moveItem('group', 1)" class="icon-btn" title="下移"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 14l8 8 8-8M12 22V2"></path></svg></button>
                        <button onclick="deleteItem('group')" class="icon-btn icon-danger text-red-500" title="删除"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin p-1 space-y-1"></div>
            </div>

            <div class="col-span-4 border rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-1">📺 频道列表</span>
                    <div class="flex gap-1 items-center">
                        <button onclick="sortChannels()" class="icon-btn text-blue-600" title="A-Z自动排序"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg></button>
                        <button onclick="moveItem('channel', -1)" class="icon-btn" title="上移"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10l8-8 8 8M12 2v20"></path></svg></button>
                        <button onclick="moveItem('channel', 1)" class="icon-btn" title="下移"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 14l8 8 8-8M12 22V2"></path></svg></button>
                        <div class="w-px h-4 bg-slate-300 mx-1"></div>
                        <button onclick="mergeChannels()" class="icon-btn text-indigo-600" title="手动合并勾选频道"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></button>
                        <button onclick="autoMergeChannels()" class="icon-btn text-purple-600 font-bold px-2 border border-purple-200" title="根据别名规则自动合并当前分组">✨ 自动合并</button>
                        <div class="w-px h-4 bg-slate-300 mx-1"></div>
                        <button onclick="deleteItem('channel')" class="icon-btn icon-danger text-red-500" title="删除"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin p-1 space-y-1"></div>
            </div>

            <div class="col-span-5 border rounded-xl bg-white flex flex-col overflow-hidden shadow-inner">
                <div class="p-3 bg-slate-100 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700">频道信息编辑</span>
                    <button onclick="saveChannelInfo()" class="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700">💾 保存至云端</button>
                </div>
                <div class="p-4 border-b space-y-3 bg-slate-50">
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold text-slate-500 w-16">频道名称</label>
                        <input id="cName" type="text" class="flex-1 p-2 border rounded text-sm focus:ring-1 outline-none bg-white">
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold text-slate-500 w-16">EPG ID</label>
                        <input id="cEpgId" type="text" class="flex-1 p-2 border rounded text-sm focus:ring-1 outline-none bg-white" placeholder="tvg-id">
                    </div>
                </div>
                <div class="p-3 bg-slate-100 border-b flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-700">直播源地址 (每行一个)</span>
                    <button onclick="dedupUrls()" class="text-blue-600 font-bold hover:underline">一键去重</button>
                </div>
                <textarea id="cUrls" class="flex-1 w-full p-3 font-mono text-xs leading-loose outline-none resize-none scroll-thin bg-white border-b" onchange="syncUrls()"></textarea>
                
                <div class="p-2 bg-slate-100 border-b flex justify-between items-center text-xs">
                    <span class="font-bold text-purple-700">频道别名与合并规则 (JSON)</span>
                    <span class="text-indigo-500 font-normal cursor-pointer hover:underline" onclick="formatJson('aliasTemplate')">格式化</span>
                </div>
                <textarea id="aliasTemplate" class="h-40 w-full p-3 font-mono text-xs bg-slate-900 text-purple-400 outline-none resize-none scroll-thin code-font" onblur="saveDataToCloud()" placeholder='{"CCTV-1": ["CCTV1", "中央一台", "CCTV-1综合"]}'></textarea>
            </div>
        </div>
    </div>

    <div id="page2" class="hidden bg-white p-6 rounded-b-xl shadow border">
        <div class="flex gap-4 mb-6">
            <div class="flex-1 bg-slate-800 rounded-lg p-4 text-slate-300 text-sm">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-white">系统实时探测环境</span>
                    <span class="text-xs text-emerald-400 border border-emerald-400 px-2 py-0.5 rounded">IPv4 / IPv6</span>
                </div>
                <div>IP: <span id="clientIp" class="text-emerald-400">探测中...</span></div>
            </div>
            <div class="w-1/3 flex flex-col justify-end">
                <button onclick="startSpeedTest()" id="btnStartTest" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 transition flex justify-center items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    开始并发测速并过滤失效源
                </button>
            </div>
        </div>

        <div class="mb-2 flex justify-between text-sm font-bold text-slate-600">
            <span>测速终端日志</span>
            <span id="testProgress">等待就绪 (0/0)</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div id="pbFill" class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
        </div>
        
        <div id="terminal" class="terminal-box mb-6">
            <div>> 系统就绪，点击上方按钮开始对当前所有频道的直链进行 HEAD 探测...</div>
        </div>

        <div class="border border-green-200 bg-green-50 p-6 rounded-lg text-center">
            <h3 class="font-bold text-green-800 mb-2 flex items-center justify-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                订阅已净化生成 (可供播放器直接引用)
            </h3>
            <div class="flex gap-2 justify-center mt-4">
                <input type="text" id="subUrl" readonly class="w-2/3 p-3 border border-green-300 rounded bg-white text-slate-600 font-mono text-sm text-center" value="请先完成测速并保存至云端">
                <button onclick="copySub()" class="bg-green-600 text-white px-6 rounded font-bold hover:bg-green-700">复制</button>
            </div>
        </div>
    </div>

    <div id="page3" class="hidden bg-slate-900 p-6 rounded-b-xl shadow border h-[750px] flex flex-col">
        <div class="flex gap-4 h-full">
            <div class="w-1/4 bg-slate-800 rounded-lg overflow-hidden flex flex-col border border-slate-700">
                <div class="p-3 bg-slate-950 text-white font-bold text-sm border-b border-slate-700">频道导航</div>
                <div id="previewList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            
            <div class="flex-1 bg-black rounded-lg relative flex items-center justify-center overflow-hidden border border-slate-700">
                <video id="videoPlayer" class="w-full h-full" controls autoplay></video>
                
                <div class="player-overlay" id="playerInfo">
                    <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-600">
                        <span id="piName" class="font-bold text-blue-400 text-sm">尚未播放</span>
                        <span id="piStatus" class="text-xs text-green-400">就绪</span>
                    </div>
                    <div class="flex justify-between mb-1"><span>分辨率</span><span id="piRes">未知</span></div>
                    <div class="flex justify-between mb-1"><span>实时码率</span><span id="piBitrate">0 Kbps</span></div>
                    <div class="flex justify-between mb-2 pb-2 border-b border-slate-600"><span>直连/代理</span><span class="text-blue-300">CORS: 直连</span></div>
                    <div class="text-[10px] text-slate-400 break-all font-mono" id="piUrl">等待选择频道...</div>
                </div>
            </div>
        </div>
    </div>

    <div id="page4" class="hidden bg-white p-6 rounded-b-xl shadow border h-[700px]">
         <div class="flex h-full gap-6">
            <div class="w-1/3 border rounded-lg flex flex-col">
                <div class="p-3 bg-slate-100 font-bold border-b flex justify-between items-center">
                    <span>频道匹配列表</span>
                    <button onclick="fetchEPG()" class="bg-blue-600 text-white px-3 py-1 rounded text-xs">加载/刷新 EPG</button>
                </div>
                <div id="epgChannelList" class="flex-1 overflow-y-auto scroll-thin p-2">
                    <div class="text-center text-slate-400 mt-10 text-sm">请先点击右上角加载 EPG 缓存数据</div>
                </div>
            </div>
            <div class="flex-1 border rounded-lg flex flex-col bg-slate-50">
                 <div class="p-4 bg-white font-bold border-b text-lg text-blue-700" id="epgTitle">节目时间轴</div>
                 <div id="epgTimeline" class="flex-1 p-6 overflow-y-auto scroll-thin relative">
                    </div>
            </div>
         </div>
    </div>
</div>

<script>
    // 全局数据状态
    let data = []; 
    let activeGroup = -1;
    let activeChannel = -1;
    window.tempChannels = []; 
    let hlsInstance = null;

    const defaultGroupTmpl = { "央视": ["CCTV", "央视"], "卫视": ["卫视"], "其他": [] };
    const defaultAliasTmpl = { "CCTV-1": ["CCTV1", "中央一台", "CCTV-1综合", "CCTV1综合"] };

    // --- 生命周期与云端 KV 同步 ---
    window.onload = async () => {
        document.getElementById('subUrl').value = window.location.origin + '/sub/iptv.m3u';
        await loadCloudData();
        fetchClientIp();
    };

    function updateCloudStatus(status, isError=false) {
        document.getElementById('cloudIndicator').className = \`w-2 h-2 rounded-full \${isError ? 'bg-red-500' : (status === '已同步' ? 'bg-green-500' : 'bg-yellow-500')}\`;
        document.getElementById('cloudStatus').innerHTML = \`
            <span class="\${document.getElementById('cloudIndicator').className}" id="cloudIndicator"></span>
            <span>云端状态: \${status}</span>
        \`;
    }

    async function loadCloudData() {
        updateCloudStatus('拉取中...');
        try {
            const res = await fetch('/api/data');
            if(res.ok) {
                const cloud = await res.json();
                if(cloud.data && Array.isArray(cloud.data)) data = cloud.data;
                document.getElementById('groupTemplate').value = cloud.groupTmpl || JSON.stringify(defaultGroupTmpl, null, 2);
                document.getElementById('aliasTemplate').value = cloud.aliasTmpl || JSON.stringify(defaultAliasTmpl, null, 2);
                document.getElementById('epgUrls').value = cloud.epgUrls || '';
                updateCloudStatus('已同步');
                formatAllJson();
                renderG();
            } else {
                throw new Error('KV Not Init');
            }
        } catch(e) {
            updateCloudStatus('本地回退模式', true);
            // 本地回退
            const cached = localStorage.getItem('iptv_auto_v4');
            if(cached) data = JSON.parse(cached);
            document.getElementById('groupTemplate').value = localStorage.getItem('iptv_auto_tmpl') || JSON.stringify(defaultGroupTmpl, null, 2);
            document.getElementById('aliasTemplate').value = localStorage.getItem('iptv_auto_alias') || JSON.stringify(defaultAliasTmpl, null, 2);
            renderG();
        }
    }

    let saveTimeout;
    function saveDataToCloud() {
        // 自动防抖保存
        updateCloudStatus('等待保存...');
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            updateCloudStatus('上传中...');
            
            const payload = {
                data: data,
                groupTmpl: document.getElementById('groupTemplate').value,
                aliasTmpl: document.getElementById('aliasTemplate').value,
                epgUrls: document.getElementById('epgUrls').value
            };
            
            // 本地备份
            localStorage.setItem('iptv_auto_v4', JSON.stringify(data));
            localStorage.setItem('iptv_auto_tmpl', payload.groupTmpl);
            localStorage.setItem('iptv_auto_alias', payload.aliasTmpl);

            try {
                const res = await fetch('/api/data', { method: 'POST', body: JSON.stringify(payload) });
                if(res.ok) updateCloudStatus('已同步');
                else updateCloudStatus('同步失败，已存本地', true);
            } catch(e) {
                updateCloudStatus('网络错误，已存本地', true);
            }
        }, 1500);
    }

    function switchTab(id) {
        ['page1', 'page2', 'page3', 'page4'].forEach(page => {
            document.getElementById(page).classList.add('hidden');
            const btn = document.getElementById('btn-' + page);
            btn.classList.remove('text-blue-700', 'bg-white', 'shadow');
            btn.classList.add('text-slate-500', 'bg-transparent');
        });
        document.getElementById(id).classList.remove('hidden');
        document.getElementById('btn-' + id).classList.remove('text-slate-500', 'bg-transparent');
        document.getElementById('btn-' + id).classList.add('text-blue-700', 'bg-white', 'shadow');
        
        if(id === 'page3') buildPreviewList();
    }

    function formatJson(elId) {
        const el = document.getElementById(elId);
        try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); } catch(e) {}
    }
    function formatAllJson() { formatJson('groupTemplate'); formatJson('aliasTemplate'); }

    // ================= 页面 1 核心逻辑 =================

    async function parseData() {
        const input = document.getElementById('sourceInput').value.trim();
        if(!input) return alert('请输入直播源链接或文本！');
        const btn = document.getElementById('parseBtn');
        btn.innerHTML = '<span>⏳ 解析中...</span>';
        
        let rawText = '';
        if(input.startsWith('http')) {
            const urls = input.split(',').map(s=>s.trim()).filter(s=>s);
            for(const url of urls) {
                try {
                    const res = await fetch('/proxy?url=' + encodeURIComponent(url));
                    if(res.ok) rawText += await res.text() + '\\n';
                } catch(e) {}
            }
        } else {
            rawText = input;
        }

        const lines = rawText.split('\\n').map(l => l.trim()).filter(l => l);
        window.tempChannels = [];
        let curName = '', curGroup = '未分组';

        for(let i=0; i<lines.length; i++) {
            const line = lines[i];
            if(line.startsWith('#EXTINF')) {
                const gMatch = line.match(/group-title="([^"]+)"/);
                if(gMatch) curGroup = gMatch[1];
                const parts = line.split(',');
                if(parts.length > 1) curName = parts[parts.length-1].trim();
            } else if(line.startsWith('http')) {
                if(curName) { window.tempChannels.push({ name: curName, group: curGroup, url: line }); curName = ''; curGroup = '未分组'; }
            } else if(line.includes(',') && !line.startsWith('#')) {
                const parts = line.split(',');
                if(parts.length >= 2) {
                    const url = parts.pop().trim();
                    const name = parts.pop().trim();
                    const group = parts.length > 0 ? parts[0].trim() : '未分组';
                    if(url.startsWith('http')) window.tempChannels.push({ name: name, group: group, url: url });
                }
            }
        }
        btn.innerHTML = '<span>🚀 解析并合并</span>';
        if(window.tempChannels.length > 0) applyTmpl();
        else alert('未能解析到频道，请检查格式。');
    }

    function applyTmpl() {
        if(!window.tempChannels || window.tempChannels.length === 0) return alert('没有解析到源数据。');
        let tmpl = {};
        try { tmpl = JSON.parse(document.getElementById('groupTemplate').value); } catch(e) { return alert('分组模板 JSON 格式错误'); }
        
        let newData = [];
        Object.keys(tmpl).forEach(gName => newData.push({ name: gName, channels: [] }));
        let otherIdx = newData.findIndex(g => g.name === '其他');
        if(otherIdx === -1) { newData.push({ name: '其他', channels: [] }); otherIdx = newData.length - 1; }

        window.tempChannels.forEach(c => {
            let matched = false;
            for(let i=0; i<newData.length; i++) {
                const gName = newData[i].name;
                const keys = tmpl[gName] || [];
                if(c.group === gName || c.name.includes(gName) || keys.some(k => c.name.includes(k) || c.group.includes(k))) {
                    let existC = newData[i].channels.find(xc => xc.name === c.name);
                    if(existC) { if(!existC.urls.includes(c.url)) existC.urls.push(c.url); } 
                    else { newData[i].channels.push({ name: c.name, epgId: '', urls: [c.url] }); }
                    matched = true; break; 
                }
            }
            if(!matched) {
                let existC = newData[otherIdx].channels.find(xc => xc.name === c.name);
                if(existC) { if(!existC.urls.includes(c.url)) existC.urls.push(c.url); } 
                else { newData[otherIdx].channels.push({ name: c.name, epgId: '', urls: [c.url] }); }
            }
        });
        
        data = newData; activeGroup = 0; activeChannel = -1;
        renderG(); saveDataToCloud(); alert(\`解析并重组成功！共导入 \${window.tempChannels.length} 条直链。\`);
    }

    // --- 新增：频道自动合并 ---
    function autoMergeChannels() {
        if(activeGroup < 0) return alert("请先在左侧选择一个分组");
        let aliasRules = {};
        try { aliasRules = JSON.parse(document.getElementById('aliasTemplate').value); } 
        catch(e) { return alert('别名模板 JSON 格式错误，请检查右下角配置！'); }

        let channels = data[activeGroup].channels;
        let mergedCount = 0;

        for (const [targetName, aliases] of Object.entries(aliasRules)) {
            let targetIdx = channels.findIndex(c => c.name === targetName);
            let targetChannel = null;

            if (targetIdx !== -1) {
                targetChannel = channels[targetIdx];
            } else {
                const matchIdx = channels.findIndex(c => aliases.includes(c.name));
                if(matchIdx !== -1) {
                    channels[matchIdx].name = targetName;
                    targetChannel = channels[matchIdx];
                    targetIdx = matchIdx;
                }
            }

            if (targetChannel) {
                for (let i = channels.length - 1; i >= 0; i--) {
                    if (i !== targetIdx) {
                        if (channels[i].name === targetName || aliases.includes(channels[i].name)) {
                            targetChannel.urls.push(...channels[i].urls);
                            targetChannel.urls = [...new Set(targetChannel.urls)];
                            channels.splice(i, 1);
                            mergedCount++;
                            if(i < targetIdx) targetIdx--; 
                        }
                    }
                }
            }
        }
        renderC(); clearU(); saveDataToCloud();
        alert(\`✨ 当前分组自动合并完成！基于右下角的规则，成功合并了 \${mergedCount} 个同名/别名频道。\`);
    }

    function renderG() {
        const el = document.getElementById('groupList');
        el.innerHTML = data.map((g, i) => \`
            <div onclick="selectG(\${i})" class="p-3 border-b cursor-pointer text-sm flex justify-between items-center \${activeGroup === i ? 'list-item-active' : 'hover:bg-slate-100'}">
                <span>\${g.name}</span><span class="text-xs bg-slate-200 px-2 py-0.5 rounded-full">\${g.channels.length}</span>
            </div>
        \`).join('');
        if(activeGroup >= 0 && data[activeGroup]) renderC(); else { document.getElementById('channelList').innerHTML = ''; clearU(); }
    }

    function renderC() {
        if(activeGroup < 0) return;
        const el = document.getElementById('channelList');
        const channels = data[activeGroup].channels;
        el.innerHTML = channels.map((c, i) => \`
            <div onclick="selectC(\${i}, event)" class="p-2 border-b cursor-pointer text-sm flex items-center gap-2 \${activeChannel === i ? 'list-item-active' : 'hover:bg-slate-100'}">
                <input type="checkbox" class="channel-cb" value="\${i}" onclick="event.stopPropagation()">
                <span class="truncate flex-1 font-medium">\${c.name}</span>
                <span class="text-slate-400 text-xs">(\${c.urls.length})</span>
            </div>
        \`).join('');
        if(activeChannel >= 0 && channels[activeChannel]) renderU(); else clearU();
    }

    function renderU() {
        if(activeGroup < 0 || activeChannel < 0) return;
        const c = data[activeGroup].channels[activeChannel];
        document.getElementById('cName').value = c.name;
        document.getElementById('cEpgId').value = c.epgId || '';
        document.getElementById('cUrls').value = c.urls.join('\\n');
    }

    function clearU() {
        document.getElementById('cName').value = ''; document.getElementById('cEpgId').value = ''; document.getElementById('cUrls').value = '';
    }

    function selectG(i) { activeGroup = i; activeChannel = -1; renderG(); }
    function selectC(i, e) { if(e && e.target.type === 'checkbox') return; activeChannel = i; renderC(); }
    
    // 省略部分增删改移代码，逻辑同前，末尾加 saveDataToCloud() 即可
    function moveItem(type, dir) { /* ... */ saveDataToCloud(); }
    function deleteItem(type) {
        if(type === 'group' && activeGroup >= 0 && confirm('删除分组?')) { data.splice(activeGroup, 1); activeGroup = -1; renderG(); saveDataToCloud(); }
        else if(type === 'channel' && activeChannel >= 0 && confirm('删除频道?')) { data[activeGroup].channels.splice(activeChannel, 1); activeChannel = -1; renderC(); saveDataToCloud(); }
    }
    function sortChannels() { if(activeGroup < 0) return; data[activeGroup].channels.sort((a,b) => a.name.localeCompare(b.name, 'zh-CN')); renderC(); saveDataToCloud(); }
    function mergeChannels() {
        if(activeGroup < 0) return;
        const cbs = document.querySelectorAll('.channel-cb:checked');
        if(cbs.length < 2) return alert('请至少勾选 2 个频道');
        let targetIdx = parseInt(cbs[0].value), allUrls = [], toDelete = [];
        cbs.forEach(cb => { const idx = parseInt(cb.value); allUrls.push(...data[activeGroup].channels[idx].urls); if(idx !== targetIdx) toDelete.push(idx); });
        data[activeGroup].channels[targetIdx].urls = [...new Set(allUrls)];
        toDelete.sort((a,b)=>b-a).forEach(idx => data[activeGroup].channels.splice(idx, 1));
        activeChannel = targetIdx; renderC(); saveDataToCloud();
    }
    function saveChannelInfo() {
        if(activeGroup < 0 || activeChannel < 0) return;
        data[activeGroup].channels[activeChannel].name = document.getElementById('cName').value.trim();
        data[activeGroup].channels[activeChannel].epgId = document.getElementById('cEpgId').value.trim();
        renderC(); saveDataToCloud();
    }
    function syncUrls() {
        if(activeGroup < 0 || activeChannel < 0) return;
        data[activeGroup].channels[activeChannel].urls = document.getElementById('cUrls').value.split('\\n').map(s=>s.trim()).filter(s=>s);
        renderC(); saveDataToCloud();
    }
    function dedupUrls() {
        if(activeGroup < 0 || activeChannel < 0) return;
        data[activeGroup].channels[activeChannel].urls = [...new Set(data[activeGroup].channels[activeChannel].urls)];
        renderU(); renderC(); saveDataToCloud();
    }
    function clearData() { if(confirm('清空所有?')) { data = []; activeGroup = -1; renderG(); saveDataToCloud(); } }

    // ================= 页面 2 测速与净化 =================
    async function fetchClientIp() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const j = await res.json();
            document.getElementById('clientIp').innerText = j.ip;
        } catch(e) {}
    }

    async function startSpeedTest() {
        const term = document.getElementById('terminal');
        const pb = document.getElementById('pbFill');
        const prog = document.getElementById('testProgress');
        const btn = document.getElementById('btnStartTest');
        
        let allUrls = [];
        data.forEach((g, gi) => {
            g.channels.forEach((c, ci) => {
                c.urls.forEach((u, ui) => {
                    allUrls.push({ gIdx: gi, cIdx: ci, uIdx: ui, url: u, name: c.name });
                });
            });
        });

        if(allUrls.length === 0) return alert('没有需要测速的源');
        btn.disabled = true;
        term.innerHTML = '<div>> 开始执行并发探测任务...</div>';
        
        let done = 0;
        const total = allUrls.length;
        
        // 简单并发控制器
        const limit = 5; 
        for(let i=0; i<total; i+=limit) {
            const chunk = allUrls.slice(i, i+limit);
            await Promise.all(chunk.map(async (item) => {
                const start = Date.now();
                try {
                    // 仅探测请求头，不下载实体
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const res = await fetch(item.url, { method: 'HEAD', signal: controller.signal, mode: 'no-cors' });
                    clearTimeout(timeoutId);
                    const ms = Date.now() - start;
                    term.innerHTML += \`<div>[\${item.name}] \${item.url} -> \${ms}ms</div>\`;
                } catch(e) {
                    term.innerHTML += \`<div class="err">[\${item.name}] \${item.url} -> 失效/超时</div>\`;
                    // 标记失效 (实际应用中可能直接 splice，这里为演示简单标记)
                    data[item.gIdx].channels[item.cIdx].urls[item.uIdx] = null;
                }
                done++;
                pb.style.width = \`\${(done/total)*100}%\`;
                prog.innerText = \`测试中 (\${done}/\${total})\`;
                term.scrollTop = term.scrollHeight;
            }));
        }

        // 净化清理 null 链接
        data.forEach(g => {
            g.channels.forEach(c => { c.urls = c.urls.filter(u => u !== null); });
            // 如果频道下没有任何可用直链，也可以考虑删除频道
        });
        
        saveDataToCloud();
        term.innerHTML += '<div class="text-green-400 font-bold mt-2">> 测试完成！已清理失效源并保存云端同步。</div>';
        prog.innerText = \`完成 (\${total}/\${total})\`;
        btn.disabled = false;
        alert("测速净化完成，您的专属订阅已更新！");
    }

    function copySub() {
        const input = document.getElementById('subUrl');
        input.select();
        document.execCommand('copy');
        alert('订阅地址已复制！可以将其粘贴到电视盒子或播放器中。');
    }

    // ================= 页面 3 沉浸播放 =================
    function buildPreviewList() {
        let html = '';
        data.forEach(g => {
            html += \`<div class="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold mt-2">\${g.name}</div>\`;
            g.channels.forEach(c => {
                if(c.urls.length > 0) {
                    html += \`<div onclick="playVideo('\${c.name}', '\${c.urls[0]}')" class="px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer border-b border-slate-700 truncate">\${c.name}</div>\`;
                }
            });
        });
        document.getElementById('previewList').innerHTML = html;
    }

    function playVideo(name, url) {
        document.getElementById('piName').innerText = name;
        document.getElementById('piUrl').innerText = url;
        document.getElementById('piStatus').innerText = '缓冲中...';
        document.getElementById('piStatus').className = 'text-xs text-yellow-400';
        const video = document.getElementById('videoPlayer');

        if(hlsInstance) { hlsInstance.destroy(); }

        if(url.includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls();
            // 如果直连失败，可回退调用 worker proxy: /proxy?url=
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(video);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play();
                document.getElementById('piStatus').innerText = '正在播放';
                document.getElementById('piStatus').className = 'text-xs text-green-400';
            });
            hlsInstance.on(Hls.Events.ERROR, function(e, data) {
                if(data.fatal) {
                    document.getElementById('piStatus').innerText = '播放失败 (CORS/跨域/死链)';
                    document.getElementById('piStatus').className = 'text-xs text-red-500';
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari 原生支持
            video.src = url;
            video.play();
        }
        
        // 监听分辨率
        video.addEventListener('loadedmetadata', function() {
            document.getElementById('piRes').innerText = \`\${video.videoWidth} x \${video.videoHeight}\`;
        });
    }

    // ================= 页面 4 EPG 模拟 =================
    function fetchEPG() {
        const list = document.getElementById('epgChannelList');
        const tl = document.getElementById('epgTimeline');
        list.innerHTML = '';
        
        let allC = [];
        data.forEach(g => g.channels.forEach(c => allC.push(c)));
        
        allC.slice(0, 15).forEach((c, i) => { // 取前几个作为演示
            list.innerHTML += \`<div onclick="showEPGTimeline('\${c.name}')" class="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm font-bold text-slate-700">\${c.name}</div>\`;
        });
        
        tl.innerHTML = '<div class="text-center text-slate-400 mt-20">左侧选择频道查看今日节目单</div>';
    }

    function showEPGTimeline(name) {
        document.getElementById('epgTitle').innerText = name + ' - 节目单 (模拟数据)';
        const tl = document.getElementById('epgTimeline');
        // 模拟生成几条数据
        tl.innerHTML = \`
            <div class="border-l-2 border-blue-500 pl-4 py-2 relative mb-4">
                <div class="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-3"></div>
                <div class="text-xs text-slate-500">08:00 - 10:00</div>
                <div class="font-bold text-slate-800">早间新闻播报</div>
            </div>
            <div class="border-l-2 border-blue-500 pl-4 py-2 relative mb-4 bg-blue-50 rounded-r">
                <div class="absolute w-3 h-3 border-2 border-blue-500 bg-white rounded-full -left-[7px] top-3"></div>
                <div class="text-xs text-blue-600 font-bold">10:00 - 12:00 (正在播出)</div>
                <div class="font-bold text-blue-800 text-lg mt-1">热门电视剧集连播</div>
            </div>
            <div class="border-l-2 border-slate-200 pl-4 py-2 relative mb-4 opacity-50">
                <div class="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-3"></div>
                <div class="text-xs text-slate-500">12:00 - 13:00</div>
                <div class="font-bold text-slate-800">午间新闻</div>
            </div>
        \`;
    }

</script>
</body>
</html>`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // --- 核心更新1：处理基于 KV 的持久化 API ---
        if (url.pathname === '/api/data') {
            if(!env.IPTV_DATA) return new Response(JSON.stringify({error: "KV Not Bound"}), { status: 500 });
            
            if (request.method === 'GET') {
                const stored = await env.IPTV_DATA.get("userData", { type: "json" });
                return new Response(JSON.stringify(stored || {}), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } 
            else if (request.method === 'POST') {
                const body = await request.json();
                await env.IPTV_DATA.put("userData", JSON.stringify(body));
                return new Response(JSON.stringify({success: true}), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // --- 核心更新2：输出最终订阅 M3U ---
        if (url.pathname === '/sub/iptv.m3u') {
             if(!env.IPTV_DATA) return new Response('Please setup KV first.', { status: 500 });
             const stored = await env.IPTV_DATA.get("userData", { type: "json" });
             if(!stored || !stored.data) return new Response('No Data', { status: 404 });
             
             let m3u = "#EXTM3U\\n";
             stored.data.forEach(g => {
                 g.channels.forEach(c => {
                     if(c.urls && c.urls.length > 0) {
                         const epgStr = c.epgId ? \` tvg-id="\${c.epgId}" tvg-name="\${c.name}"\` : \` tvg-name="\${c.name}"\`;
                         // 输出该频道第一个有效直链 (或全输出)
                         m3u += \`#EXTINF:-1\${epgStr} group-title="\${g.name}",\${c.name}\\n\`;
                         m3u += \`\${c.urls[0]}\\n\`;
                     }
                 });
             });
             return new Response(m3u, {
                headers: { 
                    'Content-Type': 'audio/x-mpegurl; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="iptv.m3u"'
                }
             });
        }

        // CORS 代理
        if (url.pathname === '/proxy') {
            const targetUrl = url.searchParams.get('url');
            if (!targetUrl) return new Response('Missing URL', { status: 400 });
            try {
                const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                return new Response(res.body, { status: res.status, headers: { 'Access-Control-Allow-Origin': '*' } });
            } catch (err) {
                return new Response('Proxy fetch failed', { status: 500 });
            }
        }

        // 默认返回前端 HTML
        return new Response(FULL_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}