/**
 * Scheduler Service
 * 定时任务管理系统
 */

import { MarketDataService } from './market-data.js';
import { MessageService } from './message-service.js';

export class SchedulerService {
    constructor(config) {
        this.config = config;
        this.marketData = new MarketDataService(config);
        this.messageService = new MessageService(config);
        this.intervals = new Map();
        this.isRunning = false;
    }

    /**
     * 启动所有定时任务
     */
    start() {
        if (this.isRunning) {
            console.log('Scheduler is already running');
            return;
        }

        this.isRunning = true;
        console.log('Starting scheduler...');

        // RSI 指标任务 - 每15分钟
        this.intervals.set('rsi', setInterval(async () => {
            await this.executeRSITask();
        }, this.config.scheduler.rsiInterval));

        // 价格和EMA距离任务 - 每1小时
        this.intervals.set('price', setInterval(async () => {
            await this.executePriceTask();
        }, this.config.scheduler.priceInterval));

        // 恐惧贪婪指数任务 - 每1小时
        this.intervals.set('fearGreed', setInterval(async () => {
            await this.executeFearGreedTask();
        }, this.config.scheduler.fearGreedInterval));

        // 综合报告任务 - 每1小时
        this.intervals.set('comprehensive', setInterval(async () => {
            await this.executeComprehensiveTask();
        }, this.config.scheduler.priceInterval));

        console.log('All schedulers started successfully');
    }

    /**
     * 停止所有定时任务
     */
    stop() {
        if (!this.isRunning) {
            console.log('Scheduler is not running');
            return;
        }

        this.isRunning = false;
        
        this.intervals.forEach((interval, name) => {
            clearInterval(interval);
            console.log(`Stopped ${name} scheduler`);
        });

        this.intervals.clear();
        console.log('All schedulers stopped');
    }

    /**
     * 执行RSI指标任务
     */
    async executeRSITask() {
        try {
            console.log('Executing RSI task...');
            
            const btcRSI = await this.marketData.getMultiTimeframeRSI('bitcoin');
            const ethRSI = await this.marketData.getMultiTimeframeRSI('ethereum');
            
            const message = this.messageService.formatRSIMessage(btcRSI, ethRSI);
            await this.messageService.sendMessage(message);
            
            console.log('RSI task completed');
        } catch (error) {
            console.error('Error in RSI task:', error);
        }
    }

    /**
     * 执行价格和EMA距离任务
     */
    async executePriceTask() {
        try {
            console.log('Executing price task...');
            
            const btcEMA = await this.marketData.getEMADistances('bitcoin');
            const ethEMA = await this.marketData.getEMADistances('ethereum');
            
            const message = this.messageService.formatPriceMessage(btcEMA, ethEMA);
            await this.messageService.sendMessage(message);
            
            console.log('Price task completed');
        } catch (error) {
            console.error('Error in price task:', error);
        }
    }

    /**
     * 执行恐惧贪婪指数任务
     */
    async executeFearGreedTask() {
        try {
            console.log('Executing fear and greed task...');
            
            const fearGreedData = await this.marketData.getComprehensiveFearGreedIndex();
            
            const message = this.messageService.formatFearGreedMessage(fearGreedData);
            await this.messageService.sendMessage(message);
            
            console.log('Fear and greed task completed');
        } catch (error) {
            console.error('Error in fear and greed task:', error);
        }
    }

    /**
     * 执行综合报告任务
     */
    async executeComprehensiveTask() {
        try {
            console.log('Executing comprehensive task...');
            
            // 获取所有数据
            const btcRSI = await this.marketData.getMultiTimeframeRSI('bitcoin');
            const ethRSI = await this.marketData.getMultiTimeframeRSI('ethereum');
            const btcEMA = await this.marketData.getEMADistances('bitcoin');
            const ethEMA = await this.marketData.getEMADistances('ethereum');
            const fearGreedData = await this.marketData.getComprehensiveFearGreedIndex();
            
            const message = this.messageService.formatComprehensiveMessage({
                btcRSI,
                ethRSI,
                btcEMA,
                ethEMA,
                fearGreedData
            });
            
            await this.messageService.sendMessage(message);
            
            console.log('Comprehensive task completed');
        } catch (error) {
            console.error('Error in comprehensive task:', error);
        }
    }

    /**
     * 手动执行任务
     * @param {string} taskName - 任务名称
     */
    async executeTask(taskName) {
        switch (taskName) {
            case 'rsi':
                await this.executeRSITask();
                break;
            case 'price':
                await this.executePriceTask();
                break;
            case 'fearGreed':
                await this.executeFearGreedTask();
                break;
            case 'comprehensive':
                await this.executeComprehensiveTask();
                break;
            default:
                console.log(`Unknown task: ${taskName}`);
        }
    }

    /**
     * 获取调度器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeIntervals: Array.from(this.intervals.keys()),
            config: this.config.scheduler
        };
    }
}