import { getCryptoData, getAlternativeMeFearGreedIndex, getCoinMarketCapFearGreedIndex, sendTelegramMessage } from './utils/api.js';
import { calculateCurrentRSI, calculateCurrentEMA, calculateEMADistance } from './utils/indicators.js';

// 支持的交易对
const SYMBOLS = ['BTC-USDT', 'ETH-USDT'];

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
export { handleStartCommand, handleRsiCommand, handleEmaCommand, handleFearGreedCommand };

/**
 * 处理/start命令
 */
async function handleStartCommand(env) {
  // 设置机器人为激活状态
  await env.BOT_STATE.put('active', 'true');
  
  const message = `*加密货币指标机器人已启动!*\n\n` +
    `你可以使用以下命令:\n` +
    `/rsi - 获取RSI指标\n` +
    `/ema - 获取价格和EMA分析\n` +
    `/fng - 获取恐惧贪婪指数\n`;
  
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}


/**
 * 处理/rsi命令
 */
async function handleRsiCommand(env) {
  await sendRsiFrames(env);
}

/**
 * 处理/ema命令
 */
async function handleEmaCommand(env) {
  await sendPriceAndEMADistance(env);
}

/**
 * 处理/feargreed命令
 */
async function handleFearGreedCommand(env) {
  await sendFearGreedIndex(env);
}

/**
 * 每15分钟任务：推送RSI指标
 */
async function sendRsiFrames(env) {
  console.log('执行每15分钟任务');
  
  let message = '*📈 多时间框架RSI指标*\n\n';
  
  for (const symbol of SYMBOLS) {
    message += `*${symbol}*\n`;
    
    // 获取不同时间框架的数据
    for (const [interval, label] of Object.entries(TIMEFRAMES)) {
      try {
        const data = await getCryptoData(symbol, interval, 200);
        const closes = data.map(d => d[3]); // d[3] 是 close 价格
        
        // 计算7周期和14周期RSI
        const rsi7 = calculateCurrentRSI(closes, 7);
        const rsi14 = calculateCurrentRSI(closes, 14);

        message += `${label}: RSI(7) ${rsi7 ? rsi7.toFixed(2) : 'N/A'}, RSI(14) ${rsi14 ? rsi14.toFixed(2) : 'N/A'}\n`;
      } catch (error) {
        message += `${label}: 数据获取失败\n`;
        console.error(`获取${symbol} ${interval}数据失败:`, error);
      }
    }
    message += '\n';
  }
  
  // 发送消息
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}

/**
 * 每小时任务：推送价格和EMA距离分析、恐惧贪婪指数、综合技术分析报告
 */
async function handleHourlyTask(env) {
  console.log('执行每小时任务');
  await sendRsiFrames(env);
  await sendPriceAndEMADistance(env);
  await sendFearGreedIndex(env);
}

/**
 * 发送价格和EMA距离分析
 */
async function sendPriceAndEMADistance(env) {
  let message = '*📊 价格和EMA距离分析*\n\n';
  
  for (const symbol of SYMBOLS) {
    message += `*${symbol}*\n`;
    
    try {
      // 获取1小时数据用于EMA计算
      const data = await getCryptoData(symbol, '1h', 300);
      const closes = data.map(d => d[3]); // d[3] 是 close 价格
      const currentPrice = closes[closes.length - 1]; // 现在是正序，最后一个是最新价格
      
      // 计算不同周期的EMA
      const ema50 = calculateCurrentEMA(closes, 50);
      const ema100 = calculateCurrentEMA(closes, 100);
      const ema200 = calculateCurrentEMA(closes, 200);

      // 计算EMA距离
      const distance50 = ema50 ? calculateEMADistance(currentPrice, ema50) : null;
      const distance100 = ema100 ? calculateEMADistance(currentPrice, ema100) : null;
      const distance200 = ema200 ? calculateEMADistance(currentPrice, ema200) : null;
      
      message += `当前价格: $${currentPrice.toFixed(2)}\n`;
      message += `EMA50距离: ${distance50 ? distance50.toFixed(2) + '%' : 'N/A'}\n`;
      message += `EMA100距离: ${distance100 ? distance100.toFixed(2) + '%' : 'N/A'}\n`;
      message += `EMA200距离: ${distance200 ? distance200.toFixed(2) + '%' : 'N/A'}\n\n`;
    } catch (error) {
      message += '数据获取失败\n\n';
      console.error(`获取${symbol}数据失败:`, error);
    }
  }
  
  // 发送消息
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}

/**
 * 发送恐惧贪婪指数
 */
async function sendFearGreedIndex(env) {
  let message = '*😨 恐惧贪婪指数*\n\n';
  
  try {
    // 获取Alternative.me恐惧贪婪指数
    const altMeData = await getAlternativeMeFearGreedIndex();
    const altMeIndex = altMeData.data[0];
    
    message += `*Alternative.me*\n`;
    message += `指数: ${altMeIndex.value}\n`;
    message += `状态: ${altMeIndex.value_classification}\n`;
    message += `更新时间: ${altMeIndex.timestamp}\n\n`;
    
    // 如果有CoinMarketCap API密钥，也获取其数据
    if (env.COINMARKETCAP_API_KEY) {
      try {
        const cmcData = await getCoinMarketCapFearGreedIndex(env.COINMARKETCAP_API_KEY);
        const cmcIndex = cmcData.data;
        message += `*CoinMarketCap.com*\n`;
        message += `指数: ${cmcIndex.value}\n`;
        message += `状态: ${cmcIndex.value_classification}\n`;
        message += `更新时间: ${cmcIndex.update_time}\n\n`;
      } catch (error) {
        console.error('获取CoinMarketCap恐惧贪婪指数失败:', error);
        message += `*CoinMarketCap*\n`;
        message += `获取失败: ${error.message}\n\n`;
      }
    }
  } catch (error) {
    message += '数据获取失败\n';
    console.error('获取恐惧贪婪指数失败:', error);
  }
  
  // 发送消息
  await sendTelegramMessage(env.BOT_TOKEN, env.USER_ID, message);
}