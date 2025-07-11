/**
 * Crypto Indicator Bot - Enhanced Cloudflare Worker Entry Point
 * A two-way private messaging Telegram bot with cryptocurrency technical indicators
 *
 * Based on: https://github.com/wozulong/open-wegram-bot
 */

import {handleRequest} from './core.js';
import {SchedulerService} from '../scheduler.js';
import {createConfig} from '../config.js';

// 全局调度器实例
let scheduler = null;

export default {
    async fetch(request, env, ctx) {
        const config = {
            prefix: env.PREFIX || 'public',
            secretToken: env.SECRET_TOKEN || ''
        };

        // 初始化调度器（如果还没有创建）
        if (!scheduler && env.ENABLE_SCHEDULER === 'true') {
            // 使用传入的 env 创建配置
            scheduler = new SchedulerService(createConfig(env));
            
            // 启动定时任务
            ctx.waitUntil(scheduler.start());
        }

        // 处理手动命令
        const url = new URL(request.url);
        const path = url.pathname;
        
        if (path.startsWith(`/${config.prefix}/indicator/`)) {
            return handleIndicatorRequest(request, path, config.prefix, env);
        }

        return handleRequest(request, config);
    }
};

/**
 * 处理指标相关请求
 */
async function handleIndicatorRequest(request, path, prefix, env) {
    const pathParts = path.split('/');
    const command = pathParts[pathParts.length - 1];
    
    // 如果调度器未初始化，检查是否可以初始化
    if (!scheduler) {
        if (env.ENABLE_SCHEDULER === 'true') {
            // 临时创建调度器用于手动触发
            scheduler = new SchedulerService(createConfig(env));
        } else {
            return new Response(JSON.stringify({
                success: false,
                message: 'Scheduler not initialized. Set ENABLE_SCHEDULER=true'
            }), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
            });
        }
    }

    try {
        switch (command) {
            case 'rsi':
                await scheduler.executeTask('rsi');
                break;
            case 'price':
                await scheduler.executeTask('price');
                break;
            case 'feargreed':
                await scheduler.executeTask('fearGreed');
                break;
            case 'comprehensive':
                await scheduler.executeTask('comprehensive');
                break;
            case 'status':
                const status = scheduler.getStatus();
                return new Response(JSON.stringify(status), {
                    headers: {'Content-Type': 'application/json'}
                });
            case 'start':
                scheduler.start();
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Scheduler started'
                }), {
                    headers: {'Content-Type': 'application/json'}
                });
            case 'stop':
                scheduler.stop();
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Scheduler stopped'
                }), {
                    headers: {'Content-Type': 'application/json'}
                });
            default:
                return new Response(JSON.stringify({
                    success: false,
                    message: `Unknown command: ${command}`
                }), {
                    status: 400,
                    headers: {'Content-Type': 'application/json'}
                });
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Command ${command} executed successfully`
        }), {
            headers: {'Content-Type': 'application/json'}
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: `Error executing command: ${error.message}`
        }), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
}