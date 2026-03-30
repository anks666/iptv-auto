# IPTV-Auto 📺

基于 Cloudflare Workers 和 KV 的 Serverless IPTV 管理与自动测速项目。无需租用服务器，将直播源管理、客户端真实测速、智能分组和订阅生成集成于一体。

## 功能特性 (Features)
1. **多源输入与解析**：支持标准的 `频道,URL` TXT 格式导入。
2. **客户端真实测速**：利用浏览器能力从 **用户当前网络** 对直播源进行延迟检测，而非代理服务器测速。
3. **去重与优选**：根据频道名精确合并重复源，并按响应速度将最快源前置。
4. **双栈保留**：支持自定义分别保留 IPv4 和 IPv6 最优源的数量。
5. **智能分组**：使用 JSON 模板自定义正则/关键字匹配规则，对央视、卫视、高清、4K等频道自动归类。
6. **全格式订阅导出**：一键生成 M3U、TXT、JSON 及基础 EPG (XML) 订阅链接，完美适配各大电视盒子及播放器。
7. **三合一 Web 面板**：内置配置页、测速进度面板、以及 HLS.js 网页在线播放器预览。

## 部署教程 (Deployment)

### 1. 准备 Cloudflare 环境
由于需要生成固定的订阅链接供播放器调用，本项目依赖 Cloudflare KV 数据库保存处理后的数据。
- 登录 Cloudflare Dashboard -> `Workers & Pages` -> `KV`。
- 创建一个命名空间，命名为 `IPTV_DATA`。
- 复制该 KV 的 `id`。

### 2. GitHub Actions 自动部署
1. Fork 本仓库。
2. 修改 `wrangler.toml` 文件，将你刚才复制的 KV `id` 替换进去：
   \`\`\`toml
   [[kv_namespaces]]
   binding = "IPTV_DATA"
   id = "你的_KV_ID_填在这里"
   \`\`\`
3. 在你的 GitHub 仓库中，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`，添加：
   - `CF_API_TOKEN`：你的 Cloudflare API 令牌（需勾选 Worker 编辑权限）。
   - `CF_ACCOUNT_ID`：你的 Cloudflare 账户 ID。
4. 提交代码至 `main` 分支，GitHub Actions 将会自动部署。部署成功后，你将获得一个 Worker 的外网访问域名。

## 注意事项
- **浏览器测速跨域限制 (CORS)**：为了实现真正的“用户端”测速，系统会在浏览器发起 `no-cors` 的请求，仅测算首字节到达时间(TTFB)来预估速度和可用性。它可能不会 100% 精确，但比服务器端测速更能反映出你本地宽带对源的连通性。
- **EPG 生成**：由于 Worker 环境无法抓取并缓存庞大的外网 EPG 数据，本系统生成的 EPG (XML) 仅为包含频道列表的结构化外壳，保证部分播放器在导入时不会报错。如有精准节目单需求，请在播放器中挂载专业的外部 EPG 源。
