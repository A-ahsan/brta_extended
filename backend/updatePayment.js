// Payment update and notification logic for result endpoints
import { supabase } from './supabaseClient.js';
import { sendPaymentNotification } from './notifications.js';
import axios from 'axios';
import https from 'https';

// Create an https agent that accepts self-signed certificates for internal calls
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function updatePaymentAndNotify({ status, sslczData }) {
  const tran_id = sslczData.tran_id;
  // Find payment by tran_id
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tran_id', tran_id)
    .single();
  if (error || !payment) return;

  // Check if this is a renewal payment
  const isRenewal = payment.payment_type === 'renewal' && payment.license_id;

  // Get application details or license details based on payment type
  let application, license, appNumber, userName, userNameBn;
  
  if (isRenewal) {
    const { data: licData } = await supabase
      .from('licenses')
      .select('license_number, full_name_en, full_name_bn')
      .eq('id', payment.license_id)
      .single();
    license = licData;
    appNumber = licData?.license_number || tran_id;
    userName = licData?.full_name_en || 'User';
    userNameBn = licData?.full_name_bn || 'ব্যবহারকারী';
  } else {
    const { data: appData } = await supabase
      .from('license_applications')
      .select('application_number, full_name_en, full_name_bn')
      .eq('id', payment.application_id)
      .single();
    application = appData;
    appNumber = appData?.application_number || tran_id;
    userName = appData?.full_name_en || 'User';
    userNameBn = appData?.full_name_bn || 'ব্যবহারকারী';
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status,
      sslcommerz_val_id: sslczData.val_id || null,
      sslcommerz_tran_date: sslczData.tran_date ? new Date(sslczData.tran_date) : null
    })
    .eq('tran_id', tran_id);

  // If payment is successful
  if (status === 'success') {
    if (isRenewal) {
      // Process license renewal
      try {
        const response = await axios.post('https://localhost:5000/api/licenses/renewal/process', {
          license_id: payment.license_id,
          user_id: payment.user_id,
          payment_id: payment.id
        }, {
          httpsAgent // Accept self-signed certificate for internal call
        });
        console.log('✅ License renewal processed:', response.data);
      } catch (err) {
        console.error('❌ Error processing license renewal:', err.response?.data || err.message);
      }
    } else {
      // Update license application
      await supabase
        .from('license_applications')
        .update({
          status: 'payment_completed',
          payment: 1,
          payment_completed_at: new Date().toISOString()
        })
        .eq('id', payment.application_id);
    }
  }

  // Compose bilingual, role-specific messages
  let userTitleEn, userTitleBn, userMsgEn, userMsgBn;
  let adminTitleEn, adminTitleBn, adminMsgEn, adminMsgBn;
  
  if (status === 'success') {
    if (isRenewal) {
      userTitleEn = 'License Renewal Payment Successful';
      userTitleBn = 'লাইসেন্স নবায়ন পেমেন্ট সফল';
      userMsgEn = `Your renewal payment of BDT ${payment.amount} for license ${appNumber} was successful. Your license has been renewed.`;
      userMsgBn = `আপনার লাইসেন্স ${appNumber} এর জন্য BDT ${payment.amount} নবায়ন পেমেন্ট সফল হয়েছে। আপনার লাইসেন্স নবায়ন করা হয়েছে।`;
      adminTitleEn = 'License Renewal Payment Received';
      adminTitleBn = 'লাইসেন্স নবায়ন পেমেন্ট প্রাপ্ত';
      adminMsgEn = `License ${appNumber} - Renewal Payment SUCCESS. Amount: BDT ${payment.amount}. User: ${userName}`;
      adminMsgBn = `লাইসেন্স ${appNumber} - নবায়ন পেমেন্ট সফল। পরিমাণ: BDT ${payment.amount}। ব্যবহারকারী: ${userNameBn}`;
    } else {
      userTitleEn = 'Payment Successful';
      userTitleBn = 'পেমেন্ট সফল হয়েছে';
      userMsgEn = `Your payment of BDT ${payment.amount} for application ${appNumber} was successful.`;
      userMsgBn = `আপনার আবেদন ${appNumber} এর জন্য BDT ${payment.amount} পেমেন্ট সফল হয়েছে।`;
      adminTitleEn = 'Payment Received';
      adminTitleBn = 'পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Application ${appNumber} - Payment SUCCESS. Amount: BDT ${payment.amount}`;
      adminMsgBn = `আবেদন ${appNumber} - পেমেন্ট সফল। পরিমাণ: BDT ${payment.amount}`;
    }
  } else if (status === 'failed') {
    const itemType = isRenewal ? 'license renewal' : 'application';
    const itemTypeBn = isRenewal ? 'লাইসেন্স নবায়ন' : 'আবেদন';
    userTitleEn = 'Payment Failed';
    userTitleBn = 'পেমেন্ট ব্যর্থ হয়েছে';
    userMsgEn = `Your payment for ${itemType} ${appNumber} failed. Please try again.`;
    userMsgBn = `আপনার ${itemTypeBn} ${appNumber} এর জন্য পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।`;
    adminTitleEn = 'Payment Failed';
    adminTitleBn = 'পেমেন্ট ব্যর্থ';
    adminMsgEn = `${isRenewal ? 'License' : 'Application'} ${appNumber} - Payment FAILED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `${isRenewal ? 'লাইসেন্স' : 'আবেদন'} ${appNumber} - পেমেন্ট ব্যর্থ। পরিমাণ: BDT ${payment.amount}`;
  } else if (status === 'cancelled') {
    const itemType = isRenewal ? 'license renewal' : 'application';
    const itemTypeBn = isRenewal ? 'লাইসেন্স নবায়ন' : 'আবেদন';
    userTitleEn = 'Payment Cancelled';
    userTitleBn = 'পেমেন্ট বাতিল হয়েছে';
    userMsgEn = `Your payment for ${itemType} ${appNumber} was cancelled.`;
    userMsgBn = `আপনার ${itemTypeBn} ${appNumber} এর জন্য পেমেন্ট বাতিল হয়েছে।`;
    adminTitleEn = 'Payment Cancelled';
    adminTitleBn = 'পেমেন্ট বাতিল';
    adminMsgEn = `${isRenewal ? 'License' : 'Application'} ${appNumber} - Payment CANCELLED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `${isRenewal ? 'লাইসেন্স' : 'আবেদন'} ${appNumber} - পেমেন্ট বাতিল। পরিমাণ: BDT ${payment.amount}`;
  }

  // Use the dual notification RPC for both user and admin
  console.log('Calling create_dual_notification RPC with:', {
    p_user_id: payment.user_id,
    p_title_en: userTitleEn,
    p_title_bn: userTitleBn,
    p_message_en: userMsgEn,
    p_message_bn: userMsgBn,
    p_type: 'payment',
    p_application_id: payment.application_id,
    p_action_url: null,
    p_admin_title_en: adminTitleEn,
    p_admin_title_bn: adminTitleBn,
    p_admin_message_en: adminMsgEn,
    p_admin_message_bn: adminMsgBn
  });
  const { data: notifData, error: notifError } = await supabase.rpc('create_dual_notification', {
    p_user_id: payment.user_id,
    p_title_en: userTitleEn,
    p_title_bn: userTitleBn,
    p_message_en: userMsgEn,
    p_message_bn: userMsgBn,
    p_type: isRenewal ? 'renewal' : 'payment',
    p_application_id: payment.application_id,
    p_action_url: null,
    p_admin_title_en: adminTitleEn,
    p_admin_title_bn: adminTitleBn,
    p_admin_message_en: adminMsgEn,
    p_admin_message_bn: adminMsgBn
  });
  if (notifError) {
    console.error('Notification RPC error:', notifError);
  } else {
    console.log('Notification RPC success:', notifData);
  }
}

export { updatePaymentAndNotify };
