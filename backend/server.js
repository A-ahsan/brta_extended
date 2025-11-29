// Minimal Node.js/Express backend for SSLCommerz demo integration
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { updatePaymentAndNotify } from './updatePayment.js';
dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
