# 加密货币指标机器人 (Crypto Indicator Bot)

## 功能特性

### 📊 技术指标分析
- **RSI 指标**: 监控 6 和 14 周期的相对强弱指数
- **EMA 指标**: 计算 50、100、200 周期的指数移动平均线距离
- **恐惧贪婪指数**: 获取 Alternative.me 和 CoinMarketCap 的恐惧贪婪指数并提供综合分析

### ✈️ 定制推送
- ⏰ **每 1 小时**: 推送价格和 EMA 距离分析; 推送恐惧贪婪指数;推送综合技术分析报告
- 👋 **手动触发**：使用斜杠命令在任意时间获取技术指标。

### 📈 多时间框架支持
- 15 分钟线
- 1 小时线
- 4 小时线
- 8 小时线
- 12 小时线
- 日线

### 🤖 Slash Commands 支持
用户可以通过以下命令手动触发功能:
- `/start` - 开启机器人推送
- `/rsi` - 手动触发指标RSI
- `/ema` - 手动触发价格和EMA
- `/feargreed` - 手动触发贪婪指数
- `/ai` - 调用AI实现综合技术分析报告

## 部署方式

### 方式 1: Cloudflare Workers (推荐)

1. 确保已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

2. 克隆或下载项目代码
```bash
git clone <项目地址>
cd crypto-indicator-bot
```

3. 安装项目依赖
```bash
npm install
```

4. 登录Cloudflare账户
```bash
npx wrangler login

6. 设置Telegram Webhook（可选，用于手动触发命令）:
   部署后，使用以下URL设置Telegram Webhook:
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER_URL>/`
   
   或者在浏览器中访问以下URL:
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER_URL>/`
```

5. 在Cloudflare Workers控制台中设置环境变量:
   - `BOT_TOKEN`: 你的Telegram Bot Token
   - `USER_ID`: 你的Telegram用户ID
   - `COINMARKETCAP_API_KEY`: CoinMarketCap API密钥（可选）

6. 部署到Cloudflare Workers
```bash
npm run deploy
```