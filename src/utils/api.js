/**
 * 获取加密货币K线数据
 * @param {string} symbol - 交易对 (如 BTCUSDT)
 * @param {string} interval - 时间间隔 (如 15m, 1h, 4h, 1d)
 * @param {number} limit - 数据数量
 * @returns {Promise<object[]>} K线数据
 */
export async function getCryptoData(symbol, interval, limit = 200) {
  try {
    // okx base url
    const baseUrl = 'https://www.okx.com';

    // OKX API需要将交易对格式从BTCUSDT转换为BTC-USDT
    const okxSymbol = symbol.replace(/(\w+)(USDT)/, '$1-$2');
    const okxInterval = interval.replace('h', 'H').replace('d', 'D');

    // 构建查询参数
    const params = new URLSearchParams({
      instId: okxSymbol,
      bar: okxInterval,
      limit: limit
    });
    // 获取K线指数价格
    const kline_url = `${baseUrl}/api/v5/market/index-candles`;
    const response = await fetch(`${kline_url}?${params}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // OKX API返回的数据格式: [ts, o, h, l, c, confirm]
    // 解析数据，返回 [open, high, low, close] 格式，按时间排序
    return result.data.map(item => [
      parseFloat(item[1]), // open
      parseFloat(item[2]), // high
      parseFloat(item[3]), // low
      parseFloat(item[4])  // close
    ]);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error(`获取 ${symbol} 数据失败: 请求超时`);
    } else {
      console.error(`获取 ${symbol} 数据失败:`, error.message);
    }
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
