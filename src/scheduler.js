import { getCryptoData, getAlternativeMeFearGreedIndex, getCoinMarketCapFearGreedIndex, sendTelegramMessage, getCoinbaseSpotPrice } from './utils/api.js';
import { calculateCurrentRSI, calculateCurrentEMA, calculateEMADistance, calculateSpotPremium } from './utils/indicators.js';

// 简单的内存缓存
const cache = new Map();
const inFlight = new Map(); // 缓存中的在途请求去重
const CACHE_TTL = 30000; // 缓存30秒

/**
 * 获取缓存数据或执行函数（带并发去重）
 * @param {string} key - 缓存键
 * @param {Function} fn - 获取数据的函数，需返回Promise
 * @param {number} ttl - 缓存时间（毫秒）
 */
async function getCachedData(key, fn, ttl = CACHE_TTL) {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log(`使用缓存数据: ${key}`);
    return cached.data;
  }

  // 并发去重：如果已有同 key 在请求中，直接复用
  if (inFlight.has(key)) {
    try {
      const data = await inFlight.get(key);
      return data;
    } catch (e) {
      // 如果在途请求失败，继续走下面的fresh请求逻辑
    }
  }

  const p = (async () => {
    const data = await fn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  })();

  inFlight.set(key, p);
  try {
    return await p;
  } finally {
    inFlight.delete(key);
  }
}

// OKX支持的交易对
const OKX_SYMBOLS = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP'];

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
 * 统一超时包装
 * @param {Promise} promise
 * @param {number} ms
 */
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`请求超时(${ms}ms)`)), ms))
  ]);
}

/**
 * 获取并缓存原始K线数据，按 (symbol, interval, limit) 维度缓存
 */
async function getCachedOHLC(symbol, interval, limit) {
  const key = `ohlc_${symbol}_${interval}_${limit}`;
  // 对原始数据可复用默认TTL
  return getCachedData(key, () => withTimeout(getCryptoData(symbol, interval, limit), 10000));
}

/**
 * 获取当前合约价格
 */
async function getCurrentPrices() {
  // 并行获取所有交易对的价格
  const pricePromises = OKX_SYMBOLS.map(async (symbol) => {
    try {
      const data = await getCachedOHLC(symbol, '1h', 1);
      const currentPrice = data[0][3];
      return `${symbol}: *$${currentPrice.toFixed(2)}*`;
    } catch (error) {
      return `${symbol}: N/A`;
    }
  });
  
  const prices = await Promise.all(pricePromises);
  return prices.join('\n');
}

/**
 * 获取恐慌指数
 */
async function getFearGreedIndex(env) {
  return getCachedData('fear_greed_index', async () => {
    try {
      const tasks = [withTimeout(getAlternativeMeFearGreedIndex(), 10000)];
      const hasCMC = Boolean(env.COINMARKETCAP_API_KEY);
      if (hasCMC) {
        tasks.push(withTimeout(getCoinMarketCapFearGreedIndex(env.COINMARKETCAP_API_KEY), 10000));
      }

      const results = await Promise.allSettled(tasks);

      const altRes = results[0];
      let fearGreedData = '😨 *恐惧贪婪指数*';
      if (altRes.status === 'fulfilled') {
        const altMeIndex = altRes.value.data[0];
        fearGreedData += `\n*Alternative.me*: ${altMeIndex.value} (${altMeIndex.value_classification})`;
      } else {
        fearGreedData += `\n*Alternative.me*: N/A`;
      }

      if (hasCMC) {
        const cmcRes = results[1];
        if (cmcRes && cmcRes.status === 'fulfilled') {
          const cmcIndex = cmcRes.value.data;
          fearGreedData += `\n*CoinMarketCap*: ${cmcIndex.value} (${cmcIndex.value_classification})`;
        } else {
          console.error('获取CoinMarketCap恐惧贪婪指数失败');
        }
      }

      return fearGreedData;
    } catch (error) {
      return '😨 *恐惧贪婪指数*\n  数据获取失败';
    }
  }, 300000); // 恐惧贪婪指数缓存5分钟
}

/**
 * 获取当前现货溢价指数
 */
