/**
 * 获取加密货币K线数据
 * @param {string} symbol - 交易对 (如 BTCUSDT)
 * @param {string} interval - 时间间隔 (如 15m, 1h, 4h, 1d)
 * @param {number} limit - 数据数量
 * @returns {Promise<object[]>} K线数据
 */
export async function getCryptoData(symbol, interval, limit = 500) {
  try {
    // 使用Binance API获取数据
    const url = new URL('https://api.binance.com/api/v3/klines');
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('interval', interval);
    url.searchParams.append('limit', limit.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 解析数据，返回 [timestamp, open, high, low, close, volume, ...] 格式
    return data.map(item => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    }));
  } catch (error) {
    console.error(`获取 ${symbol} 数据失败:`, error.message);
    throw error;
  }
}

/**
 * 获取Alternative.me恐惧贪婪指数
 * @returns {Promise<object>} 恐惧贪婪指数数据
 */
export async function getAlternativeMeFearGreedIndex() {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取Alternative.me恐惧贪婪指数失败:', error.message);
    throw error;
  }
}

/**
 * 获取CoinMarketCap恐惧贪婪指数
 * @param {string} apiKey - CoinMarketCap API密钥
 * @returns {Promise<object>} 恐惧贪婪指数数据
 */
export async function getCoinMarketCapFearGreedIndex(apiKey) {
  try {
    const response = await fetch('https://pro-api.coinmarketcap.com/v1/fear-and-greed/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取CoinMarketCap恐惧贪婪指数失败:', error.message);
    throw error;
  }
}

/**
 * 发送Telegram消息
 * @param {string} token - Telegram bot token
 * @param {string} chatId - 用户ID
 * @param {string} message - 消息内容
 * @returns {Promise<object>} 发送结果
 */
export async function sendTelegramMessage(token, chatId, message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('发送Telegram消息失败:', error.message);
    throw error;
  }
}

/**
 * 调用AI API生成综合技术分析报告
 * @param {string} baseUrl - AI API基础URL
 * @param {string} apiKey - API密钥
 * @param {string} model - 模型名称
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} AI生成的分析报告
 */
export async function generateAIAnalysis(baseUrl, apiKey, model, prompt) {
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的加密货币技术分析师，能够根据提供的技术指标数据生成专业的分析报告。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('调用AI API失败:', error.message);
    throw error;
  }
}