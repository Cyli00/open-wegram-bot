/**
 * Message Service
 * 消息格式化和推送服务
 */

import { config } from './config.js';
import { postToTelegramApi } from './core.js';

export class MessageService {
    constructor() {
        this.botToken = config.telegram.token;
        this.chatId = config.telegram.chatId;
    }

    /**
     * 发送消息到Telegram
     * @param {string} message - 消息内容
     */
    async sendMessage(message) {
        try {
            const response = await postToTelegramApi(this.botToken, 'sendMessage', {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Telegram API error: ${errorData.description}`);
            }

            console.log('Message sent successfully');
            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * 格式化RSI消息
     * @param {Object} btcRSI - 比特币RSI数据
     * @param {Object} ethRSI - 以太坊RSI数据
     */
    formatRSIMessage(btcRSI, ethRSI) {
        const formatRSIData = (symbol, data) => {
            let result = `*${symbol}*\n`;
            
            for (const [timeframe, rsi] of Object.entries(data)) {
                const rsi6 = rsi.rsi6 ? rsi.rsi6.toFixed(2) : 'N/A';
                const rsi14 = rsi.rsi14 ? rsi.rsi14.toFixed(2) : 'N/A';
                
                // 添加RSI信号指示
                const rsi6Signal = this.getRSISignal(rsi.rsi6);
                const rsi14Signal = this.getRSISignal(rsi.rsi14);
                
                result += `${timeframe}: RSI(6)=${rsi6}${rsi6Signal} RSI(14)=${rsi14}${rsi14Signal}\n`;
            }
            
            return result;
        };

        const timestamp = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `🔍 *RSI技术指标报告*\n\n` +
               `📅 ${timestamp}\n\n` +
               `${formatRSIData('₿ BTC', btcRSI)}\n` +
               `${formatRSIData('Ξ ETH', ethRSI)}\n` +
               `💡 *信号说明*\n` +
               `🔴 >70: 超买区域\n` +
               `🟢 <30: 超卖区域\n` +
               `🟡 30-70: 正常区域`;
    }

    /**
     * 格式化价格和EMA距离消息
     * @param {Object} btcEMA - 比特币EMA数据
     * @param {Object} ethEMA - 以太坊EMA数据
     */
    formatPriceMessage(btcEMA, ethEMA) {
        const formatPriceData = (symbol, data) => {
            let result = `*${symbol}*\n`;
            result += `当前价格: $${data.currentPrice.toFixed(2)}\n`;
            
            if (data.distanceToEMA50) {
                const signal50 = this.getEMASignal(data.distanceToEMA50);
                result += `EMA50距离: ${data.distanceToEMA50}%${signal50}\n`;
            }
            
            if (data.distanceToEMA100) {
                const signal100 = this.getEMASignal(data.distanceToEMA100);
                result += `EMA100距离: ${data.distanceToEMA100}%${signal100}\n`;
            }
            
            if (data.distanceToEMA200) {
                const signal200 = this.getEMASignal(data.distanceToEMA200);
                result += `EMA200距离: ${data.distanceToEMA200}%${signal200}\n`;
            }
            
            return result;
        };

        const timestamp = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `💰 *价格与EMA距离报告*\n\n` +
               `📅 ${timestamp}\n\n` +
               `${formatPriceData('₿ BTC', btcEMA)}\n` +
               `${formatPriceData('Ξ ETH', ethEMA)}\n` +
               `💡 *信号说明*\n` +
               `🟢 正值: 价格高于EMA(看涨)\n` +
               `🔴 负值: 价格低于EMA(看跌)\n` +
               `📊 距离越大，偏离程度越高`;
    }

    /**
     * 格式化恐惧贪婪指数消息（支持多数据源）
     * @param {Object} fearGreedData - 恐惧贪婪指数数据
     */
    formatFearGreedMessage(fearGreedData) {
        const timestamp = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        let message = `😰 *恐惧贪婪指数报告*\n\n📅 ${timestamp}\n\n`;

        // 如果是综合数据
        if (fearGreedData.alternative || fearGreedData.coinmarketcap) {
            message += `📊 *多数据源对比*\n`;
            
            // Alternative.me数据
            if (fearGreedData.alternative) {
                const altValue = fearGreedData.alternative.value;
                const altIndicator = this.getEmotionIndicator(altValue);
                message += `🔸 Alternative.me: ${altValue}/100 ${altIndicator} (${fearGreedData.alternative.classification})\n`;
            }
            
            // CoinMarketCap数据
            if (fearGreedData.coinmarketcap) {
                const cmcValue = fearGreedData.coinmarketcap.value;
                const cmcIndicator = this.getEmotionIndicator(cmcValue);
                message += `🔸 CoinMarketCap: ${cmcValue}/100 ${cmcIndicator} (${fearGreedData.coinmarketcap.classification})\n`;
            }
            
            // 平均值
            if (fearGreedData.average) {
                const avgValue = fearGreedData.average.value;
                const avgIndicator = this.getEmotionIndicator(avgValue);
                message += `🎯 综合平均值: ${avgValue}/100 ${avgIndicator} (${fearGreedData.average.classification})\n\n`;
            } else {
                message += '\n';
            }
            
            // 使用平均值或可用数据给出建议
            const suggestionValue = fearGreedData.average?.value || 
                                  fearGreedData.alternative?.value || 
                                  fearGreedData.coinmarketcap?.value;
            
            if (suggestionValue) {
                const suggestion = this.getFearGreedSuggestion(suggestionValue);
                message += `💡 *综合解读*\n${suggestion}\n\n`;
            }
        } else {
            // 兼容旧格式（单一数据源）
            const value = parseInt(fearGreedData.value);
            const classification = fearGreedData.value_classification;
            const emotionIndicator = this.getEmotionIndicator(value);
            const suggestion = this.getFearGreedSuggestion(value);
            
            message += `📊 当前指数: ${value}/100\n` +
                      `🎯 市场情绪: ${emotionIndicator} ${classification}\n\n` +
                      `💡 *指数解读*\n${suggestion}\n\n`;
        }

        message += `📈 *指数范围*\n` +
                  `0-24: 极度恐惧 😱\n` +
                  `25-49: 恐惧 😟\n` +
                  `50-74: 贪婪 😊\n` +
                  `75-100: 极度贪婪 🤑\n\n` +
                  `📍 数据来源: `;
        
        // 添加数据源说明
        if (fearGreedData.alternative && fearGreedData.coinmarketcap) {
            message += `Alternative.me + CoinMarketCap`;
        } else if (fearGreedData.alternative || fearGreedData.coinmarketcap) {
            message += fearGreedData.alternative ? `Alternative.me` : `CoinMarketCap`;
        } else {
            message += `Alternative.me`;
        }

        return message;
    }

    /**
     * 格式化综合报告消息
     * @param {Object} data - 综合数据
     */
    formatComprehensiveMessage(data) {
        const { btcRSI, ethRSI, btcEMA, ethEMA, fearGreedData } = data;
        
        const timestamp = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 综合分析
        const analysis = this.generateComprehensiveAnalysis(data);

        // 获取恐惧贪婪指数显示值
        const fearGreedDisplay = this.getFearGreedDisplayValue(fearGreedData);

        return `📊 *加密货币综合技术分析*\n\n` +
               `📅 ${timestamp}\n\n` +
               `🔍 *当前市场概况*\n` +
               `₿ BTC: $${btcEMA.currentPrice.toFixed(2)}\n` +
               `Ξ ETH: $${ethEMA.currentPrice.toFixed(2)}\n\n` +
               `😰 *市场情绪*\n` +
               `${fearGreedDisplay}\n\n` +
               `📈 *技术指标摘要*\n` +
               `${this.generateTechnicalSummary(btcRSI, ethRSI, btcEMA, ethEMA)}\n\n` +
               `🎯 *综合分析*\n` +
               `${analysis}\n\n` +
               `⚠️ *风险提示*\n` +
               `本报告仅供参考，不构成投资建议。\n` +
               `加密货币投资存在高风险，请谨慎决策。`;
    }

    /**
     * 获取恐惧贪婪指数显示值
     * @param {Object} fearGreedData - 恐惧贪婪指数数据
     */
    getFearGreedDisplayValue(fearGreedData) {
        if (fearGreedData.average) {
            return `综合指数: ${fearGreedData.average.value}/100 (${fearGreedData.average.classification})`;
        } else if (fearGreedData.alternative) {
            return `恐惧贪婪指数: ${fearGreedData.alternative.value}/100 (${fearGreedData.alternative.classification})`;
        } else if (fearGreedData.coinmarketcap) {
            return `恐惧贪婪指数: ${fearGreedData.coinmarketcap.value}/100 (${fearGreedData.coinmarketcap.classification})`;
        } else {
            // 兼容旧格式
            const value = parseInt(fearGreedData.value || 50);
            const classification = fearGreedData.value_classification || 'Neutral';
            return `恐惧贪婪指数: ${value}/100 (${classification})`;
        }
    }

    /**
     * 生成技术指标摘要
     */
    generateTechnicalSummary(btcRSI, ethRSI, btcEMA, ethEMA) {
        let summary = '';
        
        // BTC技术指标
        const btcRSI1h = btcRSI['1h'];
        const btcRSI4h = btcRSI['4h'];
        
        if (btcRSI1h && btcRSI4h) {
            const btcSignal = this.getTechnicalSignal(btcRSI1h.rsi14, btcEMA.distanceToEMA50);
            summary += `₿ BTC: ${btcSignal}\n`;
        }
        
        // ETH技术指标
        const ethRSI1h = ethRSI['1h'];
        const ethRSI4h = ethRSI['4h'];
        
        if (ethRSI1h && ethRSI4h) {
            const ethSignal = this.getTechnicalSignal(ethRSI1h.rsi14, ethEMA.distanceToEMA50);
            summary += `Ξ ETH: ${ethSignal}`;
        }
        
        return summary;
    }

    /**
     * 生成综合分析
     */
    generateComprehensiveAnalysis(data) {
        const { fearGreedData, btcRSI, ethRSI, btcEMA, ethEMA } = data;
        
        // 获取恐惧贪婪指数值
        const fearGreedValue = this.getFearGreedValue(fearGreedData);
        
        let analysis = '';
        
        // 市场情绪分析
        if (fearGreedValue < 25) {
            analysis += '市场处于极度恐惧状态，可能是逢低买入的机会。';
        } else if (fearGreedValue < 50) {
            analysis += '市场情绪偏向恐惧，建议谨慎观望。';
        } else if (fearGreedValue < 75) {
            analysis += '市场情绪偏向贪婪，注意风险控制。';
        } else {
            analysis += '市场极度贪婪，建议考虑适当获利了结。';
        }
        
        // 技术指标分析
        const btcTrend = this.analyzeTrend(btcRSI, btcEMA);
        const ethTrend = this.analyzeTrend(ethRSI, ethEMA);
        
        analysis += `\n\n₿ BTC趋势: ${btcTrend}`;
        analysis += `\nΞ ETH趋势: ${ethTrend}`;
        
        return analysis;
    }

    /**
     * 获取恐惧贪婪指数值
     * @param {Object} fearGreedData - 恐惧贪婪指数数据
     */
    getFearGreedValue(fearGreedData) {
        if (fearGreedData.average) {
            return fearGreedData.average.value;
        } else if (fearGreedData.alternative) {
            return fearGreedData.alternative.value;
        } else if (fearGreedData.coinmarketcap) {
            return fearGreedData.coinmarketcap.value;
        } else {
            // 兼容旧格式
            return parseInt(fearGreedData.value || 50);
        }
    }

    /**
     * 分析趋势
     */
    analyzeTrend(rsiData, emaData) {
        const rsi1h = rsiData['1h']?.rsi14;
        const rsi4h = rsiData['4h']?.rsi14;
        const emaDistance = parseFloat(emaData.distanceToEMA50);
        
        if (rsi1h > 70 && rsi4h > 70) {
            return '短期超买，注意回调风险';
        } else if (rsi1h < 30 && rsi4h < 30) {
            return '短期超卖，可能有反弹机会';
        } else if (emaDistance > 5) {
            return '价格强势上涨，高于EMA50';
        } else if (emaDistance < -5) {
            return '价格弱势下跌，低于EMA50';
        } else {
            return '价格在合理区间内波动';
        }
    }

    /**
     * 获取RSI信号
     */
    getRSISignal(rsi) {
        if (rsi === null || rsi === undefined) return '';
        
        if (rsi > 70) return '🔴';
        if (rsi < 30) return '🟢';
        return '🟡';
    }

    /**
     * 获取EMA信号
     */
    getEMASignal(distance) {
        const value = parseFloat(distance);
        if (value > 0) return '🟢';
        if (value < 0) return '🔴';
        return '🟡';
    }

    /**
     * 获取情绪指示器
     */
    getEmotionIndicator(value) {
        if (value <= 24) return '😱';
        if (value <= 49) return '😟';
        if (value <= 74) return '😊';
        return '🤑';
    }

    /**
     * 获取恐惧贪婪指数建议
     */
    getFearGreedSuggestion(value) {
        if (value <= 24) {
            return '市场极度恐惧，历史上往往是好的买入时机。但仍需关注基本面。';
        } else if (value <= 49) {
            return '市场恐惧情绪较重，可以考虑分批建仓，但要控制仓位。';
        } else if (value <= 74) {
            return '市场情绪较为贪婪，建议保持谨慎，适当获利了结。';
        } else {
            return '市场极度贪婪，历史上往往是卖出的好时机，建议降低仓位。';
        }
    }

    /**
     * 获取技术信号
     */
    getTechnicalSignal(rsi, emaDistance) {
        const rsiValue = rsi || 50;
        const emaValue = parseFloat(emaDistance) || 0;
        
        if (rsiValue > 70 && emaValue > 0) {
            return '强势超买 🔴';
        } else if (rsiValue < 30 && emaValue < 0) {
            return '弱势超卖 🟢';
        } else if (emaValue > 5) {
            return '强势上涨 📈';
        } else if (emaValue < -5) {
            return '弱势下跌 📉';
        } else {
            return '震荡整理 📊';
        }
    }
}