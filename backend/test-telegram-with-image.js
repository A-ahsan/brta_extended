// Test posting a report with image to Telegram (simulates real approval)
import { postToTelegramChannel } from './telegramService.js';

const mockReport = {
  title_en: 'Dalal Demanding Extra Money at BRTA Office',
  title_bn: 'বিআরটিএ অফিসে দালাল অতিরিক্ত টাকা দাবি করছে',
  description_en: 'A dalal named "Karim" is openly demanding 5000 BDT extra for license processing at BRTA Mirpur office. He sits near the entrance and approaches people. He wears a blue shirt and has connections with staff inside.',
  description_bn: 'করিম নামের একজন দালাল বিআরটিএ মিরপুর অফিসে লাইসেন্স প্রসেসিংয়ের জন্য খোলাখুলি 5000 টাকা অতিরিক্ত দাবি করছেন। তিনি প্রবেশদ্বারের কাছে বসে মানুষের কাছে যান।',
  location_en: 'BRTA Regional Office, Mirpur-10, Dhaka',
  location_bn: 'বিআরটিএ আঞ্চলিক অফিস, মিরপুর-১০, ঢাকা',
  incident_date: '2025-12-27',
  reporter_name: 'Mohammad Hasan',
  is_anonymous: false,
  report_type: 'dalal'
};

const mockAttachments = [
  {
    file_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'
  },
  {
    file_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800'
  }
];

console.log('🧪 Testing Telegram Post with Images...\n');
console.log('📝 Report:', mockReport.title_en);
console.log('🖼️  Images:', mockAttachments.length);
console.log('');

postToTelegramChannel(mockReport, mockAttachments)
  .then(success => {
    if (success) {
      console.log('\n✅ SUCCESS! Check your Telegram channel @brta2o');
      console.log('   You should see:');
      console.log('   - 2 images');
      console.log('   - Full report details with emojis');
      console.log('   - Formatted text');
    } else {
      console.log('\n❌ FAILED to post to Telegram');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  });
