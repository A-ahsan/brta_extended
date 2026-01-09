// Minimal Node.js/Express backend for SSLCommerz demo integration
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { updatePaymentAndNotify } from './updatePayment.js';
import { createClient } from '@supabase/supabase-js';
import { 
  sendViolationSMS, 
  getUserPhoneNumber,
  sendLicenseGeneratedSMS,
  sendVehicleRegistrationSMS,
  sendLicenseRenewalSMS,
  sendTaxTokenRenewalSMS,
  sendOwnershipTransferPreviousSMS,
  sendOwnershipTransferNewSMS,
  normalizePhoneNumber
} from './smsService.js';
import { 
  generateOTP, 
  verifyOTP, 
  deleteOTP, 
  sendOTPEmail,
  sendOTPSMS,
  verifyOTPByPhone
} from './emailService.js';
import chatbotRoutes from './chatbotRoutes.js';
import { postToTelegramChannel, testTelegramConnection } from './telegramService.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL // Will be set in Render dashboard
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production (you can restrict this later)
    }
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// SSLCommerz credentials (use .env for real projects)
const SSLCZ_STORE_ID = process.env.SSLCZ_STORE_ID || 'testbox';
const SSLCZ_STORE_PASSWORD = process.env.SSLCZ_STORE_PASSWORD || 'qwerty';
const SSLCZ_API_URL = process.env.SSLCZ_API_URL || 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

// Store frontend URLs by transaction ID
const frontendUrls = new Map();

// Payment initiation endpoint
app.post('/api/payment/initiate', async (req, res) => {
  const { 
    amount, 
    customerName, 
    customerEmail, 
    tran_id, 
    transactionId, // Support both naming conventions
    application_id, 
    user_id, 
    frontend_url 
  } = req.body;
  
  // Use whichever transaction ID was provided
  const finalTranId = tran_id || transactionId;
  
  // Store frontend URL for this transaction
  if (frontend_url && finalTranId) {
    frontendUrls.set(finalTranId, frontend_url);
  }
  
  // Get dynamic base URL from request
  // Force HTTPS on Render (behind proxy, req.protocol returns 'http')
  const protocol = (req.get('host') || '').includes('onrender.com') ? 'https' : (req.protocol || 'http');
  const host = req.get('host') || `localhost:${PORT}`;
  const baseUrl = `${protocol}://${host}`;
  
  const payload = {
    store_id: SSLCZ_STORE_ID,
    store_passwd: SSLCZ_STORE_PASSWORD,
    total_amount: String(amount),
    currency: 'BDT',
    tran_id: String(finalTranId),
    success_url: `${baseUrl}/api/payment/success`,
    fail_url: `${baseUrl}/api/payment/fail`,
    cancel_url: `${baseUrl}/api/payment/cancel`,
    cus_name: customerName || 'Test User',
    cus_email: customerEmail || 'test@example.com',
    cus_add1: 'Dhaka',
    cus_add2: '',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1207',
    cus_country: 'Bangladesh',
    cus_phone: '01711111111',
    cus_fax: '',
    ship_name: customerName || 'Test User',
    ship_add1: 'Dhaka',
    ship_add2: '',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: '1207',
    ship_country: 'Bangladesh',
    shipping_method: 'NO',
    product_name: 'Driving License Fee',
    product_category: 'Government',
    product_profile: 'general',
    product_amount: String(amount),
    emi_option: 0,
    emi_max_inst_option: 0,
    emi_selected_inst: 0,
    cart: JSON.stringify([
      { product: 'Driving License Fee', amount: String(amount) }
    ]),
    value_a: application_id || '',
    value_b: user_id || '',
    value_c: '',
    value_d: '',
    // Add more fields as needed
  };
  console.log('Initiating payment with payload:', payload);
  try {
    // Send as application/x-www-form-urlencoded
    const params = new URLSearchParams(payload);
    const response = await axios.post(SSLCZ_API_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('SSLCommerz response:', response.data);
    if (response.data.GatewayPageURL) {
      res.json({ url: response.data.GatewayPageURL });
    } else {
      res.status(400).json({ error: 'Failed to initiate payment', details: response.data });
    }
  } catch (err) {
    console.error('Payment initiation error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment initiation error', details: err.response?.data || err.message });
  }
});




app.post('/api/payment/success', async (req, res) => {
  // Accept both JSON and form data
  const data = req.body || {};
  console.log('Payment Success:', data);
  await updatePaymentAndNotify({ status: 'success', sslczData: data });
  
  // Get frontend URL from stored map using transaction ID
  const tran_id = data.tran_id || data.value_a;
  console.log('Looking for frontend URL with tran_id:', tran_id);
  console.log('Available URLs in map:', Array.from(frontendUrls.keys()));
  
  const frontendUrl = frontendUrls.get(tran_id) || 'http://localhost:3000';
  console.log('Frontend URL found:', frontendUrl);
  frontendUrls.delete(tran_id); // Clean up
  
  const redirectUrl = `${frontendUrl}/payment-success`;
  
  // Respond with HTML/JS redirect to frontend dashboard
  res.send(`
    <html>
      <head>
        <title>Payment Success</title>
        <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
        <script>
          window.location.href = '${redirectUrl}';
        </script>
      </head>
      <body>
        <p>Payment Success. Redirecting...</p>
      </body>
    </html>
  `);
});


app.post('/api/payment/fail', async (req, res) => {
  const data = req.body || {};
  console.log('Payment Failed:', data);
  await updatePaymentAndNotify({ status: 'failed', sslczData: data });
  
  // Get frontend URL from stored map using transaction ID
  const tran_id = data.tran_id || data.value_a;
  console.log('Looking for frontend URL with tran_id:', tran_id);
  console.log('Available URLs in map:', Array.from(frontendUrls.keys()));
  
  const frontendUrl = frontendUrls.get(tran_id) || 'http://localhost:3000';
  console.log('Frontend URL found:', frontendUrl);
  frontendUrls.delete(tran_id); // Clean up
  
  const redirectUrl = `${frontendUrl}/payment-fail`;
  
  res.send(`
    <html>
      <head>
        <title>Payment Failed</title>
        <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
        <script>
          window.location.href = '${redirectUrl}';
        </script>
      </head>
      <body>
        <p>Payment Failed. Redirecting...</p>
      </body>
    </html>
  `);
});


app.post('/api/payment/cancel', async (req, res) => {
  const data = req.body || {};
  console.log('Payment Cancelled:', data);
  await updatePaymentAndNotify({ status: 'cancelled', sslczData: data });
  res.send('Payment Cancelled');
});

