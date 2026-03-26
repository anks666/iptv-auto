# IPTV-Auto
IPTV直播源自动测速、分组、去重工具（Cloudflare Worker 执行，中国省份运营商可选）。

## 使用方法
- 用户直播源：在 `worker.js`如下位置修改
      upstreamSources: [
    "https://xxx.xxx/xx.m3u"
    "https://yyy.yy/yy1.m3u"
    "https://yyy.yy/yy2.m3u"
    "......"
  ],
- EPG 源：在`worker.js`如下位置修改
      upstreamSources: [
    "https://xxx.xxx/xx.m3u"
    "https://yyy.yy/yy1.m3u"
    "https://yyy.yy/yy2.m3u"
    "......"
  ]
- 配置参数：在 `worker.js`中修改 max_ipv4 / max_ipv6 等
- GitHub Actions 会每 24 小时自动运行
