# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe payments with their prebuilt subscription page for your Analogous application.

## Prerequisites

- Stripe account created
- Access to your Stripe dashboard
- Your application running locally

## Step 1: Install Dependencies

The dependencies have already been added to your project:

**Frontend:**
```bash
npm install @stripe/stripe-js
```

**Backend:**
```bash
pip install stripe==8.12.0
```

## Step 2: Set Up Stripe Products and Prices

1. **Log into your Stripe Dashboard**
2. **Navigate to Products** → **Add Product**
3. **Create the Scholar Product:**
   - Name: "Scholar Plan"
   - Description: "Unlimited analogy generation and advanced features"
   - Pricing: $6.99 CAD/month (recurring)
   - Billing: Monthly
4. **Note the Product ID and Price ID** - you'll need these for environment variables

## Step 3: Configure Environment Variables

### Backend (.env)
Add these variables to your backend `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
STRIPE_SCHOLAR_PRODUCT_ID=prod_your_scholar_product_id
STRIPE_SCHOLAR_PRICE_ID=price_your_scholar_price_id
```

### Frontend (.env.local)
Add these variables to your frontend `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## Step 4: Set Up Stripe Webhook

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-domain.com/stripe/webhook`
3. **Select events to listen for:**
   - `checkout.session.completed` - Triggers when a customer completes checkout
   - `customer.subscription.created` - Triggers when a new subscription is created
   - `customer.subscription.updated` - Triggers when subscription status changes
   - `customer.subscription.deleted` - Triggers when a subscription is canceled
   - `invoice.paid` - Triggers when a payment is successfully processed
   - `invoice.payment_failed` - Triggers when a payment attempt fails
4. **Copy the webhook signing secret** and add it to your backend `.env` file as `STRIPE_WEBHOOK_SECRET`

### Webhook Event Handling

The application handles each webhook event as follows:

- **checkout.session.completed**: Updates user plan to Scholar and sets subscription details
- **customer.subscription.created**: Ensures user plan is set to Scholar with proper dates
- **customer.subscription.updated**: Handles status changes (active, canceled, past_due, etc.)
- **customer.subscription.deleted**: Downgrades user to Curious plan
- **invoice.paid**: Updates renewal date and confirms active subscription
- **invoice.payment_failed**: Handles failed payments and downgrades user if final attempt fails

## Step 5: Update Database Schema

Run the SQL script to add Stripe-related columns:

```sql
-- Add Stripe subscription ID column to user_information table
ALTER TABLE user_information 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_information_stripe_subscription_id 
ON user_information(stripe_subscription_id);
```

## Step 6: Configure Stripe Customer Portal

1. **Go to Stripe Dashboard** → **Settings** → **Billing** → **Customer Portal**
2. **Enable the customer portal**
3. **Configure the following settings:**
   - **Business information**: Add your business details
   - **Branding**: Upload your logo and customize colors
   - **Features**: Enable subscription cancellation and payment method updates
   - **Products**: Select which products customers can manage

## Step 7: Test the Integration

### Test Checkout Flow
1. Start your backend and frontend servers
2. Navigate to the pricing page
3. Click "Upgrade to Scholar" as a logged-in user
4. Complete the Stripe checkout process
5. Verify the user's plan is updated in your database

### Test Webhook
1. Use Stripe CLI to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:8000/stripe/webhook
   ```
2. Trigger test events to verify webhook handling
3. Use the provided test script for basic webhook testing:
   ```bash
   cd backend
   python test_webhooks.py
   ```

## Step 8: Production Deployment

### Environment Variables
Update your production environment variables with live Stripe keys:

```env
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_stripe_webhook_secret
```

### Webhook URL
Update your webhook endpoint URL in Stripe dashboard to your production domain:
```
https://your-production-domain.com/stripe/webhook
```

## Step 9: Monitor and Maintain

### Stripe Dashboard Monitoring
- Monitor payments in the Stripe dashboard
- Set up alerts for failed payments
- Review webhook delivery logs

### Application Monitoring
- Monitor webhook processing in your application logs
- Set up error tracking for payment-related issues
- Monitor subscription lifecycle events

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Ensure the webhook secret is correct
   - Check that the webhook URL is accessible

2. **Checkout session creation fails**
   - Verify your Stripe keys are correct
   - Check that the price ID exists in your Stripe account

3. **User plan not updating after payment**
   - Check webhook processing logs
   - Verify the user_id is correctly passed in metadata

### Debug Steps

1. **Check Stripe Dashboard** for payment status
2. **Review application logs** for webhook processing
3. **Verify database updates** after successful payments
4. **Test with Stripe test mode** before going live

## Security Considerations

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures** before processing events
3. **Use HTTPS** for all webhook endpoints in production
4. **Implement proper error handling** for payment failures
5. **Regularly rotate API keys** and monitor for suspicious activity

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)

## Next Steps

After implementing this integration, consider:

1. **Adding email notifications** for payment events
2. **Implementing usage-based billing** for additional features
3. **Adding analytics** for subscription metrics
4. **Creating a billing dashboard** for admin users
5. **Implementing dunning management** for failed payments 