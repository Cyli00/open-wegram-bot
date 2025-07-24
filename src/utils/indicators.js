/**
 * 计算RSI指标
 * @param {number[]} prices - 价格数组
 * @param {number} period - 周期
 * @returns {number} RSI值
 */
export function calculateRSI(prices, period) {
  if (prices.length < period + 1) {
    return null;
  }

  // 计算价格变化
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // 计算第一个周期的平均 gain 和 loss
  let gains = 0;
  let losses = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      gains += changes[i];
    } else {
      losses -= changes[i];
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // 计算后续的RSI值
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * 计算EMA指标
 * @param {number[]} prices - 价格数组
 * @param {number} period - 周期
 * @returns {number} EMA值
 */
export function calculateEMA(prices, period) {
  if (prices.length < period) {
    return null;
  }

  // 计算第一个SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let ema = sum / period;

  // 计算EMA乘数
  const multiplier = 2 / (period + 1);

  // 计算后续的EMA值
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * 计算价格与EMA的距离百分比
 * @param {number} price - 当前价格
 * @param {number} ema - EMA值
 * @returns {number} 距离百分比
 */
export function calculateEMADistance(price, ema) {
  if (ema === 0) {
    return 0;
  }
  return ((price - ema) / ema) * 100;
}