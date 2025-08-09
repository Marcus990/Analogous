# Local Stripe Setup Guide

## Environment Variables for Local Testing

Add these variables to your `backend/.env` file:

```env
# Stripe Configuration for Local Testing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_e12f2cf1900b5580448239c903073a2faa82f5de639df186af10bbf882ebe1d5
STRIPE_SCHOLAR_PRODUCT_ID=prod_your_scholar_product_id
STRIPE_SCHOLAR_PRICE_ID=price_your_scholar_price_id
```

## Current Setup Status

✅ **Stripe CLI installed and authenticated**
✅ **Webhook forwarding active** - `stripe listen --forward-to localhost:8000/stripe/webhook`
✅ **Webhook secret generated** - `whsec_e12f2cf1900b5580448239c903073a2faa82f5de639df186af10bbf882ebe1d5`
✅ **Backend server running** - `./start.sh`

## Testing Webhooks

### 1. Test with Stripe CLI
The webhook forwarding is already active. You can trigger test events:

```bash
# Test checkout session completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription deletion
stripe trigger customer.subscription.deleted

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

### 2. Test with Custom Data
You can also test with custom user IDs:

```bash
# Test with specific user ID
stripe trigger checkout.session.completed --add checkout_session:metadata.user_id=your_test_user_id
```

### 3. Monitor Webhook Events
Watch the webhook events in real-time:

```bash
# In a separate terminal
stripe listen --print-events
```

## Next Steps

1. **Add the webhook secret to your `.env` file**
2. **Create your Stripe products and prices** in the Stripe dashboard
3. **Update the product and price IDs** in your `.env` file
4. **Test the checkout flow** with your frontend
5. **Monitor webhook processing** in your backend logs

## Troubleshooting

- **Webhook not receiving events**: Make sure the Stripe CLI is running with `stripe listen`
- **Signature verification fails**: Ensure the webhook secret in your `.env` matches the CLI output
- **Backend not responding**: Check that your FastAPI server is running on port 8000 