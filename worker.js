/**
 * IPTV-Auto v3.9 - 专业编辑器 (UI 交互打磨、多选合并、布局优化)
 */

const HTML_HEAD = `<!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><title>IPTV-Auto v3.9 Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        .tab-content { display:none; } .tab-content.active { display:block; }
        /* 修复高亮问题 (问题1) */
        .tab-btn-active { @apply text-blue-700 bg-white shadow; }
        .tab-btn { @apply text-slate-500 bg-transparent; }
        .list-item-active { background-color:#eff6ff; border-left:4px solid #2563eb; font-weight:bold; }
        #groupTemplate { font-family: 'Cascadia Code', monospace; white-space: pre !important; }
        .scroll-thin::-webkit-scrollbar { width:6px; height:6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
        /* 统一图标粗细 (问题3, 5) */
        .btn-icon { @apply p-2 hover:bg-slate-200 rounded text-base transition-all flex items-center justify-center text-slate-600; font-size: 1.1rem; }
        /* 频道多选框样式 (问题6) */
        .channel-checkbox { @apply mr-2 accent-blue-600 cursor-pointer w-4 h-4; }
    </style></head><body class="bg-slate-50 text-slate-800">`;

const HTML_BODY = `
<div class="max-w-[1600px] mx-auto p-4">
    <h1 class="text-3xl font-black text-center mb-6 text-blue-600 tracking-wider">IPTV-Auto 专业管理面板 v3.9</h1>
    
    <div class="flex border-b mb-4 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <button onclick="switchTab('page1')" class="tab-btn px-6 py-3 font-bold rounded-t-lg transition-all" id="btn-page1">1. 源与分组配置</button>
        <button onclick="switchTab('page2')" class="tab-btn px-6 py-3 font-bold rounded-t-lg transition-all" id="btn-page2">2. 测速与净化导出</button>
        <button onclick="switchTab('page3')" class="tab-btn px-6 py-3 font-bold rounded-t-lg transition-all" id="btn-page3">3. 播放信息校准</button>
    </div>

    <div id="page1" class="tab-content active bg-white p-6 rounded-b-xl shadow-lg border">
        <div class="grid grid-cols-12 gap-6 mb-6">
            <div class="col-span-7">
                <label class="block text-xs font-bold text-slate-500 mb-1 uppercase">直播源 (输入内容或 M3U 链接)</label>
                <textarea id="sourceInput" class="w-full h-40 p-4 border-2 rounded-xl text-sm font-mono bg-slate-50 outline-none focus:border-blue-400" placeholder="在此粘贴..."></textarea>
                <div class="mt-3 flex gap-3">
                    <button onclick="parseSources()" id="parseBtn" class="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold shadow hover:bg-blue-700 transition-all">🚀 解析并合并</button>
                    <button onclick="applyTemplate()" class="bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 transition-all">🔄 应用模板</button>
                    <button onclick="if(confirm('清空所有数据?')){data=[];renderG();saveConfig();}" class="bg-slate-100 text-slate-500 px-6 py-3 rounded-lg text-sm font-bold ml-auto hover:bg-red-50 hover:text-red-600 transition-all">🧹 清空</button>
                </div>
            </div>
            <div class="col-span-5">
                <label class="block text-xs font-bold text-slate-500 mb-1 uppercase">分组定义 (JSON 行同行排版)</label>
                <textarea id="groupTemplate" class="w-full h-40 p-4 border-2 rounded-xl text-xs bg-slate-950 text-emerald-400 outline-none scroll-thin" onblur="formatJson()"></textarea>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-4 h-[550px]">
            <div class="col-span-3 border-2 border-slate-200 rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 text-[11px] font-bold flex justify-between items-center text-slate-700">
                    <span>📁 分组控制</span>
                    <div class="flex gap-1">
                        <button onclick="showAddGroupModal()" class="btn-icon" title="添加分组及关键词">➕</button>
                        <button onclick="moveItem('g', -1)" class="btn-icon" title="上移分组">↑</button>
                        <button onclick="moveItem('g', 1)" class="btn-icon" title="下移分组">↓</button>
                        <button onclick="uiDelGroup()" class="btn-icon text-red-600" title="删除分组">❌</button>
                    </div>
                </div>
                <div id="groupList" class="flex-1 overflow-y-auto scroll-thin"></div>
            </div>
            <div class="col-span-4 border-2 border-slate-200 rounded-xl bg-slate-50 flex flex-col overflow-hidden">
                <div class="bg-slate-200 p-2 text-[11px] font-bold flex justify-between items-center text-slate-700">
                    <span>📺 频道列表</span>
                    <div class="flex gap-1">
                        <button onclick="sortItem('c')" class="btn-icon" title="按A-Z自动排序">🔠</button>
                        <button onclick="moveItem('c', -1)" class="btn-icon" title="上移频道">↑</button>
                        <button onclick="moveItem('c', 1)" class="btn-icon" title="下移频道">↓</button>
                        <button onclick="mergeSelectedChannels()" class="btn-icon text-indigo-600" title="合并选中的频道源">🔗</button>
                        <button onclick="clipAction('cut')" class="btn-icon" title="剪切">✂️</button>
                        <button onclick="clipAction('paste')" class="btn-icon" title="在此粘贴">📥</button>
                        <button onclick="uiDelChannel()" class="btn-icon text-red-600" title="删除频道">❌</button>
                    </div>
                </div>
                <div id="channelList" class="flex-1 overflow-y-auto scroll-thin p-1 space-y-1"></div>
            </div>
            <div class="col-span-5 border-2 border-slate-200 rounded-xl bg-white overflow-hidden flex flex-col shadow-inner">
                <div class="bg-slate-100 p-3 border-b flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-600">频道重命名 & EPG ID</span>
                    <button onclick="saveChannelName()" class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">💾 保存</button>
                </div>
                <div class="p-4 border-b bg-slate-50 space-y-3">
                    <div class="grid grid-cols-12 gap-2 items-center"><label class="col-span-3 text-xs font-bold text-slate-500">名称</label><input id="cRename" type="text" class="col-span-9 p-2 text-sm border rounded"></div>
                    <div class="grid grid-cols-12 gap-2 items-center"><label class="col-span-3 text-xs font-bold text-slate-500">EPG ID</label><input id="cTvgId" type="text" class="col-span-9 p-2 text-sm border rounded"></div>
                </div>
                <div class="p-3 bg-slate-100 text-[11px] font-bold border-b text-slate-700 flex justify-between">
                    <span>🔗 频道源地址列表 (每行一个)</span>
                    <span id="urlCount" class="text-xs font-normal text-slate-500"></span>
                </div>
                <textarea id="urlEditor" class="w-full flex-1 p-4 text-sm font-mono leading-loose outline-none resize-none scroll-thin bg-white" onchange="updateUrls()"></textarea>
                <div class="bg-slate-50 p-2 text-right"><button onclick="uniqueUrls()" class="text-xs text-blue-600">一键去重</button></div>
            </div>
        </div>
    </div>

    <div id="addGModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-white p-6 rounded-2xl shadow-2xl w-[400px] space-y-4 border">
            <h3 class="font-black text-xl text-blue-600 mb-4">添加新分组及关键词</h3>
            <div><label class="block text-xs font-bold mb-1 text-slate-500">分组名称</label><input id="newGName" type="text" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" placeholder="例如: CCTV"></div>
            <div><label class="block text-xs font-bold mb-1 text-slate-500">关键词 (英文逗号分隔)</label><input id="newGKeys" type="text" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" placeholder="例如: CCTV, 央视"></div>
            <div class="flex gap-2 pt-4"><button onclick="addGroupAction()" class="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">➕ 添加</button><button onclick="closeModal()" class="flex-1 bg-slate-100 py-2 rounded-lg text-slate-600">取消</button></div>
        </div>
    </div>

    <div id="page2" class="tab-content bg-white p-8 rounded-b-xl shadow-lg border">/* 测速页面代码... */</div>
    <div id="page3" class="tab-content bg-slate-900 p-8 rounded-b-xl min-h-[600px]">/* 预览页面代码... */</div>
</div>
`;

