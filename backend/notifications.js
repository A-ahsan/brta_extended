// Notification helpers for backend
import { supabase } from './supabaseClient.js';

async function sendPaymentNotification({ user_id, application_id, status, amount, tran_id, isAdmin = false }) {
  // Compose bilingual messages
  let title_en, title_bn, message_en, message_bn;
  if (status === 'success') {
    title_en = 'Payment Successful';
    title_bn = 'পেমেন্ট সফল হয়েছে';
    message_en = `Your payment of BDT ${amount} for application ${tran_id} was successful.`;
    message_bn = `আপনার আবেদন ${tran_id} এর জন্য BDT ${amount} পেমেন্ট সফল হয়েছে।`;
  } else if (status === 'failed') {
    title_en = 'Payment Failed';
    title_bn = 'পেমেন্ট ব্যর্থ হয়েছে';
    message_en = `Your payment for application ${tran_id} failed. Please try again.`;
    message_bn = `আপনার আবেদন ${tran_id} এর জন্য পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।`;
  } else if (status === 'cancelled') {
    title_en = 'Payment Cancelled';
    title_bn = 'পেমেন্ট বাতিল হয়েছে';
    message_en = `Your payment for application ${tran_id} was cancelled.`;
    message_bn = `আপনার আবেদন ${tran_id} এর জন্য পেমেন্ট বাতিল হয়েছে।`;
  }

  // Admin gets a different message
  if (isAdmin) {
    title_en = `User Payment ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    title_bn = `ইউজার পেমেন্ট ${status === 'success' ? 'সফল' : status === 'failed' ? 'ব্যর্থ' : 'বাতিল'}`;
    message_en = `User (ID: ${user_id}) payment for application ${tran_id}: ${status.toUpperCase()}. Amount: BDT ${amount}`;
    message_bn = `ইউজার (ID: ${user_id}) আবেদন ${tran_id} এর জন্য পেমেন্ট: ${status === 'success' ? 'সফল' : status === 'failed' ? 'ব্যর্থ' : 'বাতিল'}। পরিমাণ: BDT ${amount}`;
  }

  // Insert notification
  await supabase.from('notifications').insert({
    user_id: isAdmin ? null : user_id, // null for admin notification
    application_id,
    title_en,
    title_bn,
    message_en,
    message_bn,
    type: 'payment',
    recipient_type: isAdmin ? 'admin' : 'user',
    created_at: new Date().toISOString(),
  });
}

async function sendViolationNotification({ user_id, violation_number, violation_name_en, violation_name_bn, amount, location, location_bn, severity }) {
  const title_en = 'Traffic Violation Fine Issued';
  const title_bn = 'ট্রাফিক লঙ্ঘন জরিমানা জারি করা হয়েছে';
  const message_en = `A fine of BDT ${amount} has been issued for ${violation_name_en} at ${location}. Violation #${violation_number}`;
  const message_bn = `${violation_name_bn} এর জন্য ${location_bn || location} এ BDT ${amount} জরিমানা জারি করা হয়েছে। লঙ্ঘন #${violation_number}`;

  await supabase.from('notifications').insert({
    user_id,
    title_en,
    title_bn,
    message_en,
    message_bn,
    type: 'violation',
    recipient_type: 'user',
    priority: severity === 'critical' || severity === 'severe' ? 'high' : 'normal',
    created_at: new Date().toISOString(),
  });
}

async function sendPoliceViolationConfirmation({ police_user_id, violation_number, registration_number, amount }) {
  const title_en = 'Violation Recorded Successfully';
  const title_bn = 'লঙ্ঘন সফলভাবে রেকর্ড করা হয়েছে';
  const message_en = `Violation ${violation_number} recorded for vehicle ${registration_number}. Fine: BDT ${amount}`;
  const message_bn = `গাড়ি ${registration_number} এর জন্য লঙ্ঘন ${violation_number} রেকর্ড করা হয়েছে। জরিমানা: BDT ${amount}`;

  await supabase.from('notifications').insert({
    user_id: police_user_id,
    title_en,
    title_bn,
    message_en,
    message_bn,
    type: 'violation',
    recipient_type: 'police',
    priority: 'normal',
    created_at: new Date().toISOString(),
  });
}

export { sendPaymentNotification, sendViolationNotification, sendPoliceViolationConfirmation };
