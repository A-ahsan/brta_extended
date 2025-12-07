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
  const isVehicleRegistration = payment.payment_type === 'vehicle_registration';
  const isTaxTokenRenewal = payment.payment_type === 'tax_token_renewal' && payment.vehicle_id;
  const isViolationPayment = payment.payment_type === 'violation_fine';
  const isRoutePermit = payment.payment_type === 'route_permit';
  const isOwnershipTransfer = payment.payment_type === 'ownership_transfer';

  // Get application details or license details based on payment type
  let application, license, vehicleRegistration, vehicle, violation, routePermit, ownershipTransfer, appNumber, userName, userNameBn;
  
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
  } else if (isVehicleRegistration) {
    const { data: vrData } = await supabase
      .from('vehicle_registrations')
      .select('application_number, user_id')
      .eq('payment_id', payment.id)
      .single();
    vehicleRegistration = vrData;
    appNumber = vrData?.application_number || tran_id;
    
    // Get user name from profiles (profiles table only has full_name, not bilingual)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', vrData?.user_id)
      .single();
    userName = profile?.full_name || 'User';
    userNameBn = profile?.full_name || 'ব্যবহারকারী';
  } else if (isTaxTokenRenewal) {
    const { data: vehicleData } = await supabase
      .from('registered_vehicles')
      .select('registration_number, registration_plate, vehicle_name, model, owner_name_en, owner_name_bn')
      .eq('id', payment.vehicle_id)
      .single();
    vehicle = vehicleData;
    appNumber = vehicleData?.registration_number || tran_id;
    userName = vehicleData?.owner_name_en || 'User';
    userNameBn = vehicleData?.owner_name_bn || 'ব্যবহারকারী';
  } else if (isViolationPayment) {
    const { data: violationData } = await supabase
      .from('traffic_violations')
      .select('violation_number, violation_name_en, violation_name_bn, total_amount')
      .eq('payment_id', payment.id)
      .single();
    violation = violationData;
    appNumber = violationData?.violation_number || tran_id;
    
    // Get user name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payment.user_id)
      .single();
    userName = profile?.full_name || 'User';
    userNameBn = profile?.full_name || 'ব্যবহারকারী';
  } else if (isRoutePermit) {
    const { data: permitData } = await supabase
      .from('route_permits')
      .select('permit_number, route_from_en, route_to_en, distance_km, permit_days')
      .eq('payment_id', payment.id)
      .single();
    routePermit = permitData;
    appNumber = permitData?.permit_number || tran_id;
    
    // Get user name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payment.user_id)
      .single();
    userName = profile?.full_name || 'User';
    userNameBn = profile?.full_name || 'ব্যবহারকারী';
  } else if (isOwnershipTransfer) {
    const { data: transferData } = await supabase
      .from('ownership_transfer_applications')
      .select('application_number, vehicle_registration_number, vehicle_name, new_owner_name_en, new_owner_name_bn')
      .eq('payment_id', payment.id)
      .single();
    ownershipTransfer = transferData;
    appNumber = transferData?.application_number || tran_id;
    
    // Get user name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payment.user_id)
      .single();
    userName = profile?.full_name || 'User';
    userNameBn = profile?.full_name || 'ব্যবহারকারী';
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
    } else if (isVehicleRegistration) {
      // Process vehicle registration
      try {
        const response = await axios.post('https://localhost:5000/api/vehicles/registration/process', {
          payment_id: payment.id,
          user_id: payment.user_id
        }, {
          httpsAgent
        });
        console.log('✅ Vehicle registration processed:', response.data);
      } catch (err) {
        console.error('❌ Error processing vehicle registration:', err.response?.data || err.message);
      }
    } else if (isTaxTokenRenewal) {
      // Process tax token renewal
      try {
        const response = await axios.post('https://localhost:5000/api/tax-tokens/renewal/process', {
          vehicle_id: payment.vehicle_id,
          user_id: payment.user_id,
          payment_id: payment.id,
          renewal_days: payment.renewal_days || 365,
          amount_paid: payment.amount
        }, {
          httpsAgent
        });
        console.log('✅ Tax token renewal processed:', response.data);
      } catch (err) {
        console.error('❌ Error processing tax token renewal:', err.response?.data || err.message);
      }
    } else if (isViolationPayment) {
      // Update traffic violation payment status
      try {
        const { data: updatedViolation } = await supabase
          .from('traffic_violations')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('payment_id', payment.id)
          .select('police_user_id, violation_number, violation_name_en, violation_name_bn')
          .single();
        
        // Notify the police officer who issued the violation
        if (updatedViolation && updatedViolation.police_user_id) {
          await supabase.from('notifications').insert({
            user_id: updatedViolation.police_user_id,
            title_en: 'Violation Fine Paid',
            title_bn: 'লঙ্ঘন জরিমানা পরিশোধিত',
            message_en: `Fine for violation ${updatedViolation.violation_number} (${updatedViolation.violation_name_en}) has been paid. Amount: BDT ${payment.amount}`,
            message_bn: `লঙ্ঘন ${updatedViolation.violation_number} (${updatedViolation.violation_name_bn}) এর জরিমানা পরিশোধ করা হয়েছে। পরিমাণ: BDT ${payment.amount}`,
            notification_type: 'payment',
            priority: 'normal',
            recipient_type: 'police'
          });
        }
        
        console.log('✅ Violation payment processed successfully');
      } catch (err) {
        console.error('❌ Error processing violation payment:', err);
      }
    } else if (isRoutePermit) {
      // Update route permit payment status
      await supabase
        .from('route_permits')
        .update({ 
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        })
        .eq('payment_id', payment.id);
      
      console.log('✅ Route permit payment processed successfully');
    } else if (isOwnershipTransfer) {
      // Process ownership transfer
      try {
        // Get application ID
        const { data: transferApp } = await supabase
          .from('ownership_transfer_applications')
          .select('id')
          .eq('payment_id', payment.id)
          .single();

        if (transferApp) {
          const response = await axios.post('https://localhost:5000/api/ownership-transfer/process', {
            payment_id: payment.id,
            application_id: transferApp.id
          }, {
            httpsAgent
          });
          console.log('✅ Ownership transfer processed:', response.data);
        }
      } catch (err) {
        console.error('❌ Error processing ownership transfer:', err.response?.data || err.message);
      }
    } else {
      // Update license application
      console.log(`🔄 Updating license application ${payment.application_id} payment status...`);
      const { data: updateData, error: updateError } = await supabase
        .from('license_applications')
        .update({
          status: 'payment_completed',
          payment: 1,
          payment_completed_at: new Date().toISOString()
        })
        .eq('id', payment.application_id)
        .select();
      
      if (updateError) {
        console.error('❌ Error updating license application payment:', updateError);
        console.error('Application ID:', payment.application_id);
        console.error('Update data:', { status: 'payment_completed', payment: 1 });
      } else {
        console.log('✅ License application payment updated successfully:', updateData);
      }
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
    } else if (isVehicleRegistration) {
      userTitleEn = 'Vehicle Registration Payment Successful';
      userTitleBn = 'যানবাহন নিবন্ধন পেমেন্ট সফল';
      userMsgEn = `Your vehicle registration payment of BDT ${payment.amount} for application ${appNumber} was successful. Your vehicle is being processed.`;
      userMsgBn = `আপনার আবেদন ${appNumber} এর জন্য BDT ${payment.amount} যানবাহন নিবন্ধন পেমেন্ট সফল হয়েছে। আপনার যানবাহন প্রক্রিয়া করা হচ্ছে।`;
      adminTitleEn = 'Vehicle Registration Payment Received';
      adminTitleBn = 'যানবাহন নিবন্ধন পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Vehicle Registration ${appNumber} - Payment SUCCESS. Amount: BDT ${payment.amount}. User: ${userName}`;
      adminMsgBn = `যানবাহন নিবন্ধন ${appNumber} - পেমেন্ট সফল। পরিমাণ: BDT ${payment.amount}। ব্যবহারকারী: ${userNameBn}`;
    } else if (isTaxTokenRenewal) {
      userTitleEn = 'Tax Token Renewal Payment Successful';
      userTitleBn = 'ট্যাক্স টোকেন নবায়ন পেমেন্ট সফল';
      userMsgEn = `Your tax token renewal payment of BDT ${payment.amount} for vehicle ${appNumber} was successful. Your tax token and vehicle registration have been renewed.`;
      userMsgBn = `আপনার যানবাহন ${appNumber} এর জন্য BDT ${payment.amount} ট্যাক্স টোকেন নবায়ন পেমেন্ট সফল হয়েছে। আপনার ট্যাক্স টোকেন এবং যানবাহন নিবন্ধন নবায়ন করা হয়েছে।`;
      adminTitleEn = 'Tax Token Renewal Payment Received';
      adminTitleBn = 'ট্যাক্স টোকেন নবায়ন পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Vehicle ${appNumber} - Tax Token Renewal SUCCESS. Amount: BDT ${payment.amount}. User: ${userName}`;
      adminMsgBn = `যানবাহন ${appNumber} - ট্যাক্স টোকেন নবায়ন সফল। পরিমাণ: BDT ${payment.amount}। ব্যবহারকারী: ${userNameBn}`;
    } else if (isViolationPayment) {
      userTitleEn = 'Traffic Fine Payment Successful';
      userTitleBn = 'ট্রাফিক জরিমানা পেমেন্ট সফল';
      userMsgEn = `Your fine payment of BDT ${payment.amount} for violation ${appNumber} was successful.`;
      userMsgBn = `আপনার লঙ্ঘন ${appNumber} এর জন্য BDT ${payment.amount} জরিমানা পেমেন্ট সফল হয়েছে।`;
      adminTitleEn = 'Traffic Fine Payment Received';
      adminTitleBn = 'ট্রাফিক জরিমানা পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Violation ${appNumber} - Fine Payment SUCCESS. Amount: BDT ${payment.amount}. User: ${userName}`;
      adminMsgBn = `লঙ্ঘন ${appNumber} - জরিমানা পেমেন্ট সফল। পরিমাণ: BDT ${payment.amount}। ব্যবহারকারী: ${userNameBn}`;
    } else if (isRoutePermit) {
      userTitleEn = 'Route Permit Payment Successful';
      userTitleBn = 'রুট পারমিট পেমেন্ট সফল';
      userMsgEn = `Your route permit payment of BDT ${payment.amount} was successful. Permit: ${appNumber}. Pending admin approval.`;
      userMsgBn = `আপনার রুট পারমিট পেমেন্ট BDT ${payment.amount} সফল হয়েছে। পারমিট: ${appNumber}। অ্যাডমিন অনুমোদন মুলতুবি।`;
      adminTitleEn = 'Route Permit Payment Received';
      adminTitleBn = 'রুট পারমিট পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Route permit payment received: ${appNumber}. Route: ${routePermit.route_from_en} → ${routePermit.route_to_en} (${routePermit.distance_km} km, ${routePermit.permit_days} days). Amount: BDT ${payment.amount}. Awaiting review.`;
      adminMsgBn = `রুট পারমিট পেমেন্ট প্রাপ্ত: ${appNumber}। রুট: ${routePermit.route_from_en} → ${routePermit.route_to_en} (${routePermit.distance_km} কিমি, ${routePermit.permit_days} দিন)। পরিমাণ: BDT ${payment.amount}। পর্যালোচনার জন্য অপেক্ষমাণ।`;
    } else if (isOwnershipTransfer) {
      userTitleEn = 'Ownership Transfer Payment Successful';
      userTitleBn = 'মালিকানা হস্তান্তর পেমেন্ট সফল';
      userMsgEn = `Your ownership transfer payment of BDT ${payment.amount} was successful. Application: ${appNumber}. Transfer is being processed.`;
      userMsgBn = `আপনার মালিকানা হস্তান্তর পেমেন্ট BDT ${payment.amount} সফল হয়েছে। আবেদন: ${appNumber}। হস্তান্তর প্রক্রিয়া করা হচ্ছে।`;
      adminTitleEn = 'Ownership Transfer Payment Received';
      adminTitleBn = 'মালিকানা হস্তান্তর পেমেন্ট প্রাপ্ত';
      adminMsgEn = `Ownership transfer ${appNumber} - Payment SUCCESS. Vehicle: ${ownershipTransfer?.vehicle_registration_number}. New owner: ${ownershipTransfer?.new_owner_name_en}. Amount: BDT ${payment.amount}`;
      adminMsgBn = `মালিকানা হস্তান্তর ${appNumber} - পেমেন্ট সফল। গাড়ি: ${ownershipTransfer?.vehicle_registration_number}। নতুন মালিক: ${ownershipTransfer?.new_owner_name_bn}। পরিমাণ: BDT ${payment.amount}`;
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
    const itemType = isRenewal ? 'license renewal' : isVehicleRegistration ? 'vehicle registration' : isTaxTokenRenewal ? 'tax token renewal' : isViolationPayment ? 'traffic fine' : isRoutePermit ? 'route permit' : isOwnershipTransfer ? 'ownership transfer' : 'application';
    const itemTypeBn = isRenewal ? 'লাইসেন্স নবায়ন' : isVehicleRegistration ? 'যানবাহন নিবন্ধন' : isTaxTokenRenewal ? 'ট্যাক্স টোকেন নবায়ন' : isViolationPayment ? 'ট্রাফিক জরিমানা' : isRoutePermit ? 'রুট পারমিট' : isOwnershipTransfer ? 'মালিকানা হস্তান্তর' : 'আবেদন';
    userTitleEn = 'Payment Failed';
    userTitleBn = 'পেমেন্ট ব্যর্থ হয়েছে';
    userMsgEn = `Your payment for ${itemType} ${appNumber} failed. Please try again.`;
    userMsgBn = `আপনার ${itemTypeBn} ${appNumber} এর জন্য পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।`;
    adminTitleEn = 'Payment Failed';
    adminTitleBn = 'পেমেন্ট ব্যর্থ';
    adminMsgEn = `${isRenewal ? 'License' : isVehicleRegistration ? 'Vehicle Registration' : isTaxTokenRenewal ? 'Tax Token Renewal' : isViolationPayment ? 'Traffic Fine' : isRoutePermit ? 'Route Permit' : isOwnershipTransfer ? 'Ownership Transfer' : 'Application'} ${appNumber} - Payment FAILED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `${isRenewal ? 'লাইসেন্স' : isVehicleRegistration ? 'যানবাহন নিবন্ধন' : isTaxTokenRenewal ? 'ট্যাক্স টোকেন নবায়ন' : isViolationPayment ? 'ট্রাফিক জরিমানা' : isRoutePermit ? 'রুট পারমিট' : isOwnershipTransfer ? 'মালিকানা হস্তান্তর' : 'আবেদন'} ${appNumber} - পেমেন্ট ব্যর্থ। পরিমাণ: BDT ${payment.amount}`;
  } else if (status === 'cancelled') {
    const itemType = isRenewal ? 'license renewal' : isVehicleRegistration ? 'vehicle registration' : isTaxTokenRenewal ? 'tax token renewal' : isViolationPayment ? 'traffic fine' : isRoutePermit ? 'route permit' : isOwnershipTransfer ? 'ownership transfer' : 'application';
    const itemTypeBn = isRenewal ? 'লাইসেন্স নবায়ন' : isVehicleRegistration ? 'যানবাহন নিবন্ধন' : isTaxTokenRenewal ? 'ট্যাক্স টোকেন নবায়ন' : isViolationPayment ? 'ট্রাফিক জরিমানা' : isRoutePermit ? 'রুট পারমিট' : isOwnershipTransfer ? 'মালিকানা হস্তান্তর' : 'আবেদন';
    userTitleEn = 'Payment Cancelled';
    userTitleBn = 'পেমেন্ট বাতিল হয়েছে';
    userMsgEn = `Your payment for ${itemType} ${appNumber} was cancelled.`;
    userMsgBn = `আপনার ${itemTypeBn} ${appNumber} এর জন্য পেমেন্ট বাতিল হয়েছে।`;
    adminTitleEn = 'Payment Cancelled';
    adminTitleBn = 'পেমেন্ট বাতিল';
    adminMsgEn = `${isRenewal ? 'License' : isVehicleRegistration ? 'Vehicle Registration' : isTaxTokenRenewal ? 'Tax Token Renewal' : isViolationPayment ? 'Traffic Fine' : 'Application'} ${appNumber} - Payment CANCELLED. Amount: BDT ${payment.amount}`;
    adminMsgBn = `${isRenewal ? 'লাইসেন্স' : isVehicleRegistration ? 'যানবাহন নিবন্ধন' : isTaxTokenRenewal ? 'ট্যাক্স টোকেন নবায়ন' : isViolationPayment ? 'ট্রাফিক জরিমানা' : 'আবেদন'} ${appNumber} - পেমেন্ট বাতিল। পরিমাণ: BDT ${payment.amount}`;
  }

  // Use the dual notification RPC for both user and admin
  // For violation payments, skip admin notification (already sent to police officer)
  if (isViolationPayment) {
    // Only send user notification for violations (police already notified above)
    const { error: userNotifError } = await supabase.from('notifications').insert({
      user_id: payment.user_id,
      title_en: userTitleEn,
      title_bn: userTitleBn,
      message_en: userMsgEn,
      message_bn: userMsgBn,
      notification_type: 'payment',
      priority: 'normal',
      recipient_type: 'user'
    });
    if (userNotifError) {
      console.error('User notification error:', userNotifError);
    } else {
      console.log('✅ Violation payment notifications sent (user + police)');
    }
  } else {
    // For other payment types, use dual notification (user + admin)
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
}

export { updatePaymentAndNotify };
