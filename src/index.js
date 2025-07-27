import { handleScheduled, handleStartCommand, handleRsiCommand, handleEmaCommand, handleFearGreedCommand } from './scheduler.js';

export default {
  async fetch(request, env, ctx) {
    // 处理Telegram Webhook请求
    if (request.method === 'POST' && request.headers.get('content-type') === 'application/json') {
      try {
        const update = await request.json();
        
        // 检查是否为Telegram机器人的更新
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          
          // 只处理指定用户的消息
          if (chatId == env.USER_ID) {
            // 根据命令调用相应函数
            switch (text) {
              case '/start':
                await handleStartCommand(env);
                break;
              case '/rsi':
                await handleRsiCommand(env);
                break;
              case '/ema':
                await handleEmaCommand(env);
                break;
              case '/feargreed':
                await handleFearGreedCommand(env);
                break;
              case '/stop':
                await handleStopCommand(env);
                break;
              default:
                // 发送帮助信息
                await sendHelpMessage(env);
            }
          }
        }
        
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('处理Telegram更新失败:', error);
        return new Response('Error', { status: 500 });
      }
    }
    
    return new Response('Crypto Indicator Bot is running!');
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env));
  }
};

// 发送帮助信息
async function sendHelpMessage(env) {
  const message = `*加密货币指标机器人命令列表:*\n\n` +
    `/start - 开启机器人推送\n` +
    `/stop - 停止机器人推送\n` +
    `/rsi - 手动触发RSI指标\n` +
    `/ema - 手动触发价格和EMA分析\n` +
    `/feargreed - 手动触发恐惧贪婪指数\n` +
    `/ai - 调用AI生成综合技术分析报告`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: env.USER_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    return response.json();
  } catch (error) {
    console.error('发送帮助信息失败:', error);
    throw error;
  }
}