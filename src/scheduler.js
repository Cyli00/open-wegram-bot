import { getCryptoData, getAlternativeMeFearGreedIndex, getCoinMarketCapFearGreedIndex, sendTelegramMessage, getCoinbaseSpotPrice } from './utils/api.js';
import { calculateCurrentRSI, calculateCurrentEMA, calculateEMADistance, calculateSpotPremium } from './utils/indicators.js';

// OKX支持的交易对
const OKX_SYMBOLS = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'];

// Coinbase支持的交易对映射
const COINBASE_SYMBOLS = {
  'BTC-USDT': 'BTC-USD',
  'ETH-USDT': 'ETH-USD'
};

// 支持的时间框架
const TIMEFRAMES = {
  '15m': '15分钟',
  '1h': '1小时',
  '4h': '4小时',
  '1d': '日线'
};

/**
 * 检查机器人是否处于激活状态
 * @param {object} env - 环境变量
 * @returns {Promise<boolean>} 是否激活
 */
async function isBotActive(env) {
  try {
    const status = await env.BOT_STATE.get('active');
    return status === 'true';
  } catch (error) {
    console.error('检查机器人状态失败:', error);
    // 默认返回false，确保安全
    return false;
  }
}

/**
 * 处理定时任务
 * @param {object} event - Cloudflare Workers定时事件
 * @param {object} env - 环境变量
 */
export async function handleScheduled(event, env) {
  const cron = event.cron;
  console.log(`执行定时任务: ${cron}`);
  // 检查机器人是否激活
  const isActive = await isBotActive(env);
  if (isActive) {
    console.log('机器人激活!');
  } else {
    console.log('机器人未激活，跳过定时任务');
    return;
  }
  
  if (cron === '0 * * * *') {
    try {
      await handleHourlyTask(env);
    } catch (error) {
      console.error('执行每小时任务失败:', error);
    }
  }
}

// 导出处理slash command的函数
export { handleStartCommand, handleIndicatorCommand };

/**
 * 处理/start命令
 */
async function handleStartCommand(env) {
  // 设置机器人为激活状态
  await env.BOT_STATE.put('active', 'true');
  
  const message = `*加密货币指标机器人已启动!*\n\n` +
    `你可以使用以下命令:\n` +
    `/indicator - 获取技术指标分析（包含现货溢价）\n`;
  
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}


/**
 * 处理/indicator命令
 */
async function handleIndicatorCommand(env) {
  await sendTechnicalIndicators(env);
}


/**
 * 获取当前合约价格
 */
async function getCurrentPrices() {
  let priceData = '';
  for (const symbol of OKX_SYMBOLS) {
    try {
      const data = await getCryptoData(symbol, '1h', 1);
      const currentPrice = data[0][3];
      priceData += `${symbol}: *$${currentPrice.toFixed(2)}*\n`;
    } catch (error) {
      priceData += `${symbol}: N/A\n`;
    }
  }
  return priceData.slice(0, -1);
}

/**
 * 获取恐慌指数
 */
async function getFearGreedIndex(env) {
  try {
    const altMeData = await getAlternativeMeFearGreedIndex();
    const altMeIndex = altMeData.data[0];
    
    let fearGreedData = `😨 *恐惧贪婪指数*\n` +
      `*Alternative.me*: ${altMeIndex.value} (${altMeIndex.value_classification})`;
    
    // 如果有CoinMarketCap API密钥，也获取其数据
    if (env.COINMARKETCAP_API_KEY) {
      try {
        const cmcData = await getCoinMarketCapFearGreedIndex(env.COINMARKETCAP_API_KEY);
        const cmcIndex = cmcData.data;
        fearGreedData += `\n*CoinMarketCap*: ${cmcIndex.value} (${cmcIndex.value_classification})`;
      } catch (error) {
        console.error('获取CoinMarketCap恐惧贪婪指数失败:', error);
      }
    }
    
    return fearGreedData;
  } catch (error) {
    return '😨 *恐惧贪婪指数*\n  数据获取失败';
  }
}

/**
 * 获取当前现货溢价指数
 */
async function getSpotPremiumIndex() {
  let premiumData = '';
  
  for (const symbol of OKX_SYMBOLS) {
    try {
      // 获取合约价格
      const contractData = await getCryptoData(symbol, '1h', 1);
      const contractPrice = contractData[0][3];
      
      // 获取对应的现货价格
      const baseSymbol = symbol.replace('-USDT-SWAP', '-USDT');
      const coinbaseSymbol = COINBASE_SYMBOLS[baseSymbol];
      
      if (coinbaseSymbol) {
        const spotPrice = await getCoinbaseSpotPrice(coinbaseSymbol);
        const premium = calculateSpotPremium(spotPrice, contractPrice);
        
        if (premium !== null) {
          const coin = baseSymbol.split('-')[0];
          premiumData += `${coin}: *${premium.toFixed(3)}%*\n`;
        }
      }
    } catch (error) {
      console.error(`获取${symbol}现货溢价失败:`, error);
    }
  }
  
  return premiumData.trim() || '数据获取失败';
}

/**
 * 获取RSI数据
 */
