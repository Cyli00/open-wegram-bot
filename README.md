# 加密货币指标机器人 (Crypto Indicator Bot)

基于 [open-wegram-bot](https://github.com/wozulong/open-wegram-bot) 开发的加密货币技术指标 Telegram 机器人。

## 功能特性

### 📊 技术指标分析
- **RSI 指标**: 监控 6 和 14 周期的相对强弱指数
- **EMA 指标**: 计算 50、100、200 周期的指数移动平均线距离
- **恐惧贪婪指数**: 获取 Alternative.me 的市场情绪数据

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

## 部署方式

### 方式 1: Cloudflare Workers (推荐)

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件填入实际值
```

3. 部署到 Cloudflare Workers：
```bash
npm run deploy
```

4. 在 Cloudflare Workers 后台配置环境变量：
- `COINMARKETCAP_API_KEY`: CoinMarketCap API 密钥
- `TELEGRAM_BOT_TOKEN`: Telegram Bot Token
- `TELEGRAM_CHAT_ID`: 接收消息的 Telegram 聊天 ID
- `SECRET_TOKEN`: 用于验证的密钥
- `ENABLE_SCHEDULER`: 设置为 `true` 启用定时任务

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

### 新增指标功能
- `GET /{prefix}/indicator/rsi` - 手动触发 RSI 指标推送
- `GET /{prefix}/indicator/price` - 手动触发价格分析推送
- `GET /{prefix}/indicator/feargreed` - 手动触发恐惧贪婪指数推送
- `GET /{prefix}/indicator/comprehensive` - 手动触发综合分析推送
- `GET /{prefix}/indicator/status` - 查看调度器状态
- `GET /{prefix}/indicator/start` - 启动调度器
- `GET /{prefix}/indicator/stop` - 停止调度器

## 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `COINMARKETCAP_API_KEY` | CoinMarketCap API 密钥 | 是 |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | 是 |
| `TELEGRAM_CHAT_ID` | 接收消息的聊天 ID | 是 |
| `SECRET_TOKEN` | 用于验证的密钥 | 是 |
| `PREFIX` | API 路径前缀 | 否 (默认: public) |
| `ENABLE_SCHEDULER` | 是否启用定时任务 | 否 (默认: false) |

## 获取所需的 API 密钥

### 1. CoinMarketCap API 密钥
1. 访问 [CoinMarketCap API](https://coinmarketcap.com/api/)
2. 注册账户并获取 API 密钥
3. 免费计划每月有 10,000 次调用限制

### 2. Telegram Bot Token
1. 在 Telegram 中找到 @BotFather
2. 发送 `/newbot` 创建新机器人
3. 按照指示获取 Bot Token

### 3. Telegram Chat ID
1. 将机器人添加到要接收消息的聊天中
2. 发送一条消息给机器人
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在返回的 JSON 中找到 `chat.id`

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

💡 信号说明
🔴 >70: 超买区域
🟢 <30: 超卖区域
🟡 30-70: 正常区域
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