// License generation endpoint
app.post('/api/licenses/generate', async (req, res) => {
  try {
    const { application_id, user_id } = req.body;

    if (!application_id || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: application_id and user_id' 
      });
    }

    // Check if license already exists for this application
    const { data: existingLicense, error: checkError } = await supabase
      .from('licenses')
      .select('*')
      .eq('application_id', application_id)
      .single();

    if (existingLicense) {
      return res.json({ 
        success: true, 
        license: existingLicense,
        message: 'License already exists for this application' 
      });
    }

    // Fetch application data
    const { data: application, error: appError } = await supabase
      .from('license_applications')
      .select('*')
      .eq('id', application_id)
      .eq('user_id', user_id)
      .single();

    if (appError || !application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found or does not belong to user' 
      });
    }

    // Verify application is approved and payment completed
    // Accept if EITHER approved OR payment completed
    const isApproved = application.status === 'approved';
    const isPaymentCompleted = application.payment === 1;
    
    if (!isApproved && !isPaymentCompleted) {
      console.log(`❌ License generation blocked - Status: ${application.status}, Payment: ${application.payment}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Application must be approved and payment completed before generating license',
        details: {
          status: application.status,
          payment: application.payment,
          isApproved,
          isPaymentCompleted
        }
      });
    }
    
    console.log(`✅ License generation approved - Status: ${application.status}, Payment: ${application.payment}`);

    // Generate unique license number
    const { data: licenseNumberData, error: licenseNumError } = await supabase
      .rpc('generate_license_number');

    if (licenseNumError) {
      console.error('Error generating license number:', licenseNumError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate license number' 
      });
    }

    const licenseNumber = licenseNumberData;
    const issueDate = new Date().toISOString().split('T')[0];
    
    // Calculate expiry date based on license category
    // Professional: 5 years, Non-Professional: 10 years
    const expiryDate = new Date();
    if (application.license_category === 'Professional') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 10);
    }
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    // Fetch issuing authority (test center office name) from physical exam booking
    let issuingAuthority = 'BRTA Head Office'; // Default
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('physical_exam_bookings')
        .select('test_center_id, test_centers(office_name_en)')
        .eq('application_id', application.id)
        .eq('status', 'completed')
        .single();
      
      if (!bookingError && bookingData?.test_centers?.office_name_en) {
        issuingAuthority = bookingData.test_centers.office_name_en;
      }
    } catch (err) {
      console.log('Could not fetch test center, using default:', err.message);
    }

    // Create license
    const { data: newLicense, error: licenseError } = await supabase
      .from('licenses')
      .insert([{
        license_number: licenseNumber,
        application_id: application.id,
        user_id: user_id,
        license_type: application.license_type,
        license_category: application.license_category,
        full_name_en: application.full_name_en,
        full_name_bn: application.full_name_bn,
        nid_number: application.nid_number,
        date_of_birth: application.date_of_birth,
        blood_group: application.blood_group,
        gender: application.gender,
        address: application.address,
        photo_url: application.user_photo_url,
        father_name: application.father_name || 'N/A',
        issuing_authority: issuingAuthority,
        issue_date: issueDate,
        expiry_date: expiryDateStr,
        expired: 0, // Not expired initially
        status: 'active'
      }])
      .select()
      .single();

    if (licenseError) {
      console.error('Error creating license:', licenseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create license' 
      });
    }

    // Create notification for user
    const { error: userNotifError } = await supabase
      .from('notifications')
      .insert([{
        user_id: user_id,
        recipient_type: 'user',
        title_en: 'License Generated Successfully',
        title_bn: 'লাইসেন্স সফলভাবে তৈরি হয়েছে',
        message_en: `Your driving license ${licenseNumber} has been generated successfully. You can now view and download it from your profile.`,
        message_bn: `আপনার ড্রাইভিং লাইসেন্স ${licenseNumber} সফলভাবে তৈরি হয়েছে। আপনি এখন আপনার প্রোফাইল থেকে এটি দেখতে এবং ডাউনলোড করতে পারেন।`,
        notification_type: 'approval',
        priority: 'high',
        application_id: application_id,
        is_read: false
      }]);

    if (userNotifError) {
      console.error('Error creating user notification:', userNotifError);
    } else {
      console.log('✅ User notification created successfully');
    }

    // Create notifications for all admins
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (!adminError && admins && admins.length > 0) {
      console.log(`Found ${admins.length} admin(s) to notify`);
      
      const adminNotifications = admins.map(admin => ({
        user_id: admin.id,
        recipient_type: 'admin',
        title_en: 'New License Generated',
        title_bn: 'নতুন লাইসেন্স তৈরি হয়েছে',
        message_en: `A new driving license ${licenseNumber} has been generated for ${application.full_name_en} (NID: ${application.nid_number}).`,
        message_bn: `${application.full_name_bn} (এনআইডি: ${application.nid_number}) এর জন্য একটি নতুন ড্রাইভিং লাইসেন্স ${licenseNumber} তৈরি হয়েছে।`,
        notification_type: 'approval',
        priority: 'normal',
        application_id: application_id,
        is_read: false
      }));

      const { error: adminNotifError } = await supabase
        .from('notifications')
        .insert(adminNotifications);

      if (adminNotifError) {
        console.error('Error creating admin notifications:', adminNotifError);
      } else {
        console.log('✅ Admin notifications created successfully');
      }
    } else {
      console.log('⚠️ No admins found or error fetching admins:', adminError);
    }

    // Send SMS notification to user
    try {
      const phoneNumber = await getUserPhoneNumber(supabase, user_id);
      
      if (phoneNumber) {
        console.log('📱 Sending license generation SMS...');
        const smsResult = await sendLicenseGeneratedSMS(
          phoneNumber,
          licenseNumber,
          application.full_name_en,
          expiryDateStr
        );
        
        if (smsResult.success) {
          console.log('✅ License generation SMS sent successfully');
        } else {
          console.error('⚠️ SMS sending failed, but continuing:', smsResult.message);
        }
      } else {
        console.log('⚠️ No phone number found for SMS notification');
      }
    } catch (smsError) {
      // SMS failure should not block license generation
      console.error('⚠️ SMS Error (non-blocking):', smsError.message);
    }

    res.json({ 
      success: true, 
      license: newLicense,
      message: 'License generated successfully' 
    });

  } catch (error) {
    console.error('License generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get license by number (for QR code scanning)
app.get('/api/licenses/:license_number', async (req, res) => {
  try {
    const { license_number } = req.params;

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_number', license_number)
      .single();

    if (error || !license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License not found' 
      });
    }

    res.json({ 
      success: true, 
      license 
    });

  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// License Renewal Endpoints

// Check if license needs renewal
app.get('/api/licenses/:license_id/renewal-status', async (req, res) => {
  try {
    const { license_id } = req.params;

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', license_id)
      .single();

    if (error || !license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License not found' 
      });
    }

    const expiryDate = new Date(license.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilExpiry < 0;
    const needsRenewal = isExpired || daysUntilExpiry <= 30;

    // Get renewal fee (matching calculator fees)
    const renewalFee = license.license_category === 'Professional' ? 2387 : 4212;

    res.json({
      success: true,
      renewal_status: {
        license_id: license.id,
        license_number: license.license_number,
        expiry_date: license.expiry_date,
        is_expired: isExpired,
        days_until_expiry: daysUntilExpiry,
        needs_renewal: needsRenewal,
        renewal_fee: renewalFee,
        license_category: license.license_category
      }
    });

  } catch (error) {
    console.error('Error checking renewal status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Initiate renewal payment
app.post('/api/licenses/renewal/initiate', async (req, res) => {
  try {
    const { license_id, user_id, tran_id, frontend_url } = req.body;

    if (!license_id || !user_id || !tran_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: license_id, user_id, tran_id' 
      });
    }

    // Get license details
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', license_id)
      .eq('user_id', user_id)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License not found or does not belong to user' 
      });
    }

    // Calculate renewal fee (matching calculator fees)
    const renewalFee = license.license_category === 'Professional' ? 2387 : 4212;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: user_id,
        license_id: license_id,
        amount: renewalFee,
        currency: 'BDT',
        tran_id: tran_id,
        status: 'initiated',
        payment_type: 'renewal'
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create payment record' 
      });
    }

    res.json({
      success: true,
      payment: payment,
      renewal_fee: renewalFee,
      message: 'Renewal payment initiated'
    });

  } catch (error) {
    console.error('Renewal initiation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Process license renewal after successful payment
app.post('/api/licenses/renewal/process', async (req, res) => {
  try {
    const { license_id, user_id, payment_id } = req.body;

    if (!license_id || !user_id || !payment_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: license_id, user_id, payment_id' 
      });
    }

    // Verify payment is successful
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', user_id)
      .eq('license_id', license_id)
      .eq('status', 'success')
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not found or not successful' 
      });
    }

    // Call the renewal processing function
    const { data: result, error: renewalError } = await supabase
      .rpc('process_license_renewal', {
        p_license_id: license_id,
        p_user_id: user_id,
        p_payment_id: payment_id,
        p_amount: payment.amount
      });

    if (renewalError) {
      console.error('Error processing renewal:', renewalError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process license renewal' 
      });
    }

    // Send SMS notification to user
    try {
      // Get updated license details
      const { data: license } = await supabase
        .from('licenses')
        .select('license_number, expiry_date')
        .eq('id', license_id)
        .single();
      
      const phoneNumber = await getUserPhoneNumber(supabase, user_id);
      
      if (phoneNumber && license) {
        console.log('📱 Sending license renewal SMS...');
        const smsResult = await sendLicenseRenewalSMS(
          phoneNumber,
          license.license_number,
          license.expiry_date,
          payment.amount
        );
        
        if (smsResult.success) {
          console.log('✅ License renewal SMS sent successfully');
        } else {
          console.error('⚠️ SMS sending failed, but continuing:', smsResult.message);
        }
      } else {
        console.log('⚠️ No phone number or license found for SMS notification');
      }
    } catch (smsError) {
      // SMS failure should not block renewal
      console.error('⚠️ SMS Error (non-blocking):', smsError.message);
    }

    res.json({
      success: true,
      renewal: result,
      message: 'License renewed successfully'
    });

  } catch (error) {
    console.error('Renewal processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get renewal history for a license
app.get('/api/licenses/:license_id/renewals', async (req, res) => {
  try {
    const { license_id } = req.params;

    const { data: renewals, error } = await supabase
      .from('license_renewals')
      .select('*')
      .eq('license_id', license_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching renewals:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch renewal history' 
      });
    }

    res.json({
      success: true,
      renewals: renewals || []
    });

  } catch (error) {
    console.error('Error fetching renewals:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// ===== VEHICLE REGISTRATION ENDPOINTS =====

// Initiate vehicle registration payment
app.post('/api/payment/vehicle-registration', async (req, res) => {
  try {
    const { paymentId, userId, amount, applicationNumber, userEmail, userName, frontend_url } = req.body;

    if (!paymentId || !userId || !amount || !applicationNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get payment record to get tran_id
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('tran_id')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ error: 'Payment record not found' });
    }

    // Store frontend URL for this transaction
    if (frontend_url) {
      frontendUrls.set(payment.tran_id, frontend_url);
    }

    // Get dynamic base URL from request
    // Force HTTPS on Render (behind proxy, req.protocol returns 'http')
    const protocol = (req.get('host') || '').includes('onrender.com') ? 'https' : (req.protocol || 'http');
    const host = req.get('host') || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    const payload = {
      store_id: SSLCZ_STORE_ID,
      store_passwd: SSLCZ_STORE_PASSWORD,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: payment.tran_id,
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      cus_name: userName || 'User',
      cus_email: userEmail || 'user@brta.gov.bd',
      cus_add1: 'Dhaka',
      cus_add2: '',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1207',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '',
      ship_name: userName || 'User',
      ship_add1: 'Dhaka',
      ship_add2: '',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1207',
      ship_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Vehicle Registration - ${applicationNumber}`,
      product_category: 'Government',
      product_profile: 'general',
      product_amount: String(amount),
      emi_option: 0,
      value_a: userId,
      value_b: paymentId,
      value_c: 'vehicle_registration'
    };

    const response = await axios.post(SSLCZ_API_URL, new URLSearchParams(payload).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.data.status === 'SUCCESS') {
      res.json({ url: response.data.GatewayPageURL });
    } else {
      res.status(400).json({ error: 'Payment gateway initialization failed' });
    }
  } catch (error) {
    console.error('Vehicle registration payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// Route Permit Payment Endpoint
// =====================================================
app.post('/api/payment/route-permit', async (req, res) => {
  try {
    const { payment_id, amount, permit_number, user_name, user_email, frontend_url } = req.body;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ error: 'Payment record not found' });
    }

    if (frontend_url) {
      frontendUrls.set(payment.tran_id, frontend_url);
    }

    // Get dynamic base URL from request
    // Force HTTPS on Render (behind proxy, req.protocol returns 'http')
    const protocol = (req.get('host') || '').includes('onrender.com') ? 'https' : (req.protocol || 'http');
    const host = req.get('host') || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    const payload = {
      store_id: SSLCZ_STORE_ID,
      store_passwd: SSLCZ_STORE_PASSWORD,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: payment.tran_id,
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      cus_name: user_name || 'User',
      cus_email: user_email || 'user@brta.gov.bd',
      cus_add1: 'Dhaka',
      cus_add2: '',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1207',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '',
      ship_name: user_name || 'User',
      ship_add1: 'Dhaka',
      ship_add2: '',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1207',
      ship_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Route Permit - ${permit_number}`,
      product_category: 'Government',
      product_profile: 'general',
      product_amount: String(amount),
      emi_option: 0,
      value_a: payment.user_id,
      value_b: payment_id,
      value_c: 'route_permit'
    };

    const response = await axios.post(SSLCZ_API_URL, new URLSearchParams(payload).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.data.status === 'SUCCESS') {
      res.json({ url: response.data.GatewayPageURL });
    } else {
      res.status(400).json({ error: 'Failed to initiate payment', details: response.data });
    }
  } catch (error) {
    console.error('Route permit payment error:', error);
    res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

// =====================================================
// Ownership Transfer Payment Endpoint
// =====================================================
app.post('/api/payment/ownership-transfer', async (req, res) => {
  try {
    const { payment_id, amount, application_number, vehicle_registration, user_email, frontend_url } = req.body;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ error: 'Payment record not found' });
    }

    if (frontend_url) {
      frontendUrls.set(payment.tran_id, frontend_url);
    }

    // Get dynamic base URL from request
    // Force HTTPS on Render (behind proxy, req.protocol returns 'http')
    const protocol = (req.get('host') || '').includes('onrender.com') ? 'https' : (req.protocol || 'http');
    const host = req.get('host') || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    const payload = {
      store_id: SSLCZ_STORE_ID,
      store_passwd: SSLCZ_STORE_PASSWORD,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: payment.tran_id,
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      cus_name: 'Vehicle Owner',
      cus_email: user_email || 'user@brta.gov.bd',
      cus_add1: 'Dhaka',
      cus_add2: '',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1207',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '',
      ship_name: 'Vehicle Owner',
      ship_add1: 'Dhaka',
      ship_add2: '',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1207',
      ship_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Ownership Transfer - ${application_number} (${vehicle_registration})`,
      product_category: 'Government',
      product_profile: 'general',
      product_amount: String(amount),
      emi_option: 0,
      value_a: payment.user_id,
      value_b: payment_id,
      value_c: 'ownership_transfer'
    };

    const response = await axios.post(SSLCZ_API_URL, new URLSearchParams(payload).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.data.status === 'SUCCESS') {
      res.json({ url: response.data.GatewayPageURL });
    } else {
      res.status(400).json({ error: 'Failed to initiate payment', details: response.data });
    }
  } catch (error) {
    console.error('Ownership transfer payment error:', error);
    res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

// Process vehicle registration after successful payment
app.post('/api/vehicles/registration/process', async (req, res) => {
  try {
    const { payment_id, user_id } = req.body;

    if (!payment_id || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: payment_id, user_id' 
      });
    }

    // Get vehicle registration application
    const { data: application, error: appError } = await supabase
      .from('vehicle_registrations')
      .select('*, vehicles(*)')
      .eq('payment_id', payment_id)
      .eq('user_id', user_id)
      .single();

    if (appError || !application) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vehicle registration application not found' 
      });
    }

    // Get user profile and license
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return res.status(400).json({ 
        success: false, 
        error: 'User profile not found' 
      });
    }

    // Get user's license for NID and bilingual names
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('license_number, full_name_en, full_name_bn, nid_number')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (licenseError) {
      console.error('License error:', licenseError);
      return res.status(400).json({ 
        success: false, 
        error: 'User license not found - user must have a driving license to register vehicles' 
      });
    }

    // Generate registration number and plate
    const { data: regNumber, error: regNumError } = await supabase
      .rpc('generate_registration_number');

    if (regNumError) throw regNumError;

    const { data: plateData, error: plateError } = await supabase
      .rpc('generate_registration_plate', {
        p_division_code: application.division_code,
        p_vehicle_type: application.vehicles.vehicle_type,
        p_engine_cc: application.vehicles.engine_cc
      });

    if (plateError) throw plateError;

    // Calculate valid_until date
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + application.registration_period);

    // Create QR code data
    const qrCodeData = {
      registration_number: regNumber,
      plate: plateData,
      owner: license.full_name_en,
      vehicle: `${application.vehicles.vehicle_name} ${application.vehicles.model}`,
      engine: application.vehicles.engine_number,
      cc: application.vehicles.engine_cc,
      type: application.vehicles.vehicle_type,
      valid_until: validUntil.toISOString().split('T')[0]
    };

    // Create registered vehicle record
    const { data: registeredVehicle, error: regError } = await supabase
      .from('registered_vehicles')
      .insert([{
        registration_number: regNumber,
        user_id: user_id,
        vehicle_id: application.vehicle_id,
        application_id: application.id,
        registration_plate: plateData,
        division_code: application.division_code,
        vehicle_photo_url: application.vehicle_photo_url,
        owner_name_en: license.full_name_en,
        owner_name_bn: license.full_name_bn,
        owner_nid: license.nid_number,
        owner_dl_number: license.license_number,
        vehicle_name: application.vehicles.vehicle_name,
        model: application.vehicles.model,
        engine_number: application.vehicles.engine_number,
        engine_cc: application.vehicles.engine_cc,
        vehicle_type: application.vehicles.vehicle_type,
        registration_date: new Date().toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        qr_code_data: qrCodeData,
        status: 'active'
      }])
      .select()
      .single();

    if (regError) throw regError;

    // Generate tax token number
    const { data: tokenNumber, error: tokenNumError } = await supabase
      .rpc('generate_tax_token_number');

    if (tokenNumError) throw tokenNumError;

    // Calculate tax token validity (1 year from registration)
    const tokenValidUntil = new Date(validUntil);
    
    // Get payment record to link with tax token
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('id', payment_id)
      .single();

    // Create initial tax token for the vehicle
    const currentYear = new Date().getFullYear();
    const { data: taxToken, error: taxTokenError } = await supabase
      .from('tax_tokens')
      .insert([{
        token_number: tokenNumber,
        registered_vehicle_id: registeredVehicle.id,
        user_id: user_id,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: tokenValidUntil.toISOString().split('T')[0],
        tax_year: `${currentYear}-${currentYear + 1}`,
        amount_paid: paymentRecord?.amount || application.amount,
        payment_id: payment_id,
        status: 'active'
      }])
      .select()
      .single();

    if (taxTokenError) {
      console.error('Tax token creation error:', taxTokenError);
      // Don't throw - registration is complete, just log the error
    }

    // Update vehicle registration application status
    await supabase
      .from('vehicle_registrations')
      .update({ 
        payment_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', application.id);

    // Update vehicle with registration plate
    await supabase
      .from('vehicles')
      .update({ registration_plate: plateData })
      .eq('id', application.vehicle_id);

    // Send notification to user
    await supabase
      .from('notifications')
      .insert([{
        user_id: user_id,
        title_en: 'Vehicle Registration Complete!',
        title_bn: 'যানবাহন নিবন্ধন সম্পূর্ণ!',
        message_en: `Your vehicle (${application.vehicles.vehicle_name} ${application.vehicles.model}) has been registered. Plate: ${plateData.en}. Tax Token: ${tokenNumber}`,
        message_bn: `আপনার যানবাহন (${application.vehicles.vehicle_name} ${application.vehicles.model}) নিবন্ধিত হয়েছে। প্লেট: ${plateData.bn}। ট্যাক্স টোকেন: ${tokenNumber}`,
        type: 'vehicle_registration_complete'
      }]);

    // Send SMS notification to user
    try {
      const phoneNumber = await getUserPhoneNumber(supabase, user_id);
      
      if (phoneNumber) {
        console.log('📱 Sending vehicle registration SMS...');
        const vehicleFullName = `${application.vehicles.vehicle_name} ${application.vehicles.model}`;
        const smsResult = await sendVehicleRegistrationSMS(
          phoneNumber,
          regNumber,
          plateData.en,
          vehicleFullName,
          validUntil.toISOString().split('T')[0]
        );
        
        if (smsResult.success) {
          console.log('✅ Vehicle registration SMS sent successfully');
        } else {
          console.error('⚠️ SMS sending failed, but continuing:', smsResult.message);
        }
      } else {
        console.log('⚠️ No phone number found for SMS notification');
      }
    } catch (smsError) {
      // SMS failure should not block registration
      console.error('⚠️ SMS Error (non-blocking):', smsError.message);
    }

    res.json({
      success: true,
      registration: registeredVehicle,
      tax_token: taxToken,
      message: 'Vehicle registered successfully with tax token'
    });

  } catch (error) {
    console.error('Vehicle registration processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// ===== TAX TOKEN RENEWAL ENDPOINTS =====

// Initiate tax token renewal payment
app.post('/api/tax-tokens/renewal/initiate', async (req, res) => {
  try {
    const { vehicle_id, user_id, tran_id, renewal_days, renewal_fee, frontend_url } = req.body;

    if (!vehicle_id || !user_id || !tran_id || !renewal_days || !renewal_fee) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Store frontend URL for redirect after payment
    if (frontend_url && tran_id) {
      frontendUrls.set(tran_id, frontend_url);
      console.log('Stored frontend URL for tax token renewal:', tran_id, '->', frontend_url);
    }

    // Verify vehicle belongs to user
    const { data: vehicle, error: vehicleError } = await supabase
      .from('registered_vehicles')
      .select('*')
      .eq('id', vehicle_id)
      .eq('user_id', user_id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({ 
        success: false, 
        error: 'Vehicle not found or does not belong to user' 
      });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: user_id,
        application_id: null,
        vehicle_id: vehicle_id,
        amount: renewal_fee,
        tran_id: tran_id,
        status: 'initiated',
        payment_type: 'tax_token_renewal',
        renewal_days: renewal_days // Store renewal days in payment metadata
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create payment record' 
      });
    }

    res.json({
      success: true,
      payment: payment,
      renewal_fee: renewal_fee,
      renewal_days: renewal_days,
      message: 'Tax token renewal payment initiated'
    });

  } catch (error) {
    console.error('Tax token renewal initiation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Process tax token renewal after successful payment
app.post('/api/tax-tokens/renewal/process', async (req, res) => {
  try {
    const { vehicle_id, user_id, payment_id, renewal_days, amount_paid } = req.body;

    if (!vehicle_id || !user_id || !payment_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Verify payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', user_id)
      .eq('status', 'success')
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or unsuccessful payment' 
      });
    }

    // Call the database function to process renewal
    const { data: renewalResult, error: renewalError } = await supabase
      .rpc('process_tax_token_renewal', {
        p_vehicle_id: vehicle_id,
        p_user_id: user_id,
        p_payment_id: payment_id,
        p_renewal_days: renewal_days || payment.renewal_days || 365,
        p_amount_paid: amount_paid || payment.amount
      });

    if (renewalError) {
      console.error('Error processing tax token renewal:', renewalError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process renewal',
        details: renewalError 
      });
    }

    // Get vehicle details for notification
    const { data: vehicle } = await supabase
      .from('registered_vehicles')
      .select('registration_number, registration_plate, vehicle_name, model, owner_name_en, owner_name_bn')
      .eq('id', vehicle_id)
      .single();

    // Send notification using dual notification RPC
    await supabase.rpc('create_dual_notification', {
      p_user_id: user_id,
      p_title_en: 'Tax Token Renewed Successfully',
      p_title_bn: 'ট্যাক্স টোকেন সফলভাবে নবায়ন করা হয়েছে',
      p_message_en: `Your tax token for ${vehicle.vehicle_name} ${vehicle.model} (${vehicle.registration_plate.en}) has been renewed for ${renewal_days || payment.renewal_days} days. Amount: ৳${payment.amount.toLocaleString()}`,
      p_message_bn: `আপনার ${vehicle.vehicle_name} ${vehicle.model} (${vehicle.registration_plate.bn}) এর ট্যাক্স টোকেন ${renewal_days || payment.renewal_days} দিনের জন্য নবায়ন করা হয়েছে। পরিমাণ: ৳${payment.amount.toLocaleString()}`,
      p_type: 'renewal',
      p_application_id: null,
      p_action_url: null,
      p_admin_title_en: 'Tax Token Renewal Payment Received',
      p_admin_title_bn: 'ট্যাক্স টোকেন নবায়ন পেমেন্ট প্রাপ্ত',
      p_admin_message_en: `Vehicle ${vehicle.registration_number} - Tax Token Renewal SUCCESS. Amount: ৳${payment.amount}. User: ${vehicle.owner_name_en}`,
      p_admin_message_bn: `যানবাহন ${vehicle.registration_number} - ট্যাক্স টোকেন নবায়ন সফল। পরিমাণ: ৳${payment.amount}। ব্যবহারকারী: ${vehicle.owner_name_bn}`
    });

    // Send SMS notification to user
    try {
      const phoneNumber = await getUserPhoneNumber(supabase, user_id);
      
      if (phoneNumber && vehicle) {
        console.log('📱 Sending tax token renewal SMS...');
        
        // Get updated tax token to find valid_until date
        const { data: taxToken } = await supabase
          .from('tax_tokens')
          .select('valid_until')
          .eq('registered_vehicle_id', vehicle_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const vehicleInfo = `${vehicle.vehicle_name} ${vehicle.model} (${vehicle.registration_plate.en})`;
        const smsResult = await sendTaxTokenRenewalSMS(
          phoneNumber,
          vehicleInfo,
          taxToken?.valid_until || 'N/A',
          payment.amount
        );
        
        if (smsResult.success) {
          console.log('✅ Tax token renewal SMS sent successfully');
        } else {
          console.error('⚠️ SMS sending failed, but continuing:', smsResult.message);
        }
      } else {
        console.log('⚠️ No phone number or vehicle found for SMS notification');
      }
    } catch (smsError) {
      // SMS failure should not block renewal
      console.error('⚠️ SMS Error (non-blocking):', smsError.message);
    }

    res.json({
      success: true,
      renewal: renewalResult,
      message: 'Tax token renewed successfully'
    });

  } catch (error) {
    console.error('Tax token renewal processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get tax token renewal history
app.get('/api/tax-tokens/:vehicle_id/renewals', async (req, res) => {
  try {
    const { vehicle_id } = req.params;

    const { data: renewals, error } = await supabase
      .from('tax_token_renewals')
      .select('*')
      .eq('vehicle_id', vehicle_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tax token renewals:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch renewal history' 
      });
    }

    res.json({
      success: true,
      renewals: renewals || []
    });

  } catch (error) {
    console.error('Error fetching tax token renewals:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// =====================================================
// Ownership Transfer Processing Endpoint
// =====================================================
app.post('/api/ownership-transfer/process', async (req, res) => {
  try {
    const { payment_id, application_id } = req.body;

    if (!payment_id || !application_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payment_id, application_id'
      });
    }

    // Get application details
    const { data: application, error: appError } = await supabase
      .from('ownership_transfer_applications')
      .select('*')
      .eq('id', application_id)
      .eq('payment_id', payment_id)
      .single();

    if (appError || !application) {
      return res.status(400).json({
        success: false,
        error: 'Application not found or payment mismatch'
      });
    }

    // Update application status to payment_completed
    const { error: updateError } = await supabase
      .from('ownership_transfer_applications')
      .update({
        status: 'payment_completed',
        payment_status: 'completed',
        payment_completed_at: new Date().toISOString()
      })
      .eq('id', application_id);

    if (updateError) {
      console.error('Error updating application status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application status'
      });
    }

    // Execute ownership transfer
    const { data: transferResult, error: transferError } = await supabase
      .rpc('execute_ownership_transfer', { p_application_id: application_id });

    if (transferError) {
      console.error('Error executing ownership transfer:', transferError);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute ownership transfer'
      });
    }

    // Send completion notifications to all 3 parties
    await supabase.from('notifications').insert([
      // 1. Previous/Current Owner
      {
        user_id: application.current_owner_user_id,
        title_en: 'Ownership Transfer Completed',
        title_bn: 'মালিকানা হস্তান্তর সম্পন্ন',
        message_en: `Vehicle ownership transfer for ${application.vehicle_name} (${application.vehicle_registration_number}) has been completed successfully. The vehicle is now owned by ${application.new_owner_name_en}.`,
        message_bn: `${application.vehicle_name} (${application.vehicle_registration_number}) গাড়ির মালিকানা হস্তান্তর সফলভাবে সম্পন্ন হয়েছে। গাড়িটি এখন ${application.new_owner_name_bn} এর মালিকানাধীন।`,
        notification_type: 'success',
        priority: 'high',
        recipient_type: 'user'
      },
      // 2. New Owner
      {
        user_id: application.new_owner_user_id,
        title_en: 'Vehicle Ownership Received',
        title_bn: 'গাড়ির মালিকানা প্রাপ্ত',
        message_en: `Congratulations! You are now the registered owner of ${application.vehicle_name} (${application.vehicle_registration_number}). Transfer fee paid: BDT ${application.transfer_fee}. You can now view your vehicle in the dashboard.`,
        message_bn: `অভিনন্দন! আপনি এখন ${application.vehicle_name} (${application.vehicle_registration_number}) গাড়ির নিবন্ধিত মালিক। হস্তান্তর ফি প্রদান: BDT ${application.transfer_fee}। আপনি এখন ড্যাশবোর্ডে আপনার গাড়ি দেখতে পারবেন।`,
        notification_type: 'success',
        priority: 'high',
        recipient_type: 'user'
      },
      // 3. Admin
      {
        user_id: null,
        title_en: 'Ownership Transfer Completed',
        title_bn: 'মালিকানা হস্তান্তর সম্পন্ন',
        message_en: `Ownership transfer ${application.application_number} completed. Vehicle: ${application.vehicle_registration_number}. New owner: ${application.new_owner_name_en}. Transfer fee: BDT ${application.transfer_fee}`,
        message_bn: `মালিকানা হস্তান্তর ${application.application_number} সম্পন্ন। গাড়ি: ${application.vehicle_registration_number}। নতুন মালিক: ${application.new_owner_name_bn}। হস্তান্তর ফি: BDT ${application.transfer_fee}`,
        notification_type: 'info',
        priority: 'normal',
        recipient_type: 'admin'
      }
    ]);

    // Send SMS notifications to both previous and new owner
    try {
      const vehicleInfo = `${application.vehicle_name} (${application.vehicle_registration_number})`;
      
      // SMS to previous owner
      const previousOwnerPhone = await getUserPhoneNumber(supabase, application.current_owner_user_id);
      if (previousOwnerPhone) {
        console.log('📱 Sending ownership transfer SMS to previous owner...');
        const prevSmsResult = await sendOwnershipTransferPreviousSMS(
          previousOwnerPhone,
          vehicleInfo,
          application.new_owner_name_en
        );
        
        if (prevSmsResult.success) {
          console.log('✅ Previous owner SMS sent successfully');
        } else {
          console.error('⚠️ Previous owner SMS failed:', prevSmsResult.message);
        }
      }
      
      // SMS to new owner
      const newOwnerPhone = await getUserPhoneNumber(supabase, application.new_owner_user_id);
      if (newOwnerPhone) {
        console.log('📱 Sending ownership transfer SMS to new owner...');
        const newSmsResult = await sendOwnershipTransferNewSMS(
          newOwnerPhone,
          vehicleInfo,
          application.vehicle_registration_plate || 'N/A',
          application.transfer_fee
        );
        
        if (newSmsResult.success) {
          console.log('✅ New owner SMS sent successfully');
        } else {
          console.error('⚠️ New owner SMS failed:', newSmsResult.message);
        }
      }
    } catch (smsError) {
      // SMS failure should not block transfer
      console.error('⚠️ SMS Error (non-blocking):', smsError.message);
    }

    res.json({
      success: true,
      message: 'Ownership transfer completed successfully',
      application_number: application.application_number
    });

  } catch (error) {
    console.error('Error processing ownership transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Vehicle Adder Endpoints

// Add a new vehicle
app.post('/api/vehicles/add', async (req, res) => {
  try {
    const { vehicle_name, model, engine_number, owner_id, license_id, vehicle_type } = req.body;

    if (!vehicle_name || !model || !engine_number || !owner_id || !license_id || !vehicle_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Fetch license and check type
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id, license_type, user_id')
      .eq('id', license_id)
      .eq('user_id', owner_id)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ success: false, error: 'License not found or does not belong to owner' });
    }

    // License type logic
    if (vehicle_type === 'Bike' && !['Light', 'Light+Motor'].includes(license.license_type)) {
      return res.status(400).json({ success: false, error: 'Owner does not have a valid bike license' });
    }
    if (vehicle_type === 'Car' && !['Motor', 'Light+Motor'].includes(license.license_type)) {
      return res.status(400).json({ success: false, error: 'Owner does not have a valid car license' });
    }

    // Insert vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert([{
        vehicle_name,
        model,
        engine_number,
        owner_id,
        license_id,
        vehicle_type
      }])
      .select()
      .single();

    if (vehicleError) {
      return res.status(500).json({ success: false, error: 'Failed to add vehicle', details: vehicleError });
    }

    res.json({ success: true, vehicle, message: 'Vehicle added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Get all license holders (for vehicle adder selection)
app.get('/api/licenses/holders', async (req, res) => {
  try {
    const { data: holders, error } = await supabase
      .from('licenses')
      .select('id, user_id, license_number, license_type, license_category, full_name_en, full_name_bn');

    if (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch license holders', details: error });
    }

    res.json({ success: true, holders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Send SMS for violation fine
app.post('/api/violations/send-sms', async (req, res) => {
  try {
    const { 
      userId, 
      violationNumber, 
      violationName, 
      amount, 
      websiteUrl 
    } = req.body;

    if (!userId || !violationNumber || !violationName || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Fetch violation details from database to get due_date
    const { data: violation, error: violationError } = await supabase
      .from('traffic_violations')
      .select('due_date')
      .eq('violation_number', violationNumber)
      .single();

    if (violationError) {
      console.error('Error fetching violation:', violationError);
      return res.status(404).json({ 
        success: false, 
        error: 'Violation not found' 
      });
    }

    // Format due date
    const dueDate = violation.due_date 
      ? new Date(violation.due_date).toLocaleDateString('en-GB') 
      : 'N/A';

    // Get user's phone number from auth
    const phoneNumber = await getUserPhoneNumber(supabase, userId);

    if (!phoneNumber) {
      return res.status(404).json({ 
        success: false, 
        error: 'User phone number not found' 
      });
    }

    // Send SMS
    const smsResult = await sendViolationSMS({
      phoneNumber,
      violationNumber,
      violationName,
      amount,
      websiteUrl: websiteUrl || process.env.FRONTEND_URL || 'https://brta-extended.vercel.app',
      dueDate
    });

    if (smsResult.success) {
      res.json({ 
        success: true, 
        message: 'SMS sent successfully',
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone for privacy
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'SMS sending failed',
        details: smsResult.message
      });
    }
  } catch (error) {
    console.error('SMS endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Send SMS for vehicle impoundment
app.post('/api/impoundments/send-sms', async (req, res) => {
  try {
    const { 
      userId, 
      impoundNumber, 
      reason, 
      amount, 
      websiteUrl 
    } = req.body;

    if (!userId || !impoundNumber || !reason || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Get user's phone number
    const phoneNumber = await getUserPhoneNumber(supabase, userId);
    
    if (!phoneNumber) {
      return res.status(404).json({ 
        success: false, 
        error: 'User phone number not found' 
      });
    }

    // Create SMS message
    const smsMessage = `**TEST MESSAGE**\n🚨 BRTA VEHICLE IMPOUNDED\n` +
                      `Your vehicle has been impounded (Racker).\n` +
                      `Reason: ${reason}\n` +
                      `Impound #: ${impoundNumber}\n` +
                      `Fee: BDT ${amount} + 200/day storage\n` +
                      `Pay to release: ${websiteUrl}\n` +
                      `- Bangladesh Road Transport Authority`;

    console.log('📱 Sending impoundment SMS to:', phoneNumber);
    console.log('Message:', smsMessage);

    // Send SMS
    const smsResult = await sendViolationSMS(phoneNumber, smsMessage);

    if (smsResult.success) {
      res.json({ 
        success: true, 
        message: 'Impoundment SMS sent successfully',
        details: smsResult
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'SMS sending failed',
        details: smsResult.message
      });
    }
  } catch (error) {
    console.error('Impoundment SMS error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// ============================================
// PASSWORD RESET ENDPOINTS (OTP-BASED)
// ============================================

// Request OTP via SMS (phone-based)
app.post('/api/auth/request-otp-sms', async (req, res) => {
  try {
    const { phone, language = 'en', skipUserCheck = false } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' ? 'Phone number is required' : 'ফোন নম্বর প্রয়োজন' 
      });
    }

    // Normalize phone number (+880, 880, 0 handling)
    const normalizedPhone = normalizePhoneNumber(phone);
    console.log(`Request OTP SMS: ${normalizedPhone} (original: ${phone})`);

    // Check if user exists by phone in profiles table
    // Try multiple formats since DB might have different format
    let profileData = null;
    let profileError = null;
    
    // Try normalized format (8801XXXXXXXXX)
    const { data: data1, error: error1 } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    
    if (data1) {
      profileData = data1;
    } else {
      // Try with leading zero (01XXXXXXXXX)
      const phoneWithZero = normalizedPhone.replace(/^880/, '0');
      const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('phone', phoneWithZero)
        .maybeSingle();
      
      if (data2) {
        profileData = data2;
      } else {
        // Try with +880
        const { data: data3, error: error3 } = await supabase
          .from('profiles')
          .select('id, phone')
          .eq('phone', '+' + normalizedPhone)
          .maybeSingle();
        
        profileData = data3;
        profileError = error3;
      }
    }

    console.log(`Phone lookup result - Found: ${!!profileData}, Phone in DB: ${profileData?.phone}, SkipCheck: ${skipUserCheck}`);

    // For signup: check if phone is already registered
    if (skipUserCheck) {
      // This is signup - phone should NOT exist
      if (profileData) {
        console.log(`❌ Signup blocked - phone already registered: ${normalizedPhone}`);
        return res.status(400).json({ 
          success: false, 
          error: language === 'en' 
            ? 'This phone number is already registered. Please login instead.' 
            : 'এই ফোন নম্বর ইতিমধ্যে নিবন্ধিত। দয়া করে লগইন করুন।'
        });
      }
      console.log(`✅ Signup allowed - new phone number: ${normalizedPhone}`);
    } else {
      // This is password reset - phone MUST exist
      if (profileError || !profileData) {
        // For security, return success even if user doesn't exist (but don't send SMS)
        console.log(`⚠️ Password reset - phone not found: ${normalizedPhone} (returning fake success for security)`);
        return res.json({ 
          success: true, 
          message: language === 'en' 
            ? 'If an account exists with this phone number, you will receive an OTP code' 
            : 'যদি এই ফোন নম্বরের সাথে কোনো অ্যাকাউন্ট থাকে, আপনি একটি OTP কোড পাবেন'
        });
      }
      console.log(`✅ Password reset - phone found: ${normalizedPhone}`);
    }

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(normalizedPhone, language);

    if (smsResult.success) {
      res.json({ 
        success: true, 
        message: smsResult.message
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: smsResult.message
      });
    }
  } catch (error) {
    console.error('Request SMS OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Verify OTP via phone
app.post('/api/auth/verify-otp-sms', async (req, res) => {
  try {
    const { phone, otp, language = 'en' } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Phone number and OTP are required' 
          : 'ফোন নম্বর এবং OTP প্রয়োজন'
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    const verification = await verifyOTPByPhone(normalizedPhone, otp);

    if (verification.valid) {
      res.json({ 
        success: true, 
        message: language === 'en' 
          ? 'OTP verified successfully' 
          : 'OTP সফলভাবে যাচাই হয়েছে'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: verification.message,
        attemptsLeft: verification.attemptsLeft
      });
    }
  } catch (error) {
    console.error('Verify SMS OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Request OTP for password reset (EMAIL - keep for backward compatibility)
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email, language = 'en', skipUserCheck = false } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' ? 'Email is required' : 'ইমেইল প্রয়োজন' 
      });
    }

    // Only check if user exists for password reset (not for signup)
    if (!skipUserCheck) {
      // Check if user exists in Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error checking user:', userError);
        return res.status(500).json({ 
          success: false, 
          error: language === 'en' ? 'Server error' : 'সার্ভার ত্রুটি' 
        });
      }

      // Find user by email
      const user = userData.users.find(u => u.email === email.toLowerCase());

      if (!user) {
        // For security, return success even if user doesn't exist
        // This prevents email enumeration attacks
        return res.json({ 
          success: true, 
          message: language === 'en' 
            ? 'If an account exists with this email, you will receive an OTP code' 
            : 'যদি এই ইমেইলের সাথে কোনো অ্যাকাউন্ট থাকে, আপনি একটি OTP কোড পাবেন'
        });
      }
    }

    // Generate OTP
    const otp = generateOTP(email);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, language);

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: language === 'en' 
          ? 'OTP sent to your email. Valid for 10 minutes' 
          : 'আপনার ইমেইলে OTP পাঠানো হয়েছে। ১০ মিনিটের জন্য বৈধ'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Failed to send OTP. Please try again later' 
          : 'OTP পাঠাতে ব্যর্থ। পরে আবার চেষ্টা করুন'
      });
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, language = 'en' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Email and OTP are required' 
          : 'ইমেইল এবং OTP প্রয়োজন'
      });
    }

    const verification = verifyOTP(email, otp);

    if (verification.valid) {
      res.json({ 
        success: true, 
        message: language === 'en' 
          ? 'OTP verified successfully' 
          : 'OTP সফলভাবে যাচাই হয়েছে'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: verification.message,
        attemptsLeft: verification.attemptsLeft
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Reset password with OTP via phone
app.post('/api/auth/reset-password-sms', async (req, res) => {
  try {
    const { phone, otp, newPassword, language = 'en' } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Phone number, OTP, and new password are required' 
          : 'ফোন নম্বর, OTP এবং নতুন পাসওয়ার্ড প্রয়োজন' 
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Password must be at least 8 characters' 
          : 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' 
      });
    }

    // Verify OTP
    const verification = await verifyOTPByPhone(normalizedPhone, otp);

    if (!verification.valid) {
      return res.status(400).json({ 
        success: false, 
        error: verification.message
      });
    }

    // Find user by phone number
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (profileError || !profileData) {
      return res.status(404).json({ 
        success: false, 
        error: language === 'en' 
          ? 'User not found' 
          : 'ব্যবহারকারী পাওয়া যায়নি' 
      });
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profileData.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Failed to update password' 
          : 'পাসওয়ার্ড আপডেট করতে ব্যর্থ' 
      });
    }

    res.json({ 
      success: true, 
      message: language === 'en' 
        ? 'Password reset successfully. You can now login with your new password' 
        : 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। এখন আপনি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন'
    });
  } catch (error) {
    console.error('Reset password via SMS error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Reset password with OTP (EMAIL - keep for backward compatibility)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, language = 'en' } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Email, OTP, and new password are required' 
          : 'ইমেইল, OTP এবং নতুন পাসওয়ার্ড প্রয়োজন' 
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;']{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
          : 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে এবং বড় হাতের, ছোট হাতের, সংখ্যা এবং বিশেষ অক্ষর থাকতে হবে'
      });
    }

    // Verify OTP
    const verification = verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({ 
        success: false, 
        error: verification.message,
        attemptsLeft: verification.attemptsLeft
      });
    }

    // Update password in Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return res.status(500).json({ 
        success: false, 
        error: language === 'en' ? 'Server error' : 'সার্ভার ত্রুটি' 
      });
    }

    const user = userData.users.find(u => u.email === email.toLowerCase());

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: language === 'en' ? 'User not found' : 'ব্যবহারকারী পাওয়া যায়নি' 
      });
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: language === 'en' 
          ? 'Failed to update password' 
          : 'পাসওয়ার্ড আপডেট করতে ব্যর্থ' 
      });
    }

    // Delete the used OTP
    deleteOTP(email);

    res.json({ 
      success: true, 
      message: language === 'en' 
        ? 'Password reset successfully. You can now login with your new password' 
        : 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। এখন আপনি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Chatbot routes
app.use('/api/chatbot', chatbotRoutes);

// Telegram notification endpoint for community reports
app.post('/api/telegram/post-report', async (req, res) => {
  try {
    const { report, attachments } = req.body;
    
    if (!report) {
      return res.status(400).json({ 
        success: false, 
        error: 'Report data is required' 
      });
    }

    // Only post dalal reports (not suggestions)
    if (report.report_type !== 'dalal') {
      return res.json({ 
        success: true, 
        message: 'Skipped: Only dalal reports are posted to Telegram',
        skipped: true
      });
    }

    // Post to Telegram
    const posted = await postToTelegramChannel(report, attachments || []);
    
    if (posted) {
      res.json({ 
        success: true, 
        message: 'Successfully posted to Telegram channel' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to post to Telegram channel' 
      });
    }
  } catch (error) {
    console.error('Telegram post endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Test Telegram connection endpoint
app.get('/api/telegram/test', async (req, res) => {
  try {
    const connected = await testTelegramConnection();
    res.json({ 
      success: connected, 
      message: connected 
        ? 'Telegram bot connected successfully' 
        : 'Failed to connect to Telegram bot' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🤖 Chatbot API available at /api/chatbot`);
  console.log(`📱 Telegram API available at /api/telegram`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
