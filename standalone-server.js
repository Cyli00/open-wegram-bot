/**
 * Crypto Indicator Bot - Standalone Server Entry Point
 * 独立服务器版本，用于本地测试和专用服务器部署
 */

import { SchedulerService } from './scheduler.js';
import { config } from './config.js';

console.log('🚀 启动加密货币指标机器人...');

// 验证必要的环境变量
const requiredEnvVars = [
    'COINMARKETCAP_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
    console.error('请在.env文件中配置这些变量');
    process.exit(1);
}

// 创建调度器实例
const scheduler = new SchedulerService();

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log('\n🛑 接收到关闭信号，正在停止调度器...');
    scheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 接收到终止信号，正在停止调度器...');
    scheduler.stop();
    process.exit(0);
});

// 启动调度器
try {
    scheduler.start();
    console.log('✅ 调度器启动成功');
    console.log('📊 定时任务已开始运行');
    console.log('💡 使用 Ctrl+C 停止程序');
    
    // 显示配置信息
    console.log('\n📋 配置信息:');
    console.log(`- RSI任务间隔: ${config.scheduler.rsiInterval / 60000} 分钟`);
    console.log(`- 价格任务间隔: ${config.scheduler.priceInterval / 60000} 分钟`);
    console.log(`- 恐惧贪婪指数任务间隔: ${config.scheduler.fearGreedInterval / 60000} 分钟`);
    console.log(`- 监控币种: ${Object.values(config.symbols).join(', ')}`);

} catch (error) {
    console.error('❌ 启动调度器失败:', error);
    process.exit(1);
}

// 保持进程运行
setInterval(() => {
    // 每小时输出一次状态
    console.log(`⏰ ${new Date().toLocaleString('zh-CN')} - 系统运行中...`);
}, 3600000); // 1小时