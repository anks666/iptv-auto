# IPTV-Auto
IPTV直播源自动测速、分组、去重工具（Cloudflare Worker 执行，中国省份运营商可选）。

## 使用方法
- 用户直播源：在 `config/subscribe.txt` 中添加
- EPG 源：在 `config/epg.txt` 中添加
- 配置参数：在 `config/config.ini` 中修改 max_ipv4 / max_ipv6 等
- GitHub Actions 会每 2 小时自动生成
- Cloudflare Pages 部署后访问 `/result.m3u`

文件结构：
- config/：配置文件
- output/：生成结果（m3u、txt、json、ipv4、ipv6、epg、log）
