# 加密货币指标机器人 (Crypto Indicator Bot)

基于 [open-wegram-bot](https://github.com/wozulong/open-wegram-bot) 开发的加密货币技术指标 Telegram 机器人。

## 功能特性

### 📊 技术指标分析
- **RSI 指标**: 监控 6 和 14 周期的相对强弱指数
- **EMA 指标**: 计算 50、100、200 周期的指数移动平均线距离
- **恐惧贪婪指数**: 获取 Alternative.me 和 CoinMarketCap 的市场情绪数据并提供综合分析

### ⏰ 定时推送
- **每 15 分钟**: 推送比特币和以太坊的多时间框架 RSI 指标
- **每 1 小时**: 推送价格和 EMA 距离分析
- **每 1 小时**: 推送恐惧贪婪指数
- **每 1 小时**: 推送综合技术分析报告

### 📈 多时间框架支持
- 15 分钟线
- 1 小时线
- 4 小时线
- 8 小时线
- 12 小时线
- 日线

### 📨 双向私聊功能（基于 open-wegram-bot）
- **消息转发**: 将用户消息转发给机器人所有者
- **回复功能**: 机器人所有者可以直接回复用户消息
- **用户识别**: 显示发送者的用户名和 ID
- **安全验证**: 使用 SECRET_TOKEN 确保消息安全

## 部署方式

### 方式 1: Cloudflare Workers (推荐)

#### 前提条件
- 拥有 Cloudflare 账户
- 已安装 Node.js (版本 16 或更高)
- Git 仓库（用于 CI/CD 部署）

#### 本地开发设置

1. **克隆项目并安装依赖**
```bash
git clone <your-repo-url>
cd crypto-indicator-bot
npm install
```

2. **配置 wrangler.toml**

项目已包含基础配置，你可以根据需要修改：
```toml
name = "crypto-indicator-bot"  # 修改为你的 Worker 名称
main = "src/worker.js"
compatibility_date = "2023-05-18"
keep_vars = true

[placement]
mode = "smart"
```

3. **本地开发和测试**
```bash
# 本地开发模式
npm run dev

# 这将启动本地开发服务器，通常在 http://localhost:8787
```

#### 方法 A: 通过命令行部署（快速部署）

1. **登录 Cloudflare**
```bash
npx wrangler login
```

2. **配置环境变量**
```bash
# 设置必需环境变量
npx wrangler secret put PREFIX              # 推荐值: public
npx wrangler secret put SECRET_TOKEN       # 至少16字符，包含大小写字母和数字
npx wrangler secret put COINMARKETCAP_API_KEY # CoinMarketCap API密钥
npx wrangler secret put ENABLE_SCHEDULER    # 设置为 true 启用定时任务
```

3. **部署到生产环境**
```bash
npm run deploy
```

#### 方法 B: 通过 Cloudflare Dashboard CI/CD 部署（推荐）

1. **在 Cloudflare Dashboard 中设置**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 转到 **Workers & Pages** > **Create application** > **Pages**
   - 选择 **Connect to Git**

2. **连接 Git 仓库**
   - 选择你的 Git 提供商（GitHub/GitLab）
   - 授权 Cloudflare 访问你的仓库
   - 选择要部署的仓库

3. **配置构建设置**
   ```
   项目名称: crypto-indicator-bot
   生产分支: main (或你的主分支)
   构建命令: npm install
   部署命令: npx wrangler deploy
   根目录: / (如果项目在子目录中则指定相应路径)
   ```

4. **设置环境变量**
   
   在 **Settings** > **Environment variables** 中添加：
   
   **生产环境变量 (Production)**:
   ```
   PREFIX=public
   SECRET_TOKEN=your_secret_token_here
   COINMARKETCAP_API_KEY=your_api_key_here
   ENABLE_SCHEDULER=true
   ```

5. **触发部署**
   - 点击 **Save and Deploy**
   - 或推送代码到配置的分支自动触发部署

#### 高级配置选项

1. **多环境部署**
```toml
# wrangler.toml
[env.staging]
name = "crypto-indicator-bot-staging"
vars = { ENABLE_SCHEDULER = "false" }

[env.production]  
name = "crypto-indicator-bot"
vars = { ENABLE_SCHEDULER = "true" }
```

部署到不同环境：
```bash
# 部署到 staging
npx wrangler deploy --env staging

# 部署到 production  
npx wrangler deploy --env production
```

2. **自定义域名配置**
```toml
# wrangler.toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

3. **定时任务配置（Cron Triggers）**
```toml
# wrangler.toml
[triggers]
crons = ["0 */1 * * *"]  # 每小时执行一次
```

#### 部署验证

1. **检查部署状态**
```bash
npx wrangler deployments list
```

2. **查看实时日志**
```bash
npx wrangler tail
```

3. **测试 API 端点**
```bash
# 测试基本功能
curl https://your-worker.your-subdomain.workers.dev/public/indicator/status

# 手动触发指标推送
curl https://your-worker.your-subdomain.workers.dev/public/indicator/rsi
```

#### 监控和维护

1. **查看 Worker 指标**
   - 在 Cloudflare Dashboard 中查看请求量、错误率等
   - **Workers & Pages** > 选择你的 Worker > **Metrics**

2. **配置告警**
   - 设置错误率或响应时间告警
   - **Workers & Pages** > 选择你的 Worker > **Settings** > **Triggers**

3. **日志管理**
```bash
# 实时查看日志
npx wrangler tail --format pretty

# 过滤特定日志
npx wrangler tail --format pretty --grep "ERROR"
```

#### 故障排除

常见问题及解决方案：

1. **部署失败**
   - 检查 `wrangler.toml` 配置
   - 确认 API Token 权限
   - 查看构建日志获取详细错误信息

2. **环境变量问题**
```bash
# 列出所有环境变量
npx wrangler secret list

# 删除错误的环境变量
npx wrangler secret delete VARIABLE_NAME
```

3. **性能优化**
   - 启用 Smart Placement：`mode = "smart"`
   - 使用 KV 存储缓存数据
   - 配置适当的 `compatibility_date`

### 方式 2: 独立服务器

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件填入实际值
```

3. 启动服务：
```bash
npm start
```

## API 端点

### 原有功能（继承自 open-wegram-bot）
- `GET /{prefix}/install/{owner_uid}/{bot_token}` - 安装 webhook
- `POST /{prefix}/webhook/{owner_uid}/{bot_token}` - 处理 webhook
- `GET /{prefix}/uninstall/{bot_token}` - 卸载 webhook

### 新增指标功能（需要 bot_token 和 chat_id 参数）
- `GET /{prefix}/indicator/rsi?bot_token=xxx&chat_id=xxx` - 手动触发 RSI 指标推送
- `GET /{prefix}/indicator/price?bot_token=xxx&chat_id=xxx` - 手动触发价格分析推送
- `GET /{prefix}/indicator/feargreed?bot_token=xxx&chat_id=xxx` - 手动触发恐惧贪婪指数推送
- `GET /{prefix}/indicator/comprehensive?bot_token=xxx&chat_id=xxx` - 手动触发综合分析推送
- `GET /{prefix}/indicator/status` - 查看调度器状态
- `GET /{prefix}/indicator/start` - 启动调度器
- `GET /{prefix}/indicator/stop` - 停止调度器

## 使用流程

### 1. 部署机器人
1. 按照上述步骤部署到 Cloudflare Workers
2. 设置必需的环境变量：`PREFIX`, `SECRET_TOKEN`, `COINMARKETCAP_API_KEY`, `ENABLE_SCHEDULER`

### 2. 注册机器人
使用 open-wegram-bot 的标准流程：
```bash
# 安装 webhook（这将同时注册机器人用于指标推送）
curl "https://your-worker.workers.dev/public/install/{your_uid}/{your_bot_token}"
```

### 3. 使用指标功能
- **自动推送**: 启用 `ENABLE_SCHEDULER=true` 后，定时任务会自动推送指标
- **手动推送**: 通过 API 端点手动触发，需要提供 `bot_token` 和 `chat_id` 参数

## 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `PREFIX` | API 路径前缀 | 是 (推荐: public) |
| `SECRET_TOKEN` | 用于验证的密钥 | 是 (至少16字符，包含大小写字母和数字) |
| `COINMARKETCAP_API_KEY` | CoinMarketCap API 密钥 | 是 |
| `ENABLE_SCHEDULER` | 是否启用定时任务 | 是 (设置为 true) |

## 获取所需的 API 密钥

### CoinMarketCap API 密钥
1. 访问 [CoinMarketCap API](https://coinmarketcap.com/api/)
2. 注册账户并获取 API 密钥
3. 免费计划每月有 10,000 次调用限制

### Telegram Bot 设置
按照 [open-wegram-bot 文档](https://github.com/wozulong/open-wegram-bot) 的说明：
1. 在 Telegram 中找到 @BotFather
2. 发送 `/newbot` 创建新机器人
3. 按照指示获取 Bot Token
4. 通过 `/{prefix}/install/{owner_uid}/{bot_token}` 注册机器人

## 消息格式示例

### RSI 指标报告
```
🔍 RSI技术指标报告

📅 2024-01-15 14:30

₿ BTC
15m: RSI(6)=65.23🟡 RSI(14)=58.41🟡
1h: RSI(6)=72.15🔴 RSI(14)=68.92🟡
4h: RSI(6)=45.23🟡 RSI(14)=52.18🟡

Ξ ETH
15m: RSI(6)=55.67🟡 RSI(14)=48.23🟡
1h: RSI(6)=28.45🟢 RSI(14)=35.67🟡
4h: RSI(6)=62.18🟡 RSI(14)=59.23🟡

### 恐惧贪婪指数报告（多数据源）
```
😰 恐惧贪婪指数报告

📅 2024-01-15 14:30

📊 多数据源对比
🔸 Alternative.me: 42/100 😟 (Fear)
🔸 CoinMarketCap: 38/100 😟 (Fear)
🎯 综合平均值: 40/100 😟 (Fear)

💡 综合解读
市场情绪偏向恐惧，建议谨慎观望。

📈 指数范围
0-24: 极度恐惧 😱
25-49: 恐惧 😟
50-74: 贪婪 😊
75-100: 极度贪婪 🤑

📍 数据来源: Alternative.me + CoinMarketCap
```

## 技术架构

- **市场数据服务** (`market-data.js`): 负责获取加密货币数据和技术指标计算
- **消息服务** (`message-service.js`): 负责消息格式化和 Telegram 推送
- **调度器服务** (`scheduler.js`): 负责定时任务管理
- **配置管理** (`config.js`): 统一配置管理
- **核心功能** (`src/core.js`): 继承原有的 webhook 处理功能

## 许可证

本项目基于 GPL-3.0 许可证开源。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 免责声明

本工具仅供学习和参考使用，不构成投资建议。加密货币投资存在高风险，请谨慎决策。