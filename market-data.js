/**
 * Market Data Service
 * 负责获取加密货币市场数据和技术指标
 */

import { config } from './config.js';

export class MarketDataService {
    constructor() {
        this.cmcApiKey = config.coinmarketcap.apiKey;
        this.cmcBaseUrl = config.coinmarketcap.baseUrl;
        this.altBaseUrl = config.alternative.baseUrl;
    }

    /**
     * 获取历史价格数据
     * @param {string} symbol - 币种符号
     * @param {string} interval - 时间间隔
     * @param {number} count - 数据点数量
     */
    async getHistoricalData(symbol, interval, count = 100) {
        try {
            // 使用 CoinMarketCap API 获取历史数据
            const coinId = config.coinIds[symbol.toLowerCase()] || config.coinIds.bitcoin;
            
            const response = await fetch(`${this.cmcBaseUrl}/cryptocurrency/quotes/historical?id=${coinId}&count=${count}&interval=${interval}`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.cmcApiKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data.quotes || [];
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * 获取当前价格
     * @param {string} symbol - 币种符号
     */
    async getCurrentPrice(symbol) {
        try {
            const coinId = config.coinIds[symbol.toLowerCase()] || config.coinIds.bitcoin;
            
            const response = await fetch(`${this.cmcBaseUrl}/cryptocurrency/quotes/latest?id=${coinId}`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.cmcApiKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data[coinId];
        } catch (error) {
            console.error(`Error fetching current price for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * 获取恐惧贪婪指数
     */
    async getFearGreedIndex() {
        try {
            const response = await fetch(`${this.altBaseUrl}/?limit=1&format=json`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data[0];
        } catch (error) {
            console.error('Error fetching fear and greed index:', error);
            throw error;
        }
    }

    /**
     * 计算RSI指标
     * @param {Array} prices - 价格数组
     * @param {number} period - 周期
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) {
            return null;
        }

        const gains = [];
        const losses = [];

        // 计算价格变化
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // 计算平均收益和损失
        const avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

        let currentAvgGain = avgGain;
        let currentAvgLoss = avgLoss;

        // 计算RSI
        for (let i = period; i < gains.length; i++) {
            currentAvgGain = (currentAvgGain * (period - 1) + gains[i]) / period;
            currentAvgLoss = (currentAvgLoss * (period - 1) + losses[i]) / period;
        }

        if (currentAvgLoss === 0) {
            return 100;
        }

        const rs = currentAvgGain / currentAvgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * 计算EMA指标
     * @param {Array} prices - 价格数组
     * @param {number} period - 周期
     */
    calculateEMA(prices, period) {
        if (prices.length < period) {
            return null;
        }

        const multiplier = 2 / (period + 1);
        let ema = prices[0];

        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    /**
     * 获取多时间框架RSI数据
     * @param {string} symbol - 币种符号
     */
    async getMultiTimeframeRSI(symbol) {
        const results = {};
        
        for (const interval of config.intervals.rsi) {
            try {
                const historicalData = await this.getHistoricalData(symbol, interval, 50);
                const prices = historicalData.map(item => item.quote.USD.close);
                
                results[interval] = {
                    rsi6: this.calculateRSI(prices, 6),
                    rsi14: this.calculateRSI(prices, 14)
                };
            } catch (error) {
                console.error(`Error calculating RSI for ${symbol} ${interval}:`, error);
                results[interval] = { rsi6: null, rsi14: null };
            }
        }

        return results;
    }

    /**
     * 获取EMA距离数据
     * @param {string} symbol - 币种符号
     */
    async getEMADistances(symbol) {
        try {
            const currentPrice = await this.getCurrentPrice(symbol);
            const price = currentPrice.quote.USD.price;
            
            const historicalData = await this.getHistoricalData(symbol, '1h', 200);
            const prices = historicalData.map(item => item.quote.USD.close);
            
            const ema50 = this.calculateEMA(prices, 50);
            const ema100 = this.calculateEMA(prices, 100);
            const ema200 = this.calculateEMA(prices, 200);
            
            return {
                currentPrice: price,
                ema50: ema50,
                ema100: ema100,
                ema200: ema200,
                distanceToEMA50: ema50 ? ((price - ema50) / ema50 * 100).toFixed(2) : null,
                distanceToEMA100: ema100 ? ((price - ema100) / ema100 * 100).toFixed(2) : null,
                distanceToEMA200: ema200 ? ((price - ema200) / ema200 * 100).toFixed(2) : null
            };
        } catch (error) {
            console.error(`Error calculating EMA distances for ${symbol}:`, error);
            throw error;
        }
    }
}