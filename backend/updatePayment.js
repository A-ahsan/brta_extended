// Payment update and notification logic for result endpoints
import { supabase } from './supabaseClient.js';
import { sendPaymentNotification } from './notifications.js';

async function updatePaymentAndNotify({ status, sslczData }) {
  const tran_id = sslczData.tran_id;
  // Find payment by tran_id
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tran_id', tran_id)
    .single();
  if (error || !payment) return;


  // Update payment status
  await supabase
    .from('payments')
    .update({
      status,
      sslcommerz_val_id: sslczData.val_id || null,
      sslcommerz_tran_date: sslczData.tran_date ? new Date(sslczData.tran_date) : null
    })
    .eq('tran_id', tran_id);

  // If payment is successful, update license_applications
  if (status === 'success') {
    await supabase
      .from('license_applications')
      .update({
        status: 'payment_completed',
        payment: 1,
        payment_completed_at: new Date().toISOString()
      })
      .eq('id', payment.application_id);
  }

  // Compose bilingual, role-specific messages
  let userTitleEn, userTitleBn, userMsgEn, userMsgBn;
  let adminTitleEn, adminTitleBn, adminMsgEn, adminMsgBn;
  if (status === 'success') {
    userTitleEn = 'Payment Successful';
    userTitleBn = 'পেমেন্ট সফল হয়েছে';
    userMsgEn = `Your payment of BDT ${payment.amount} for application ${tran_id} was successful.`;
    userMsgBn = `আপনার আবেদন ${tran_id} এর জন্য BDT ${payment.amount} পেমেন্ট সফল হয়েছে।`;
    adminTitleEn = 'User Payment Successful';
    adminTitleBn = 'ইউজার পেমেন্ট সফল';
    adminMsgEn = `User (ID: ${payment.user_id}) payment for application ${tran_id}: SUCCESS. Amount: BDT ${payment.amount}`;
    adminMsgBn = `ইউজার (ID: ${payment.user_id}) আবেদন ${tran_id} এর জন্য পেমেন্ট সফল। পরিমাণ: BDT ${payment.amount}`;
  } else if (status === 'failed') {
    userTitleEn = 'Payment Failed';
    userTitleBn = 'পেমেন্ট ব্যর্থ হয়েছে';
    userMsgEn = `Your payment for application ${tran_id} failed. Please try again.`;
    userMsgBn = `আপনার আবেদন ${tran_id} এর জন্য পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।`;
    adminTitleEn = 'User Payment Failed';
    adminTitleBn = 'ইউজার পেমেন্ট ব্যর্থ';
    adminMsgEn = `User (ID: ${payment.user_id}) payment for application ${tran_id}: FAILED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `ইউজার (ID: ${payment.user_id}) আবেদন ${tran_id} এর জন্য পেমেন্ট ব্যর্থ। পরিমাণ: BDT ${payment.amount}`;
  } else if (status === 'cancelled') {
    userTitleEn = 'Payment Cancelled';
    userTitleBn = 'পেমেন্ট বাতিল হয়েছে';
    userMsgEn = `Your payment for application ${tran_id} was cancelled.`;
    userMsgBn = `আপনার আবেদন ${tran_id} এর জন্য পেমেন্ট বাতিল হয়েছে।`;
    adminTitleEn = 'User Payment Cancelled';
    adminTitleBn = 'ইউজার পেমেন্ট বাতিল';
    adminMsgEn = `User (ID: ${payment.user_id}) payment for application ${tran_id}: CANCELLED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `ইউজার (ID: ${payment.user_id}) আবেদন ${tran_id} এর জন্য পেমেন্ট বাতিল। পরিমাণ: BDT ${payment.amount}`;
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
    p_type: 'payment',
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
