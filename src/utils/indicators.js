/**
 * 计算RSI指标
 * @param {number[]} prices - 价格数组（按时间顺序，从旧到新）
 * @param {number} period - 周期（默认14）
 * @returns {number|null} RSI值（0-100）或null
 */
export function calculateCurrentRSI(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length < period + 1) {
    return null;
  }

  // 验证输入数据有效性
  if (prices.some(price => typeof price !== 'number' || isNaN(price))) {
    return null;
  }

  // 计算价格变化
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // 分离涨跌幅并计算初始平均值
  let sumGain = 0;
  let sumLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      sumGain += changes[i];
    } else if (changes[i] < 0) {
      sumLoss += Math.abs(changes[i]);
    }
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  // 使用Wilder's平滑方法计算后续值
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    
    // Wilder's平滑公式
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  // 计算最终RSI
  if (avgLoss === 0) {
    return avgGain > 0 ? 100 : 50;
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // 确保RSI在有效范围内
  return Math.max(0, Math.min(100, rsi));
}

/**
 * 计算EMA指标
 * @param {number[]} prices - 价格数组（按时间顺序，从旧到新）
 * @param {number} period - 周期
 * @returns {number|null} EMA值或null
 */
export function calculateCurrentEMA(prices, period) {
  if (!Array.isArray(prices) || prices.length < period || period <= 0) {
    return null;
  }

  // 验证输入数据有效性
  if (prices.some(price => typeof price !== 'number' || isNaN(price))) {
    return null;
  }

  // 计算初始SMA作为第一个EMA值
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let ema = sum / period;

  // 计算平滑系数（标准EMA公式）
  const multiplier = 2 / (period + 1);

  // 从第period个数据开始计算EMA
  for (let i = period; i < prices.length; i++) {
    // 标准EMA公式：EMA = (当前价格 × 平滑系数) + (前一个EMA × (1 - 平滑系数))
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }

  return ema;
}

/**
 * 计算价格与EMA的距离百分比
 * @param {number} price - 当前价格
 * @param {number} ema - EMA值
 * @returns {number|null} 距离百分比或null（正值表示价格高于EMA）
 */
export function calculateEMADistance(price, ema) {
  // 输入验证
  if (typeof price !== 'number' || typeof ema !== 'number' || 
      isNaN(price) || isNaN(ema) || ema <= 0) {
    return null;
  }
  
  // 计算百分比距离
  return ((price - ema) / ema) * 100;
}