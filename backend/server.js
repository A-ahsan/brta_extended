// Minimal Node.js/Express backend for SSLCommerz demo integration
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { updatePaymentAndNotify } from './updatePayment.js';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
  const { amount, customerName, customerEmail, tran_id, application_id, user_id, frontend_url } = req.body;
  
  // Store frontend URL for this transaction
  if (frontend_url) {
    frontendUrls.set(tran_id, frontend_url);
  }
  
  // Get dynamic base URL from request
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  const baseUrl = `${protocol}://${host}`;
  
  const payload = {
    store_id: SSLCZ_STORE_ID,
    store_passwd: SSLCZ_STORE_PASSWORD,
    total_amount: String(amount),
    currency: 'BDT',
    tran_id: String(tran_id),
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
  const frontendUrl = frontendUrls.get(tran_id) || 'http://localhost:3000';
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
  const frontendUrl = frontendUrls.get(tran_id) || 'http://localhost:3000';
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
    if (application.status !== 'approved' && application.payment !== 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Application must be approved and payment completed before generating license' 
      });
    }

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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
