/**
 * Indicator Bot Configuration
 * 配置文件，包含所有必要的API密钥和设置
 */

export const config = {
    // Telegram Bot Configuration
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
        secretToken: process.env.SECRET_TOKEN || ''
    },

    // CoinMarketCap API Configuration
    coinmarketcap: {
        apiKey: process.env.COINMARKETCAP_API_KEY || '',
        baseUrl: 'https://pro-api.coinmarketcap.com/v1'
    },

    // Alternative.me API Configuration
    alternative: {
        baseUrl: 'https://api.alternative.me/fng'
    },

    // Cryptocurrency symbols
    symbols: {
        bitcoin: 'BTC',
        ethereum: 'ETH'
    },

    // CoinMarketCap symbol IDs
    coinIds: {
        bitcoin: 1,
        ethereum: 1027
    },

    // Time intervals for analysis
    intervals: {
        rsi: ['15m', '1h', '4h', '8h', '12h', '1d'],
        ema: ['1h', '4h', '1d']
    },

    // RSI parameters
    rsi: {
        periods: [6, 14]
    },

    // EMA parameters
    ema: {
        periods: [50, 100, 200]
    },

    // Scheduler settings
    scheduler: {
        rsiInterval: 15 * 60 * 1000, // 15 minutes
        priceInterval: 60 * 60 * 1000, // 1 hour
        fearGreedInterval: 60 * 60 * 1000 // 1 hour
    }
};