async function getSpotPremiumIndex() {
  // 并行获取所有交易对的现货溢价
  const premiumPromises = OKX_SYMBOLS.map(async (symbol) => {
    try {
      // 并行获取合约价格和现货价格
      const coinbaseSymbol = symbol.replace('-USDT-SWAP', '-USD');
      const coin = symbol.split('-')[0];
      
      const [contractData, spotPrice] = await Promise.all([
        getCachedOHLC(symbol, '1h', 1),
        withTimeout(getCoinbaseSpotPrice(coinbaseSymbol), 10000)
      ]);
      
      const contractPrice = contractData[0][3];
      const premium = calculateSpotPremium(spotPrice, contractPrice);
      
      if (premium !== null) {
        return `${coin}: *${premium.toFixed(3)}%*`;
      }
      return null;
    } catch (error) {
      console.error(`获取${symbol}现货溢价失败:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(premiumPromises);
  const validResults = results.filter(r => r !== null);
  return validResults.length > 0 ? validResults.join('\n') : '数据获取失败';
}

/**
 * 获取RSI数据
 */
async function getRSIData() {
  // 并行处理所有交易对
  const rsiPromises = OKX_SYMBOLS.map(async (symbol) => {
    // 并行获取该交易对的所有时间框架数据
    const timeframePromises = Object.entries(TIMEFRAMES).map(async ([interval, label]) => {
      const cacheKey = `rsi_${symbol}_${interval}`;
      
      return getCachedData(cacheKey, async () => {
        try {
          const data = await getCachedOHLC(symbol, interval, 200);
          const closes = data.map(d => d[3]);
          
          // 计算RSI
          const rsi7 = calculateCurrentRSI(closes, 7);
          const rsi14 = calculateCurrentRSI(closes, 14);
          
          return {
            interval: label,
            rsi7: rsi7 ? rsi7.toFixed(2) : 'N/A',
            rsi14: rsi14 ? rsi14.toFixed(2) : 'N/A'
          };
        } catch (error) {
          console.error(`获取${symbol} ${interval}RSI数据失败:`, error);
          return {
            interval: label,
            rsi7: 'N/A',
            rsi14: 'N/A'
          };
        }
      });
    });
    
    const timeframes = await Promise.all(timeframePromises);
    return { symbol, timeframes };
  });
  
  return Promise.all(rsiPromises);
}

/**
 * 获取4小时EMA数据
 */
async function get4HourEMAData() {
  // 并行处理所有交易对
  const emaPromises = OKX_SYMBOLS.map(async (symbol) => {
    const cacheKey = `ema_${symbol}_4h`;
    
    return getCachedData(cacheKey, async () => {
      try {
        const data = await getCachedOHLC(symbol, '4h', 300);
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
        
        return {
          symbol,
          ema20: { value: ema20 ? ema20.toFixed(2) : 'N/A', distance: distance20 ? distance20.toFixed(2) : 'N/A' },
          ema50: { value: ema50 ? ema50.toFixed(2) : 'N/A', distance: distance50 ? distance50.toFixed(2) : 'N/A' },
          ema100: { value: ema100 ? ema100.toFixed(2) : 'N/A', distance: distance100 ? distance100.toFixed(2) : 'N/A' },
          ema200: { value: ema200 ? ema200.toFixed(2) : 'N/A', distance: distance200 ? distance200.toFixed(2) : 'N/A' }
        };
      } catch (error) {
        console.error(`获取${symbol} 4小时EMA数据失败:`, error);
        return {
          symbol,
          ema20: { value: 'N/A', distance: 'N/A' },
          ema50: { value: 'N/A', distance: 'N/A' },
          ema100: { value: 'N/A', distance: 'N/A' },
          ema200: { value: 'N/A', distance: 'N/A' }
        };
      }
    }, 60000); // EMA数据缓存60秒
  });
  
  return Promise.all(emaPromises);
}

/**
 * 发送技术指标分析（RSI + EMA + 恐慌指数 + 现货溢价）
 */
async function sendTechnicalIndicators(env) {
  // 并行获取所有数据
  const [priceData, fearGreedData, rsiData, emaData, spotPremiumData] = await Promise.all([
    getCurrentPrices(),
    getFearGreedIndex(env),
    getRSIData(),
    get4HourEMAData(),
    getSpotPremiumIndex()
  ]);
  
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