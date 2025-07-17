/**
 * Market Data Service
 * 负责获取加密货币市场数据和技术指标
 */

export class MarketDataService {
    constructor(config) {
        this.config = config;
        this.cmcApiKey = config.coinmarketcap.apiKey;
        this.cmcBaseUrl = config.coinmarketcap.baseUrl;
        this.binanceBaseUrl = config.binance.baseUrl;
        this.altBaseUrl = config.alternative.baseUrl;
    }

    /**
     * 从币安获取历史K线数据
     * @param {string} symbol - 币种符号
     * @param {string} interval - 时间间隔
     * @param {number} limit - 数据点数量
     */
    async getBinanceHistoricalData(symbol, interval, limit = 100) {
        try {
            const pair = this.config.binancePairs[symbol.toLowerCase()] || 'BTCUSDT';
            
            // 币安时间间隔映射
            const binanceInterval = this.mapToBinanceInterval(interval);
            
            const url = `${this.binanceBaseUrl}/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`;
            
            console.log(`Fetching Binance data: ${url}`);
            console.log(`Environment: ${typeof process !== 'undefined' ? 'Node.js' : 'Browser/Worker'}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log(`Binance response status:`, response.status);
            console.log(`Binance response headers:`, Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Binance API error response:`, errorText);
                
                // 如果是 403 错误，尝试使用简化的请求
                if (response.status === 403) {
                    console.log('Retrying with simpler request...');
                    try {
                        const simpleResponse = await fetch(url);
                        if (simpleResponse.ok) {
                            const data = await simpleResponse.json();
                            return this.formatBinanceData(data);
                        }
                    } catch (retryError) {
                        console.error('Retry failed:', retryError);
                    }
                }
                
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            console.log(`Binance data length:`, data.length);
            console.log(`Binance data sample:`, data.slice(0, 2));
            
            return this.formatBinanceData(data);
        } catch (error) {
            console.error(`Error fetching Binance data for ${symbol}:`, error);
            console.error(`Error stack:`, error.stack);
            throw error;
        }
    }

