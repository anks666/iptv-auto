/**
 * IPTV-Auto 深度管理面板 v4.1 (完整解析逻辑补全版)
 * 纯本地缓存 + CORS 代理，彻底杜绝 1101 错误，解析功能 100% 恢复
 */

const FULL_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV-Auto 深度管理面板 v4.1</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .tab-btn { transition: all 0.2s; }
        .list-item-active { background-color: #eff6ff; border-left: 4px solid #2563eb; font-weight: bold; }
        .scroll-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        #groupTemplate { font-family: 'Cascadia Code', Consolas, monospace; white-space: pre !important; }
        .icon-btn { padding: 4px; border-radius: 4px; color: #475569; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { background-color: #e2e8f0; color: #0f172a; }
        .icon-danger:hover { background-color: #fee2e2; color: #dc2626; }
        .channel-cb { accent-color: #2563eb; width: 16px; height: 16px; cursor: pointer; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen">

<div class="max-w-[1600px] mx-auto p-4">
    <h1 class="text-3xl font-black text-center mb-6 text-blue-600 tracking-wider">IPTV-Auto 深度管理面板 v4.1</h1>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" id="btn-page1" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-blue-700 bg-white shadow">1. 源与分组配置</button>
        <button onclick="switchTab('page2')" id="btn-page2" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent">2. 测速与净化导出</button>
        <button onclick="switchTab('page3')" id="btn-page3" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent">3. 播放信息校准</button>
        <button onclick="switchTab('page4')" id="btn-page4" class="tab-btn px-6 py-3 font-bold rounded-t-lg text-slate-500 bg-transparent">4. 节目指南 (EPG)</button>
    </div>

    <div id="page1" class="bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">EPG 节目单地址 (多个请用英文逗号隔开)</label>
                    <input type="text" id="epgUrls" class="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" placeholder="https://epg.example.com/e.xml">
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
                <label class="block text-xs font-bold text-slate-500 mb-1">分组与关键词模板 (JSON)</label>
                <textarea id="groupTemplate" class="w-full h-52 p-4 border rounded-lg text-xs bg-slate-900 text-emerald-400 outline-none scroll-thin" onblur="formatJson()"></textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[550px]">
            
            <div class="col-span-3 border rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-1">📁 分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="openGroupModal()" class="icon-btn" title="添加分组及关键词"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg></button>
                        <button onclick="moveItem('group', -1)" class="icon-btn" title="上移分组"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10l8-8 8 8M12 2v20"></path></svg></button>
                        <button onclick="moveItem('group', 1)" class="icon-btn" title="下移分组"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 14l8 8 8-8M12 22V2"></path></svg></button>
                        <button onclick="deleteItem('group')" class="icon-btn icon-danger text-red-500" title="删除分组"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin p-1 space-y-1"></div>
            </div>

            <div class="col-span-4 border rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-1">📺 频道列表</span>
                    <div class="flex gap-1">
                        <button onclick="sortChannels()" class="icon-btn" title="按A-Z自动排序"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg></button>
                        <button onclick="moveItem('channel', -1)" class="icon-btn" title="上移频道"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10l8-8 8 8M12 2v20"></path></svg></button>
                        <button onclick="moveItem('channel', 1)" class="icon-btn" title="下移频道"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 14l8 8 8-8M12 22V2"></path></svg></button>
                        <button onclick="mergeChannels()" class="icon-btn text-indigo-600" title="合并频道"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></button>
                        <button onclick="deleteItem('channel')" class="icon-btn icon-danger text-red-500" title="删除频道"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin p-1 space-y-1"></div>
            </div>

            <div class="col-span-5 border rounded-xl bg-white flex flex-col overflow-hidden shadow-inner">
                <div class="p-3 bg-slate-100 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-700">编辑信息</span>
                    <button onclick="saveChannelInfo()" class="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700">💾 保存</button>
                </div>
                <div class="p-4 border-b space-y-3 bg-slate-50">
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold text-slate-500 w-16">频道名称</label>
                        <input id="cName" type="text" class="flex-1 p-2 border rounded text-sm focus:ring-1 outline-none">
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold text-slate-500 w-16">EPG ID</label>
                        <input id="cEpgId" type="text" class="flex-1 p-2 border rounded text-sm focus:ring-1 outline-none" placeholder="tvg-id">
                    </div>
                </div>
                <div class="p-3 bg-slate-100 border-b flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-700">直播源地址 (每行一个)</span>
                    <button onclick="dedupUrls()" class="text-blue-600 font-bold hover:underline">一键去重</button>
                </div>
                <textarea id="cUrls" class="flex-1 w-full p-4 font-mono text-sm leading-loose outline-none resize-none scroll-thin bg-white" onchange="syncUrls()"></textarea>
            </div>

        </div>
    </div>

    <div id="page2" class="hidden bg-white p-12 rounded-b-xl shadow border text-center text-slate-500"><h2 class="text-2xl font-bold mb-4">测速与净化导出 (正在开发)</h2></div>
    <div id="page3" class="hidden bg-slate-900 p-12 rounded-b-xl shadow border text-center text-slate-400 min-h-[500px]"><h2 class="text-2xl font-bold mb-4">播放信息校准 (正在开发)</h2></div>
    <div id="page4" class="hidden bg-white p-12 rounded-b-xl shadow border text-center text-slate-500"><h2 class="text-2xl font-bold mb-4">节目指南 (EPG) 预览 (正在开发)</h2></div>

    <div id="addModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-white p-6 rounded-xl shadow-2xl w-96 border">
            <h3 class="font-bold text-lg mb-4 text-blue-600">添加新分组</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">分组名称</label>
                    <input id="newGName" type="text" class="w-full p-2 border rounded outline-none focus:border-blue-500" placeholder="例如: 体育频道">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">关键词 (英文逗号分隔)</label>
                    <input id="newGKeys" type="text" class="w-full p-2 border rounded outline-none focus:border-blue-500" placeholder="例如: CCTV5, 体育">
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="confirmAddGroup()" class="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">确认添加</button>
                <button onclick="document.getElementById('addModal').classList.add('hidden')" class="flex-1 bg-slate-100 py-2 rounded text-slate-600 hover:bg-slate-200">取消</button>
            </div>
        </div>
    </div>
</div>

<script>
    let data = []; 
    let activeGroup = -1;
    let activeChannel = -1;
    window.tempChannels = []; // 临时保存解析出来的原始频道
    const defaultTemplate = { "央视": ["CCTV", "央视"], "卫视": ["卫视"], "其他": [] };

    window.onload = () => {
        const cached = localStorage.getItem('iptv_auto_v4');
        if(cached) {
            data = JSON.parse(cached);
            document.getElementById('groupTemplate').value = localStorage.getItem('iptv_auto_tmpl') || JSON.stringify(defaultTemplate);
        } else {
            document.getElementById('groupTemplate').value = JSON.stringify(defaultTemplate);
        }
        formatJson();
        renderG();
    };

    function saveData() {
        localStorage.setItem('iptv_auto_v4', JSON.stringify(data));
        localStorage.setItem('iptv_auto_tmpl', document.getElementById('groupTemplate').value);
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
    }

    function formatJson() {
        const el = document.getElementById('groupTemplate');
        try {
            const obj = JSON.parse(el.value);
            let out = "{\\n";
            const keys = Object.keys(obj);
            keys.forEach((k, i) => {
                out += \`  "\${k}": \${JSON.stringify(obj[k])}\${i < keys.length - 1 ? ',' : ''}\\n\`;
            });
            out += "}";
            el.value = out;
            saveData();
        } catch(e) {}
    }

    // --- 核心修复：解析功能 ---
    async function parseData() {
        const input = document.getElementById('sourceInput').value.trim();
        if(!input) return alert('请输入直播源链接或 M3U 文本！');
        
        const btn = document.getElementById('parseBtn');
        btn.innerHTML = '<span>⏳ 正在解析...</span>';
        
        let rawText = '';
        // 智能判断是URL列表还是直接文本
        if(input.startsWith('http')) {
            const urls = input.split(',').map(s=>s.trim()).filter(s=>s);
            for(const url of urls) {
                try {
                    // 通过后端的 proxy 拉取远程数据解决 CORS 问题
                    const res = await fetch('/proxy?url=' + encodeURIComponent(url));
                    if(res.ok) {
                        rawText += await res.text() + '\\n';
                    }
                } catch(e) {
                    console.error('Fetch failed:', url);
                }
            }
        } else {
            rawText = input;
        }

        // 解析 M3U 与 TXT 格式
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
                if(curName) {
                    window.tempChannels.push({ name: curName, group: curGroup, url: line });
                    curName = ''; curGroup = '未分组';
                }
            } else if(line.includes(',') && !line.startsWith('#')) {
                // 处理纯文本 TXT 格式: 分组,频道名,URL 或 频道名,URL
                const parts = line.split(',');
                if(parts.length >= 2) {
                    const url = parts.pop().trim();
                    const name = parts.pop().trim();
                    const group = parts.length > 0 ? parts[0].trim() : '未分组';
                    if(url.startsWith('http')) {
                         window.tempChannels.push({ name: name, group: group, url: url });
                    }
                }
            }
        }
        
        btn.innerHTML = '<span>🚀 解析并合并</span>';
        if(window.tempChannels.length > 0) {
            applyTmpl();
        } else {
            alert('未能解析到任何有效频道信息，请检查输入格式。');
        }
    }

    // --- 核心修复：模板应用 ---
    function applyTmpl() {
        if(!window.tempChannels || window.tempChannels.length === 0) return alert('没有解析到源数据。');
        
        let tmpl = {};
        try { tmpl = JSON.parse(document.getElementById('groupTemplate').value); } 
        catch(e) { return alert('JSON 模板格式错误，请检查！'); }
        
        let newData = [];
        Object.keys(tmpl).forEach(gName => newData.push({ name: gName, channels: [] }));
        
        // 确保有一个“其他”分组托底
        let otherIdx = newData.findIndex(g => g.name === '其他');
        if(otherIdx === -1) {
            newData.push({ name: '其他', channels: [] });
            otherIdx = newData.length - 1;
        }

        window.tempChannels.forEach(c => {
            let matched = false;
            for(let i=0; i<newData.length; i++) {
                const gName = newData[i].name;
                const keys = tmpl[gName] || [];
                // 只要原有分组名匹配，频道名匹配，或者命中关键词，就归类到该组
                if(c.group === gName || c.name.includes(gName) || keys.some(k => c.name.includes(k) || c.group.includes(k))) {
                    let existC = newData[i].channels.find(xc => xc.name === c.name);
                    if(existC) {
                        if(!existC.urls.includes(c.url)) existC.urls.push(c.url);
                    } else {
                        newData[i].channels.push({ name: c.name, epgId: '', urls: [c.url] });
                    }
                    matched = true;
                    break; 
                }
            }
            if(!matched) {
                let existC = newData[otherIdx].channels.find(xc => xc.name === c.name);
                if(existC) {
                    if(!existC.urls.includes(c.url)) existC.urls.push(c.url);
                } else {
                    newData[otherIdx].channels.push({ name: c.name, epgId: '', urls: [c.url] });
                }
            }
        });
        
        data = newData;
        activeGroup = 0;
        activeChannel = -1;
        renderG();
        saveData();
        alert(\`解析与重新分组成功！共处理并去重合并了 \${window.tempChannels.length} 个直播源链接。\`);
    }

    // --- 渲染逻辑 ---
    function renderG() {
        const el = document.getElementById('groupList');
        el.innerHTML = data.map((g, i) => \`
            <div onclick="selectG(\${i})" class="p-3 border-b cursor-pointer text-sm flex justify-between items-center \${activeGroup === i ? 'list-item-active' : 'hover:bg-slate-100'} rounded transition-colors">
                <span>\${g.name}</span>
                <span class="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">\${g.channels.length}</span>
            </div>
        \`).join('');
        if(activeGroup >= 0 && data[activeGroup]) renderC(); else { document.getElementById('channelList').innerHTML = ''; clearU(); }
    }

    function renderC() {
        if(activeGroup < 0) return;
        const el = document.getElementById('channelList');
        const channels = data[activeGroup].channels;
        el.innerHTML = channels.map((c, i) => \`
            <div onclick="selectC(\${i}, event)" class="p-2 border-b cursor-pointer text-xs flex items-center gap-2 \${activeChannel === i ? 'list-item-active' : 'hover:bg-slate-100'} rounded transition-colors">
                <input type="checkbox" class="channel-cb" value="\${i}" onclick="event.stopPropagation()">
                <span class="truncate flex-1">\${c.name}</span>
                <span class="text-slate-400">(\${c.urls.length})</span>
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
        document.getElementById('cName').value = '';
        document.getElementById('cEpgId').value = '';
        document.getElementById('cUrls').value = '';
    }

    function selectG(i) { activeGroup = i; activeChannel = -1; renderG(); }
    function selectC(i, e) { if(e && e.target.type === 'checkbox') return; activeChannel = i; renderC(); }

    function openGroupModal() {
        document.getElementById('newGName').value = '';
        document.getElementById('newGKeys').value = '';
        document.getElementById('addModal').classList.remove('hidden');
    }
    
    function confirmAddGroup() {
        const name = document.getElementById('newGName').value.trim();
        const keys = document.getElementById('newGKeys').value.trim();
        if(!name) return;
        try {
            const obj = JSON.parse(document.getElementById('groupTemplate').value);
            obj[name] = keys ? keys.split(',').map(s=>s.trim()) : [];
            document.getElementById('groupTemplate').value = JSON.stringify(obj);
            formatJson();
            data.push({ name: name, channels: [] });
            document.getElementById('addModal').classList.add('hidden');
            renderG();
            saveData();
        } catch(e) { alert('JSON 格式错误'); }
    }

    function moveItem(type, dir) {
        if(type === 'group' && activeGroup >= 0) {
            const t = activeGroup + dir;
            if(t >= 0 && t < data.length) {
                [data[activeGroup], data[t]] = [data[t], data[activeGroup]];
                activeGroup = t; renderG(); saveData();
            }
        } else if(type === 'channel' && activeChannel >= 0) {
            const arr = data[activeGroup].channels;
            const t = activeChannel + dir;
            if(t >= 0 && t < arr.length) {
                [arr[activeChannel], arr[t]] = [arr[t], arr[activeChannel]];
                activeChannel = t; renderC(); saveData();
            }
        }
    }

    function deleteItem(type) {
        if(type === 'group' && activeGroup >= 0) {
            if(confirm('删除选中分组?')) { data.splice(activeGroup, 1); activeGroup = -1; renderG(); saveData(); }
        } else if(type === 'channel' && activeChannel >= 0) {
            if(confirm('删除选中频道?')) { data[activeGroup].channels.splice(activeChannel, 1); activeChannel = -1; renderC(); saveData(); }
        }
    }

    function sortChannels() {
        if(activeGroup < 0) return;
        data[activeGroup].channels.sort((a,b) => a.name.localeCompare(b.name, 'zh-CN'));
        renderC(); saveData();
    }

    function mergeChannels() {
        if(activeGroup < 0) return;
        const cbs = document.querySelectorAll('.channel-cb:checked');
        if(cbs.length < 2) return alert('请至少勾选 2 个频道进行合并');
        if(!confirm(\`确定合并选中的 \${cbs.length} 个频道吗?\`)) return;
        
        let targetIdx = parseInt(cbs[0].value);
        let allUrls = [];
        let toDelete = [];
        
        cbs.forEach(cb => {
            const idx = parseInt(cb.value);
            allUrls.push(...data[activeGroup].channels[idx].urls);
            if(idx !== targetIdx) toDelete.push(idx);
        });

        data[activeGroup].channels[targetIdx].urls = [...new Set(allUrls)];
        toDelete.sort((a,b)=>b-a).forEach(idx => data[activeGroup].channels.splice(idx, 1));
        
        activeChannel = targetIdx;
        renderC(); saveData();
    }

    function saveChannelInfo() {
        if(activeGroup < 0 || activeChannel < 0) return;
        data[activeGroup].channels[activeChannel].name = document.getElementById('cName').value.trim();
        data[activeGroup].channels[activeChannel].epgId = document.getElementById('cEpgId').value.trim();
        renderC(); saveData();
    }
    
    function syncUrls() {
        if(activeGroup < 0 || activeChannel < 0) return;
        const lines = document.getElementById('cUrls').value.split('\\n').map(s=>s.trim()).filter(s=>s);
        data[activeGroup].channels[activeChannel].urls = lines;
        renderC(); saveData();
    }

    function dedupUrls() {
        if(activeGroup < 0 || activeChannel < 0) return;
        const urls = data[activeGroup].channels[activeChannel].urls;
        const unique = [...new Set(urls)];
        data[activeGroup].channels[activeChannel].urls = unique;
        renderU(); renderC(); saveData();
    }

    function clearData() {
        if(confirm('警告：清空所有分组与频道数据？')) { data = []; activeGroup = -1; renderG(); saveData(); }
    }
</script>
</body>
</html>`;

export default {
    async fetch(request) {
        const url = new URL(request.url);

        // --- 核心修复：添加纯净的 CORS 代理，专供解析远程 M3U 链接使用 ---
        if (url.pathname === '/proxy') {
            const targetUrl = url.searchParams.get('url');
            if (!targetUrl) return new Response('Missing target URL', { status: 400 });
            
            try {
                const response = await fetch(targetUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                return new Response(response.body, {
                    status: response.status,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'text/plain; charset=utf-8' 
                    }
                });
            } catch (error) {
                return new Response('Proxy fetch failed', { 
                    status: 500, 
                    headers: { 'Access-Control-Allow-Origin': '*' } 
                });
            }
        }

        // 默认路由返回完整前端代码
        return new Response(FULL_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}