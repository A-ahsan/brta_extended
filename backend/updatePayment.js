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

  // Send user notification
  await sendPaymentNotification({
    user_id: payment.user_id,
    application_id: payment.application_id,
    status,
    amount: payment.amount,
    tran_id,
    isAdmin: false
  });
  // Send admin notification
  await sendPaymentNotification({
    user_id: payment.user_id,
    application_id: payment.application_id,
    status,
    amount: payment.amount,
    tran_id,
    isAdmin: true
  });
}

export { updatePaymentAndNotify };