    /**
     * 格式化币安数据
     * @param {Array} data - 币安 K线数据
     */
    formatBinanceData(data) {
        // 转换币安数据格式为内部格式
        const formattedData = data.map(kline => ({
            timestamp: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5])
        }));
        
        console.log(`Formatted data sample:`, formattedData.slice(0, 3));
        
        return formattedData;
    }

    /**
     * 将时间间隔映射为币安格式
     * @param {string} interval - 内部时间间隔格式
     */
    mapToBinanceInterval(interval) {
        const intervalMap = {
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '8h': '8h',      // 币安支持 8h
            '12h': '12h',    // 币安支持 12h
            '1d': '1d'
        };
        return intervalMap[interval] || '1h';
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
            const coinId = this.config.coinIds[symbol.toLowerCase()] || this.config.coinIds.bitcoin;
            const url = `${this.cmcBaseUrl}/cryptocurrency/quotes/historical?id=${coinId}&count=${count}&interval=${interval}`;
            
            console.log(`Fetching historical data: ${url}`);
            console.log(`API Key length:`, this.cmcApiKey?.length || 0);
            
            const response = await fetch(url, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.cmcApiKey
                }
            });

            console.log(`Response status:`, response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error Response:`, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`API Response structure:`, Object.keys(data));
            console.log(`Data structure:`, data.data ? Object.keys(data.data) : 'No data field');
            
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
            const coinId = this.config.coinIds[symbol.toLowerCase()] || this.config.coinIds.bitcoin;
            
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
     * 获取恐惧贪婪指数 (Alternative.me)
     */
    /**
     * 获取恐惧贪婪指数
     * @param {string} source - 数据源 ('alternative' 或 'coinmarketcap')
     */
    async getFearGreedIndex(source = 'alternative') {
        if (source === 'coinmarketcap') {
            return await this.getCMCFearGreedIndex();
        } else {
            return await this.getAlternativeFearGreedIndex();
        }
    }

    /**
     * 获取Alternative.me恐惧贪婪指数
     */
    async getAlternativeFearGreedIndex() {
        try {
            const response = await fetch(`${this.altBaseUrl}/?limit=1&format=json`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data[0];
        } catch (error) {
            console.error('Error fetching fear and greed index from Alternative.me:', error);
            throw error;
        }
    }

    /**
     * 获取CoinMarketCap恐惧贪婪指数
     */
    async getCMCFearGreedIndex() {
        try {
            const response = await fetch(`${this.cmcBaseUrl}/fear-and-greed/historical?limit=1`, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.cmcApiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data[0];
        } catch (error) {
            console.error('Error fetching fear and greed index from CoinMarketCap:', error);
            throw error;
        }
    }

    /**
     * 获取综合恐惧贪婪指数，结合两个数据源
     */
    async getComprehensiveFearGreedIndex() {
        try {
            const results = {
                alternative: null,
                coinmarketcap: null,
                average: null,
                timestamp: new Date().toISOString()
            };

            // 并行获取两个数据源的数据
            const [altData, cmcData] = await Promise.allSettled([
                this.getAlternativeFearGreedIndex(),
                this.getCMCFearGreedIndex()
            ]);

            // 处理Alternative.me数据
            if (altData.status === 'fulfilled' && altData.value) {
                results.alternative = {
                    value: parseInt(altData.value.value),
                    classification: altData.value.value_classification,
                    timestamp: altData.value.timestamp
                };
            }

            // 处理CoinMarketCap数据
            if (cmcData.status === 'fulfilled' && cmcData.value) {
                results.coinmarketcap = {
                    value: parseInt(cmcData.value.value),
                    classification: cmcData.value.value_classification,
                    timestamp: cmcData.value.timestamp
                };
            }

            // 计算平均值（如果两个数据源都可用）
            if (results.alternative && results.coinmarketcap) {
                const avgValue = Math.round((results.alternative.value + results.coinmarketcap.value) / 2);
                results.average = {
                    value: avgValue,
                    classification: this.classifyFearGreedValue(avgValue)
                };
            }

            return results;
        } catch (error) {
            console.error('Error fetching comprehensive fear and greed index:', error);
            throw error;
        }
    }

    /**
     * 根据数值分类恐惧贪婪指数
     * @param {number} value - 恐惧贪婪指数值 (0-100)
     */
    classifyFearGreedValue(value) {
        if (value <= 20) return 'Extreme Fear';
        if (value <= 40) return 'Fear';
        if (value <= 60) return 'Neutral';
        if (value <= 80) return 'Greed';
        return 'Extreme Greed';
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
        
        console.log(`Getting RSI for ${symbol} using Binance API`);
        console.log(`Available intervals:`, this.config.intervals.rsi);
        
        for (const interval of this.config.intervals.rsi) {
            try {
                console.log(`Fetching Binance data for ${symbol} ${interval}`);
                const historicalData = await this.getBinanceHistoricalData(symbol, interval, 100);
                
                if (historicalData.length === 0) {
                    console.log(`No historical data for ${symbol} ${interval}`);
                    results[interval] = { rsi6: null, rsi14: null };
                    continue;
                }
                
                const prices = historicalData.map(item => item.close);
                console.log(`Prices sample for ${symbol} ${interval}:`, prices.slice(0, 5));
                
                const rsi6 = this.calculateRSI(prices, 6);
                const rsi14 = this.calculateRSI(prices, 14);
                
                results[interval] = {
                    rsi6: rsi6,
                    rsi14: rsi14
                };
                
                console.log(`RSI results for ${symbol} ${interval}:`, results[interval]);
            } catch (error) {
                console.error(`Error calculating RSI for ${symbol} ${interval}:`, error);
                results[interval] = { rsi6: null, rsi14: null };
            }
        }

        console.log(`Final RSI results for ${symbol}:`, results);
        return results;
    }

    /**
     * 获取EMA距离数据
     * @param {string} symbol - 币种符号
     */
    async getEMADistances(symbol) {
        try {
            // 使用币安获取当前价格和历史数据
            const historicalData = await this.getBinanceHistoricalData(symbol, '1h', 200);
            
            if (historicalData.length === 0) {
                throw new Error(`No historical data for ${symbol}`);
            }
            
            const prices = historicalData.map(item => item.close);
            const currentPrice = prices[prices.length - 1]; // 最新价格
            
            const ema50 = this.calculateEMA(prices, 50);
            const ema100 = this.calculateEMA(prices, 100);
            const ema200 = this.calculateEMA(prices, 200);
            
            return {
                currentPrice: currentPrice,
                ema50: ema50,
                ema100: ema100,
                ema200: ema200,
                distanceToEMA50: ema50 ? ((currentPrice - ema50) / ema50 * 100).toFixed(2) : null,
                distanceToEMA100: ema100 ? ((currentPrice - ema100) / ema100 * 100).toFixed(2) : null,
                distanceToEMA200: ema200 ? ((currentPrice - ema200) / ema200 * 100).toFixed(2) : null
            };
        } catch (error) {
            console.error(`Error calculating EMA distances for ${symbol}:`, error);
            throw error;
        }
    }
}