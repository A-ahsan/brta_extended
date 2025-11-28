# Backend for SSLCommerz Integration

## Setup
1. Copy your Supabase project URL and Service Role Key into `.env`:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SSLCZ_STORE_ID=viper67ca2a08d3bea
SSLCZ_STORE_PASSWORD=viper67ca2a08d3bea@ssl
PORT=5000
```

2. Install dependencies:
```
npm install express axios cors body-parser dotenv @supabase/supabase-js
```

3. Start the backend:
```
node server.js
```

## Endpoints
- `POST /api/payment/initiate` — Initiate payment (called from frontend)
- `POST /api/payment/success` — SSLCommerz success callback
- `POST /api/payment/fail` — SSLCommerz fail callback
- `POST /api/payment/cancel` — SSLCommerz cancel callback

## What happens
- Initiate: Creates payment session, returns GatewayPageURL
- Success/Fail/Cancel: Updates payments table in Supabase, sends notifications to user/admin
