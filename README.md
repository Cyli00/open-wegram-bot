# 加密货币指标机器人 (Crypto Indicator Bot)

## 功能特性

### 📊 技术指标分析
- **RSI 指标**: 监控 6 和 14 周期的相对强弱指数
- **EMA 指标**: 计算 50、100、200 周期的指数移动平均线距离
- **恐惧贪婪指数**: 获取 Alternative.me 和 CoinMarketCap 的恐惧贪婪指数并提供综合分析

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
   - `OPENAI_BASE_URL`: AI API基础URL（可选，用于AI分析功能）
   - `OPENAI_API_KEY`: AI API密钥（可选，用于AI分析功能）
   - `MODEL`: AI模型名称（可选，用于AI分析功能）

6. 部署到Cloudflare Workers
```bash
npm run deploy
```

### **定时任务配置（Cron Triggers）**

项目已配置以下定时任务:
- `*/15 * * * *`: 每15分钟执行一次，推送RSI指标
- `0 * * * *`: 每小时执行一次，推送价格和EMA距离分析、恐惧贪婪指数、综合技术分析报告

## 需要用到的环境变量
BOT_TOKEN=
USER_ID=
COINMARKETCAP_API_KEY=
OPENAI_BASE_URL=  # 可选，用于AI分析功能
OPENAI_API_KEY=   # 可选，用于AI分析功能
MODEL=            # 可选，用于AI分析功能