import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

/**
 * Post approved dalal report to Telegram channel
 * @param {Object} report - The approved community report
 * @param {Array} attachments - Array of report attachments with URLs
 * @returns {Promise<boolean>} - Success status
 */
export async function postToTelegramChannel(report, attachments = []) {
  try {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    
    if (!channelId || !process.env.TELEGRAM_BOT_TOKEN) {
      console.error('❌ Telegram configuration missing in environment variables');
      return false;
    }

    // Format the message text
    const messageText = formatReportMessage(report);

    // Get image URLs (max 5 images)
    const imageAttachments = attachments
      .filter(att => att.file_type === 'image')
      .slice(0, 5);

    if (imageAttachments.length === 0) {
      // Send text-only message if no images
      await bot.sendMessage(channelId, messageText, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      console.log('✅ Posted text-only report to Telegram channel');
      return true;
    }

    if (imageAttachments.length === 1) {
      // Send single photo with caption
      await bot.sendPhoto(channelId, imageAttachments[0].file_url, {
        caption: messageText,
        parse_mode: 'HTML'
      });
      console.log('✅ Posted report with 1 image to Telegram channel');
      return true;
    }

    // Send multiple photos as media group (2-5 images)
    const mediaGroup = imageAttachments.map((att, index) => ({
      type: 'photo',
      media: att.file_url,
      // Only add caption to the first image
      caption: index === 0 ? messageText : undefined,
      parse_mode: index === 0 ? 'HTML' : undefined
    }));

    await bot.sendMediaGroup(channelId, mediaGroup);
    console.log(`✅ Posted report with ${imageAttachments.length} images to Telegram channel`);
    return true;

  } catch (error) {
    console.error('❌ Failed to post to Telegram channel:', error);
    
    // Log specific error details
    if (error.response) {
      console.error('Telegram API Error:', error.response.body);
    }
    
    return false;
  }
}

/**
 * Format community report for Telegram message
 * @param {Object} report - The community report
 * @returns {string} - Formatted HTML message
 */
function formatReportMessage(report) {
  const title = report.title_en || report.title_bn || 'No Title';
  const description = report.description_en || report.description_bn || 'No description provided';
  const location = report.location_en || report.location_bn || 'Location not specified';
  const reporterName = report.is_anonymous ? 'Anonymous' : (report.reporter_name || 'Anonymous');
  const incidentDate = report.incident_date ? new Date(report.incident_date).toLocaleDateString('en-GB') : 'Date not specified';

  // Format message with HTML styling
  return `
🚨 <b>New Dalal Report Alert</b> 🚨

📌 <b>Title:</b> ${escapeHtml(title)}

📝 <b>Description:</b>
${escapeHtml(description)}

📍 <b>Location:</b> ${escapeHtml(location)}

📅 <b>Incident Date:</b> ${incidentDate}

👤 <b>Reported By:</b> ${escapeHtml(reporterName)}

⚠️ <i>This report has been reviewed and verified by BRTA administration.</i>

#DalalReport #BRTA #Community #Transport
`.trim();
}

/**
 * Escape HTML special characters to prevent injection
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Test Telegram connection
 * @returns {Promise<boolean>} - Connection status
 */
export async function testTelegramConnection() {
  try {
    const botInfo = await bot.getMe();
    console.log('✅ Telegram Bot connected:', botInfo.username);
    return true;
  } catch (error) {
    console.error('❌ Telegram connection failed:', error.message);
    return false;
  }
}

export default {
  postToTelegramChannel,
  testTelegramConnection
};