const JS_LOGIC = `
<script>
let data = []; let curG = -1, curC = -1; let clipboard = null; let hls = null;
const defaultTmpl = { "央视": ["CCTV", "央视"], "卫视": ["卫视"], "其他": [] };

window.onload = () => {
    document.getElementById('groupTemplate').value = JSON.stringify(defaultTmpl, null, 2);
    formatJson();
    renderG();
};

// ================== 问题 1: 高亮联动修复 ==================
function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    
    // 移除所有按钮的激活样式，添加通用样式
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-btn-active', 'shadow');
        b.classList.add('tab-btn');
    });
    
    // 为当前点击的按钮添加激活样式
    const activeBtn = document.getElementById('btn-'+t);
    activeBtn.classList.remove('tab-btn');
    activeBtn.classList.add('tab-btn-active', 'shadow');
}

// ================== 问题 2: JSON 完美格式化重构 ==================
function formatJson() {
    const el = document.getElementById('groupTemplate');
    try {
        const obj = JSON.parse(el.value);
        let str = "{\\n";
        const keys = Object.keys(obj);
        keys.forEach((k, idx) => {
            const arrStr = JSON.stringify(obj[k]); // 将数组强制为单行字符串
            str += \`  "\${k}": \${arrStr}\`;
            if(idx < keys.length - 1) str += ",\\n";
            else str += "\\n";
        });
        str += "}";
        el.value = str;
        localStorage.setItem('iptv_auto_tmpl', str);
    } catch(e){}
}

// ================== 问题 3, 4: 添加分组自定义弹窗 ==================
function closeModal() { document.getElementById('addGModal').classList.add('hidden'); }
function showAddGroupModal() { 
    document.getElementById('newGName').value = ''; 
    document.getElementById('newGKeys').value = ''; 
    document.getElementById('addGModal').classList.remove('hidden'); 
}
function addGroupAction() {
    const name = document.getElementById('newGName').value.trim();
    const keys = document.getElementById('newGKeys').value.trim();
    if(!name) return;
    try {
        const tmplArea = document.getElementById('groupTemplate');
        const tmpl = JSON.parse(tmplArea.value);
        tmpl[name] = keys ? keys.split(',').map(k => k.trim()) : [];
        tmplArea.value = JSON.stringify(tmpl);
        formatJson();
        applyTemplate();
        closeModal();
    } catch(e) {}
}

function uiDelGroup() {
    if(curG >= 0 && confirm("确定删除该分组吗?")){
        try {
            const tmplArea = document.getElementById('groupTemplate');
            const tmpl = JSON.parse(tmplArea.value);
            delete tmpl[data[curG].name];
            tmplArea.value = JSON.stringify(tmpl);
            formatJson();
            data.splice(curG, 1); curG = -1; renderG();
        } catch(e){}
    }
}

// ================== 问题 6: 频道多选逻辑 ==================
function renderC() {
    const cEl = document.getElementById('channelList');
    if(!data[curG]) { cEl.innerHTML = ""; return; }
    cEl.innerHTML = data[curG].channels.map((ch, i) => \`
        <div onclick="selectC(\${i}, event)" class="p-2 border-b cursor-pointer text-xs mb-1 rounded flex items-center transition-all \${curC===i?'list-item-active':''}">
            <input type="checkbox" class="channel-checkbox" value="\${i}" onclick="event.stopPropagation()">
            <span>\${ch.name}</span> <span class="text-slate-400 ml-auto">(\${ch.urls.length})</span>
        </div>\`).join('');
    // 清除详情面板
    document.getElementById('cRename').value = ''; document.getElementById('cTvgId').value = ''; document.getElementById('urlEditor').value = ''; document.getElementById('urlCount').innerText = '';
}

function mergeSelectedChannels() {
    const checked = Array.from(document.querySelectorAll('.channel-checkbox:checked')).map(cb => parseInt(cb.value));
    if(checked.length < 2) return alert("请在频道列表中勾选至少 2 个频道进行合并");
    if(!confirm(\`确定合并选中的 \${checked.length} 个频道吗?\`)) return;
    const channels = data[curG].channels;
    let urls = [];
    checked.forEach(idx => urls.push(...channels[idx].urls));
    // 去重
    const uniqueUrls = [...new Set(urls)];
    const firstIdx = checked[0];
    channels[firstIdx].urls = uniqueUrls;
    channels[firstIdx].name = channels[firstIdx].name.split('-')[0] + ' (已聚合)';
    // 反向删除，避免索引错乱
    checked.slice(1).sort((a,b)=>b-a).forEach(idx => channels.splice(idx, 1));
    curC = firstIdx; renderC(); renderU();
}

// 其他逻辑保持之前代码
function parseSources() { /* ... */ }
function renderG() { /* ... */ }
function selectG(i){ curG=i; curC=0; renderG(); }
function selectC(i, e) {
    // 排除复选框点击
    if (e.target.type === 'checkbox') return;
    curC = i; renderC();
}
// ========================================================
</script>
`;

export default {
    async fetch(request, env) { /* ...后端KV逻辑不变... */ }
};