async function getRSIData() {
  let rsiData = [];
  
  for (const symbol of OKX_SYMBOLS) {
    let symbolData = { symbol, timeframes: [] };
    
    // 获取不同时间框架的数据
    for (const [interval, label] of Object.entries(TIMEFRAMES)) {
      try {
        const data = await getCryptoData(symbol, interval, 200);
        const closes = data.map(d => d[3]);
        
        // 计算RSI
        const rsi7 = calculateCurrentRSI(closes, 7);
        const rsi14 = calculateCurrentRSI(closes, 14);
        
        symbolData.timeframes.push({
          interval: label,
          rsi7: rsi7 ? rsi7.toFixed(2) : 'N/A',
          rsi14: rsi14 ? rsi14.toFixed(2) : 'N/A'
        });
      } catch (error) {
        symbolData.timeframes.push({
          interval: label,
          rsi7: 'N/A',
          rsi14: 'N/A'
        });
        console.error(`获取${symbol} ${interval}RSI数据失败:`, error);
      }
    }
    rsiData.push(symbolData);
  }
  
  return rsiData;
}

/**
 * 获取4小时EMA数据
 */
async function get4HourEMAData() {
  let emaData = [];
  
  for (const symbol of OKX_SYMBOLS) {
    try {
      const data = await getCryptoData(symbol, '4h', 300);
      const closes = data.map(d => d[3]);
      const currentPrice = closes[closes.length - 1];
      
      const ema20 = calculateCurrentEMA(closes, 20);
      const ema50 = calculateCurrentEMA(closes, 50);
      const ema100 = calculateCurrentEMA(closes, 100);
      const ema200 = calculateCurrentEMA(closes, 200);
      
      const distance20 = ema20 ? calculateEMADistance(currentPrice, ema20) : null;
      const distance50 = ema50 ? calculateEMADistance(currentPrice, ema50) : null;
      const distance100 = ema100 ? calculateEMADistance(currentPrice, ema100) : null;
      const distance200 = ema200 ? calculateEMADistance(currentPrice, ema200) : null;
      
      emaData.push({
        symbol,
        ema20: { value: ema20 ? ema20.toFixed(2) : 'N/A', distance: distance20 ? distance20.toFixed(2) : 'N/A' },
        ema50: { value: ema50 ? ema50.toFixed(2) : 'N/A', distance: distance50 ? distance50.toFixed(2) : 'N/A' },
        ema100: { value: ema100 ? ema100.toFixed(2) : 'N/A', distance: distance100 ? distance100.toFixed(2) : 'N/A' },
        ema200: { value: ema200 ? ema200.toFixed(2) : 'N/A', distance: distance200 ? distance200.toFixed(2) : 'N/A' }
      });
    } catch (error) {
      emaData.push({
        symbol,
        ema20: { value: 'N/A', distance: 'N/A' },
        ema50: { value: 'N/A', distance: 'N/A' },
        ema100: { value: 'N/A', distance: 'N/A' },
        ema200: { value: 'N/A', distance: 'N/A' }
      });
      console.error(`获取${symbol} 4小时EMA数据失败:`, error);
    }
  }
  
  return emaData;
}

/**
 * 发送技术指标分析（RSI + EMA + 恐慌指数 + 现货溢价）
 */
async function sendTechnicalIndicators(env) {
  const priceData = await getCurrentPrices();
  const fearGreedData = await getFearGreedIndex(env);
  const rsiData = await getRSIData();
  const emaData = await get4HourEMAData();
  const spotPremiumData = await getSpotPremiumIndex();
  
  const message = `${priceData}\n\n` +
    `${fearGreedData}\n\n` +
    `*💹 RSI 指标*\n${formatRSIData(rsiData)}\n\n` +
    `*📈 EMA 分析*\n${formatEMAData(emaData)}\n\n` +
    `*💰 现货溢价指数*\n${spotPremiumData}`;
  
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}

/**
 * 格式化RSI数据
 */
function formatRSIData(rsiData) {
  let formatted = '';
  
  for (const symbolData of rsiData) {
    formatted += `*${symbolData.symbol}*\n`;
    
    for (const timeframe of symbolData.timeframes) {
      formatted += `${timeframe.interval}: *${timeframe.rsi7}*(7),*${timeframe.rsi14}*(14)\n`;
    }
    formatted += '\n';
  }
  
  return formatted.trim();
}

/**
 * 格式化EMA数据
 */
function formatEMAData(emaData) {
  let formatted = '';
  
  for (const symbolData of emaData) {
    formatted += `*${symbolData.symbol} 4小时EMA分析*\n`;
    formatted += `EMA20: ${symbolData.ema20.value} (${symbolData.ema20.distance}%)\n`;
    formatted += `EMA50: ${symbolData.ema50.value} (${symbolData.ema50.distance}%)\n`;
    formatted += `EMA100: ${symbolData.ema100.value} (${symbolData.ema100.distance}%)\n`;
    formatted += `EMA200: ${symbolData.ema200.value} (${symbolData.ema200.distance}%)\n\n`;
  }
  
  return formatted.trim();
}

/**
 * 每小时任务：推送技术指标和恐惧贪婪指数
 */
async function handleHourlyTask(env) {
  console.log('执行每小时任务');
  await sendTechnicalIndicators(env);
}