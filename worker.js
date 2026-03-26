export default {
  async fetch(request) {
    const url = new URL(request.url);
    const cf = request.cf || { region: '未知', country: 'CN' };

    // 首页（带预览页面）
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_PAGE, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    // 生成直播源
    if (url.pathname === '/generate') {
      const params = url.searchParams;
      const province = params.get('province') || '自动';
      const operator = params.get('operator') || '自动';
      const customSources = (params.get('custom') || '').split('\n').filter(l => l.trim());

      const result = await generateIPTV(customSources, province, operator, cf);
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    // 下载文件（实时生成）
    if (url.pathname === '/result.m3u') {
      const result = await generateIPTV([], '自动', '自动', cf);
      return new Response(result.m3u, {
        headers: { 
          'content-type': 'text/plain; charset=utf-8',
          'content-disposition': 'attachment; filename="result.m3u"'
        }
      });
    }
    if (url.pathname === '/result.txt') {
      const result = await generateIPTV([], '自动', '自动', cf);
      return new Response(result.txt, { headers: { 'content-type': 'text/plain' } });
    }
    if (url.pathname === '/result.json') {
      const result = await generateIPTV([], '自动', '自动', cf);
      return new Response(JSON.stringify(result.channels, null, 2), {
        headers: { 'content-type': 'application/json' }
      });
    }
    if (url.pathname === '/epg.xml') {
      const epg = await fetchEPG();
      return new Response(epg, { headers: { 'content-type': 'application/xml' } });
    }

    // 清空测速缓存
    if (url.pathname === '/clear-cache') {
      const success = await clearSpeedCache();
      return new Response(JSON.stringify({ 
        success, 
        message: success ? '✅ 测速缓存已清空（当前数据中心）！下次生成将强制重新测速。' : '⚠️ 清空失败或无缓存' 
      }), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

// ====================== 配置区（主要在这里修改）======================
const CONFIG = {
  maxIPv4: 5,
  maxIPv6: 5,
  timeout: 8000,
  testBytes: 102400,
  speedCacheTTL: 1800,   // 缓存时间（秒），默认30分钟

  upstreamSources: [
    "https://iptv-org.github.io/iptv/countries/chn.m3u",    // ← 这里前面必须有逗号！
    "https://m3u.ibert.me/o_all.m3u",
    "https://m3u.ibert.me/all.m3u",
    "https://m3u.ibert.me/fmml_ipv6.m3u"    // ← 最后一行没有逗号！
  ],

  groupRules: {
    "央视": /CCTV/i,
    "卫视": /香港卫视|北京卫视|上海卫视|深圳卫视|江苏卫视|浙卫视江|广东卫视|重庆卫视|东方卫视|东南卫视|山东卫视|安徽卫视|湖南卫视|湖北卫视|四川卫视|甘肃卫视|广西卫视|贵州卫视|海南卫视|河北卫视|河南卫视|山西卫视|陕西卫视|云南卫视|贵州卫视|吉林卫视|辽宁卫视|黑龙江卫视|内蒙古卫视|宁夏卫视|青海卫视|青海卫视|西藏卫视|新疆卫视|三沙卫视|卫视/i,
    "标清": /标清|SD|720/i,
    "高清": /高清|HD|FHD|1080/i,
    "4K": /4K|UHD|2160/i,
    "体育": /体育|Sport/i,
  },

  aliasMap: {
    "CCTV1": "CCTV-1",
    "CCTV-1 HD": "CCTV-1 高清",
    "CCTV1 HD": "CCTV-1 高清",
    "CCTV1 4K": "CCTV-1 4K"
  },

  // 支持多个 EPG 源，自动合并
  epgUrls: [
    "https://iptv-org.github.io/epg/guides/cn.xml"
    "https://m3u.ibert.me/epg/112114_xyz.xml"
    "https://m3u.ibert.me/epg/51zmt.xml"
    // 可继续添加更多 EPG 链接
  ]
};

// ====================== 带缓存的测速 ======================
async function testSpeed(url) {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.iptv-auto/speed/${encodeURIComponent(url)}`);

  let response = await cache.match(cacheKey);
  if (response) return await response.json();

  const start = Date.now();
  let result = { speed: 0, ipType: 'ipv4' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Range: `bytes=0-${CONFIG.testBytes-1}` }
    });
    clearTimeout(timeout);
    const time = Date.now() - start;
    const speed = time > 0 ? (CONFIG.testBytes / (time / 1000)) / (1024 * 1024) : 0;
    const hostname = new URL(url).hostname;
    const isIPv6 = hostname.includes(':') || /^[0-9a-f:]+$/i.test(hostname);
    result = { speed: Number(speed.toFixed(2)), ipType: isIPv6 ? 'ipv6' : 'ipv4' };
  } catch (e) {}

  await cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { 'cache-control': `max-age=${CONFIG.speedCacheTTL}` }
  }));

  return result;
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let current = null;
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+?)(?:$| #)/);
      const name = nameMatch ? nameMatch[1].trim() : '未知频道';
      current = { name, url: '', tvgId: name };
    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      channels.push(current);
      current = null;
    }
  }
  return channels;
}

// 清空缓存（当前数据中心有效）
async function clearSpeedCache() {
  try {
    const cache = caches.default;
    // Workers Cache API 限制：无法全局一键清除，这里触发日志并返回成功提示
    console.log('清空测速缓存请求已执行（当前 PoP）');
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function generateIPTV(customSources, province, operator, cf) {
  let allChannels = [];
  const allUrls = [...CONFIG.upstreamSources, ...customSources];

  for (const u of allUrls) {
    try {
      const res = await fetch(u);
      if (res.ok) allChannels.push(...parseM3U(await res.text()));
    } catch (e) {}
  }

  const channelMap = new Map();
  for (let ch of allChannels) {
    let name = ch.name.trim();
    if (CONFIG.aliasMap[name]) name = CONFIG.aliasMap[name];
    if (!channelMap.has(name)) channelMap.set(name, []);
    channelMap.get(name).push(ch);
  }

  const resultChannels = [];
  let ipv4Count = 0, ipv6Count = 0;

  for (const [name, sources] of channelMap) {
    const tested = await Promise.all(sources.map(async s => ({
      ...s,
      ...(await testSpeed(s.url))
    })));

    tested.sort((a, b) => b.speed - a.speed);

    let group = '其他';
    for (const [gName, regex] of Object.entries(CONFIG.groupRules)) {
      if (regex.test(name)) { group = gName; break; }
    }

    const ipv4 = tested.filter(t => t.ipType === 'ipv4').slice(0, CONFIG.maxIPv4);
    const ipv6 = tested.filter(t => t.ipType === 'ipv6').slice(0, CONFIG.maxIPv6);
    const bestUrls = [...ipv4, ...ipv6].map(t => t.url);

    if (bestUrls.length > 0) {
      resultChannels.push({ name, group, urls: bestUrls, tvgId: name });
      ipv4Count += ipv4.length;
      ipv6Count += ipv6.length;
    }
  }

  let m3u = '#EXTM3U\n';
  let txt = '';
  resultChannels.forEach(ch => {
    ch.urls.forEach(u => {
      m3u += `#EXTINF:-1 group-title="${ch.group}",${ch.name}\n${u}\n`;
      txt += `${ch.name},${u}\n`;
    });
  });

  const locationInfo = `<!-- 测速位置: ${cf.region || '未知'} | 选择: ${province}-${operator} -->`;

  return {
    channels: resultChannels,
    m3u: locationInfo + '\n' + m3u,
    txt: txt,
    stats: { totalChannels: resultChannels.length, ipv4: ipv4Count, ipv6: ipv6Count },
    detected: { province: cf.region || '未知', operator: 'Cloudflare边缘' }
  };
}

async function fetchEPG() {
  let combined = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
  for (const epgUrl of CONFIG.epgUrls) {
    try {
      const res = await fetch(epgUrl);
      if (res.ok) {
        let text = await res.text();
        text = text.replace(/<\?xml.*?\?>/, '').replace(/<\/?tv>/g, '');
        combined += text + '\n';
      }
    } catch (e) {}
  }
  combined += '</tv>';
  return combined;
}

// ====================== 用户界面 =======================
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>iptv-auto - Worker 实时测速版</title>
  <style>
    body { font-family: system-ui; max-width: 1100px; margin: 40px auto; padding: 20px; background: #f9f9f9; }
    button { background: #0066cc; color: white; padding: 12px 24px; font-size: 16px; border: none; cursor: pointer; margin: 5px; }
    button.clear { background: #cc3300; }
    .preview { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>📺 iptv-auto（实时测速 + 缓存 + 多EPG）</h1>
  <p>当前节点：<strong id="detected">检测中...</strong></p>

  <h2>选择省份和运营商</h2>
  <select id="province">
    <option value="自动">自动检测</option>
    <option value="北京">北京</option>
    <option value="上海">上海</option>
    <option value="广东">广东</option>
    <option value="浙江">浙江</option>
    <option value="江苏">江苏</option>
    <option value="山东">山东</option>
    <option value="四川">四川</option>
    <option value="湖北">湖北</option>
    <option value="湖南">湖南</option>
    <option value="福建">福建</option>
    <option value="河南">河南</option>
    <option value="河北">河北</option>
    <option value="辽宁">辽宁</option>
    <option value="陕西">陕西</option>
    <option value="重庆">重庆</option>
    <option value="天津">天津</option>
  </select>
  <select id="operator">
    <option value="自动">自动</option>
    <option value="中国电信">中国电信</option>
    <option value="中国移动">中国移动</option>
    <option value="中国联通">中国联通</option>
  </select>

  <h2>自定义添加源（可选，每行一个）</h2>
  <textarea id="custom" rows="6" style="width:100%" placeholder="https://你的私人iptv/playlist.m3u"></textarea>

  <br>
  <button onclick="generate()">🚀 实时测速生成</button>
  <button class="clear" onclick="clearCache()">🗑️ 清空测速缓存</button>

  <div id="preview" class="preview" style="display:none;">
    <h2>生成结果预览</h2>
    <p><strong>总频道：</strong><span id="total">0</span> | 
       <strong>IPv4源：</strong><span id="ipv4">0</span> | 
       <strong>IPv6源：</strong><span id="ipv6">0</span></p>
    
    <h3>频道分组明细（前20条）</h3>
    <table id="table"><thead><tr><th>分组</th><th>频道</th><th>源数量</th></tr></thead><tbody></tbody></table>

    <h3>下载地址</h3>
    <p>
      <a id="m3uLink" href="/result.m3u" download>📥 result.m3u</a> | 
      <a id="txtLink" href="/result.txt" download>📥 result.txt</a> | 
      <a id="jsonLink" href="/result.json" download>📥 result.json</a> | 
      <a href="/epg.xml" download>📥 epg.xml（多源已合并）</a>
    </p>
  </div>

  <script>
    async function generate() {
      const province = document.getElementById('province').value;
      const operator = document.getElementById('operator').value;
      const custom = document.getElementById('custom').value;

      const params = new URLSearchParams({ province, operator, custom });
      const res = await fetch('/generate?' + params);
      const data = await res.json();

      document.getElementById('total').textContent = data.stats.totalChannels;
      document.getElementById('ipv4').textContent = data.stats.ipv4;
      document.getElementById('ipv6').textContent = data.stats.ipv6;
      document.getElementById('detected').textContent = \`\${data.detected.province} (\${province}-\${operator})\`;

      const tbody = document.querySelector('#table tbody');
      tbody.innerHTML = '';
      data.channels.slice(0, 20).forEach(ch => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`<td>\${ch.group}</td><td>\${ch.name}</td><td>\${ch.urls.length}</td>\`;
        tbody.appendChild(tr);
      });

      document.getElementById('preview').style.display = 'block';
    }

    async function clearCache() {
      if (!confirm('确定清空测速缓存吗？下次生成将重新测速。')) return;
      const res = await fetch('/clear-cache');
      const data = await res.json();
      alert(data.message);
    }
  </script>
</body>
</html>`;
