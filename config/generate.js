import fs from 'fs';
import path from 'path';

const CONFIG_DIR = 'config';
const OUTPUT_DIR = 'output';
const LOG_DIR = path.join(OUTPUT_DIR, 'log');

// 创建目录
[OUTPUT_DIR, path.join(OUTPUT_DIR, 'ipv4'), path.join(OUTPUT_DIR, 'ipv6'), path.join(OUTPUT_DIR, 'epg'), LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function log(filename, message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(path.join(LOG_DIR, filename), `[${timestamp}] ${message}\n`);
}

// 读取 config.ini
function readConfig() {
  const content = fs.readFileSync(path.join(CONFIG_DIR, 'config.ini'), 'utf8');
  const config = {};
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key) config[key.trim()] = values.join('=').trim();
    }
  });
  return {
    maxIPv4: parseInt(config.max_ipv4) || 3,
    maxIPv6: parseInt(config.max_ipv6) || 3,
    timeout: parseInt(config.speed_timeout) || 8000,
    testBytes: parseInt(config.test_bytes) || 102400,
    upstreamSources: (config.upstream_sources || '').split(',').map(s => s.trim()).filter(Boolean),
    enableAlias: config.enable_alias !== 'false'
  };
}

const config = readConfig();

// 简单 m3u 解析
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

// 测速函数
async function testSpeed(url) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Range: `bytes=0-${config.testBytes - 1}` }
    });

    clearTimeout(timeoutId);
    const timeTaken = Date.now() - start;
    const speedMbps = timeTaken > 0 ? (config.testBytes / (timeTaken / 1000)) / (1024 * 1024) : 0;

    const hostname = new URL(url).hostname;
    const isIPv6 = hostname.includes(':') || /^[0-9a-f:]+$/i.test(hostname);

    log('speed_test.log', `${url} | ${speedMbps.toFixed(2)} Mbps | ${isIPv6 ? 'IPv6' : 'IPv4'}`);
    return { speed: speedMbps, ipType: isIPv6 ? 'ipv6' : 'ipv4' };
  } catch (e) {
    log('speed_test.log', `${url} | 失败`);
    return { speed: 0, ipType: 'ipv4' };
  }
}

async function main() {
  log('result.log', '=== 开始生成 IPTV 源 ===');
  console.log('🚀 开始处理直播源...');

  let allChannels = [];

  // 读取 subscribe.txt（用户源） + upstream
  const subscribePath = 'subscribe.txt';
  let userSources = [];
  if (fs.existsSync(subscribePath)) {
    userSources = fs.readFileSync(subscribePath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  }

  const allSources = [...config.upstreamSources, ...userSources];

  for (const url of allSources) {
    try {
      log('result.log', `获取源: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        allChannels.push(...parseM3U(text));
      }
    } catch (e) {
      log('result.log', `获取失败: ${url}`);
    }
  }

  // 简单别名（从 alias.txt 读取）
  const aliasMap = {};
  if (fs.existsSync(path.join(CONFIG_DIR, 'alias.txt'))) {
    fs.readFileSync(path.join(CONFIG_DIR, 'alias.txt'), 'utf8').split('\n').forEach(line => {
      if (line.includes('=')) {
        const [old, neu] = line.split('=').map(s => s.trim());
        aliasMap[old] = neu;
      }
    });
  }

  // 去重 + 分组 + 测速
  const channelMap = new Map();
  for (let ch of allChannels) {
    let name = ch.name.trim();
    if (aliasMap[name]) name = aliasMap[name];
    if (!channelMap.has(name)) channelMap.set(name, []);
    channelMap.get(name).push(ch);
  }

  const resultChannels = [];
  let ipv4Total = 0, ipv6Total = 0;

  for (const [name, sources] of channelMap) {
    const tested = await Promise.all(sources.map(async s => ({
      ...s,
      ...(await testSpeed(s.url))
    })));

    tested.sort((a, b) => b.speed - a.speed);

    // 分组（从 group.txt 读取）
    let group = '其他';
    if (fs.existsSync(path.join(CONFIG_DIR, 'group.txt'))) {
      const rules = fs.readFileSync(path.join(CONFIG_DIR, 'group.txt'), 'utf8').split('\n');
      for (const rule of rules) {
        if (rule.includes('=')) {
          const [gName, regexStr] = rule.split('=');
          if (new RegExp(regexStr.trim(), 'i').test(name)) {
            group = gName.trim();
            break;
          }
        }
      }
    }

    const ipv4Sources = tested.filter(t => t.ipType === 'ipv4').slice(0, config.maxIPv4);
    const ipv6Sources = tested.filter(t => t.ipType === 'ipv6').slice(0, config.maxIPv6);

    const bestUrls = [...ipv4Sources, ...ipv6Sources].map(t => t.url);

    if (bestUrls.length > 0) {
      resultChannels.push({ name, group, urls: bestUrls, tvgId: name });
      ipv4Total += ipv4Sources.length;
      ipv6Total += ipv6Sources.length;
    } else {
      log('unmatch.log', `无有效源: ${name}`);
    }
  }

  // 生成文件
  let m3uContent = '#EXTM3U\n';
  let txtContent = '';
  resultChannels.forEach(ch => {
    ch.urls.forEach(url => {
      m3uContent += `#EXTINF:-1 group-title="${ch.group}",${ch.name}\n${url}\n`;
      txtContent += `${ch.name},${url}\n`;
    });
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.m3u'), m3uContent);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.txt'), txtContent);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(resultChannels, null, 2));

  // 分离 IPv4 / IPv6（简化版，实际可进一步按 ipType 分文件）
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ipv4/result_ipv4.m3u'), m3uContent);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ipv6/result_ipv6.m3u'), m3uContent);

  // EPG（简单占位，可自行替换为真实下载）
  const epgContent = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n  <!-- EPG 数据可从 config/epg.txt 下载替换 -->\n</tv>';
  fs.writeFileSync(path.join(OUTPUT_DIR, 'epg/epg.xml'), epgContent);

  // 统计日志
  log('statistic.log', `总有效频道: ${resultChannels.length} | IPv4源: ${ipv4Total} | IPv6源: ${ipv6Total}`);
  log('result.log', '=== 生成完成 ===');

  console.log(`✅ 生成完成！共 ${resultChannels.length} 个频道`);
}

main().catch(err => {
  console.error(err);
  log('result.log', `错误: ${err.message}`);
});
