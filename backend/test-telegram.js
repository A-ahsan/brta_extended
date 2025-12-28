// Quick test script to verify Telegram bot connection
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

console.log('🔍 Testing Telegram Configuration...\n');
console.log('Token:', token ? `${token.substring(0, 15)}...` : '❌ NOT SET');
console.log('Channel:', channelId || '❌ NOT SET');
console.log('');

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
  process.exit(1);
}

if (!channelId) {
  console.error('❌ TELEGRAM_CHANNEL_ID is missing!');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

async function test() {
  try {
    // Test 1: Get bot info
    console.log('📡 Test 1: Connecting to Telegram bot...');
    const botInfo = await bot.getMe();
    console.log('✅ Bot connected successfully!');
    console.log(`   Bot username: @${botInfo.username}`);
    console.log(`   Bot name: ${botInfo.first_name}`);
    console.log('');

    // Test 2: Try to send test message
    console.log('📡 Test 2: Sending test message to channel...');
    await bot.sendMessage(channelId, '🧪 Test message from BRTA Bot - Integration check!');
    console.log('✅ Message sent successfully!');
    console.log('   Check your channel: ' + channelId);
    console.log('');

    console.log('🎉 ALL TESTS PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:');
    console.error('   Error:', error.message);
    
    if (error.response) {
      console.error('   API Response:', error.response.body);
    }
    
    console.log('\n💡 Possible issues:');
    console.log('   1. Bot token is invalid or expired');
    console.log('   2. Bot is not admin in the channel');
    console.log('   3. Channel ID is wrong');
    console.log('   4. Bot does not have "Post Messages" permission');
    
    process.exit(1);
  }
}

test();
