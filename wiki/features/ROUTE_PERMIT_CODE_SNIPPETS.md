# Quick Implementation - Code Snippets to Add

## 1. Install Packages
```bash
npm install leaflet react-leaflet qrcode
```

## 2. Add to backend/server.js (around line 730)

```javascript
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

    const protocol = req.protocol || 'https';
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
```

## 3. Add to backend/updatePayment.js (around line 30)

```javascript
// Check if it's a route permit payment
let isRoutePermit = false;
let routePermit = null;

if (payment.payment_type === 'route_permit') {
  isRoutePermit = true;
  const { data: permitData } = await supabase
    .from('route_permits')
    .select('permit_number, route_from_en, route_to_en, distance_km, permit_days')
    .eq('payment_id', payment.id)
    .single();
  routePermit = permitData;
  appNumber = permitData?.permit_number || tran_id;
}
```

Then add around line 240 (in the success notification section):

```javascript
} else if (isRoutePermit) {
  userTitleEn = 'Route Permit Payment Successful';
  userTitleBn = 'রুট পারমিট পেমেন্ট সফল';
  userMsgEn = `Your route permit payment of BDT ${payment.amount} was successful. Permit: ${appNumber}. Pending admin approval.`;
  userMsgBn = `আপনার রুট পারমিট পেমেন্ট BDT ${payment.amount} সফল হয়েছে। পারমিট: ${appNumber}। অ্যাডমিন অনুমোদন মুলতুবি।`;
  adminTitleEn = 'Route Permit Payment Received';
  adminTitleBn = 'রুট পারমিট পেমেন্ট প্রাপ্ত';
  adminMsgEn = `Route permit payment received: ${appNumber}. Route: ${routePermit.route_from_en} → ${routePermit.route_to_en} (${routePermit.distance_km} km, ${routePermit.permit_days} days). Amount: BDT ${payment.amount}. Awaiting review.`;
  adminMsgBn = `রুট পারমিট পেমেন্ট প্রাপ্ত: ${appNumber}। রুট: ${routePermit.route_from_en} → ${routePermit.route_to_en} (${routePermit.distance_km} কিমি, ${routePermit.permit_days} দিন)। পরিমাণ: BDT ${payment.amount}। পর্যালোচনার জন্য অপেক্ষমাণ।`;
  
  // Update route permit payment status
  await supabase
    .from('route_permits')
    .update({ 
      payment_status: 'completed',
      payment_date: new Date().toISOString()
    })
    .eq('payment_id', payment.id);
```

Make sure to close the if-else properly.
