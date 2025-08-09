# Stripe Customer Management Strategy

## Overview

This document outlines the recommended approach for managing Stripe customer relationships and subscription IDs in our application.

## Key Decision: Preserve Customer Relationships

**We should NOT clear the `stripe_subscription_id` when a subscription ends.** Instead, we preserve the customer relationship for better user experience and data consistency.

## Benefits of Preserving Customer Relationships

### 1. **Improved User Experience**
- Users don't need to re-enter payment information when resubscribing
- Payment methods are preserved and automatically available
- Seamless resubscription process

### 2. **Better Data Consistency**
- Customer history and analytics remain intact
- Subscription history is preserved for reporting
- Customer lifetime value calculations are accurate

### 3. **Reduced Friction**
- Faster checkout process for returning customers
- No duplicate customer records in Stripe
- Consistent customer identification across subscriptions

## Implementation Details

### Current Implementation

1. **Subscription Cancellation (Period End)**
   - `stripe_subscription_id` is **preserved**
   - User is marked as `plan_cancelled: true`
   - Subscription data remains for potential resume

2. **Subscription Deletion (Actual End)**
   - `stripe_subscription_id` is **preserved**
   - User is downgraded to "curious" plan
   - Customer relationship maintained for future resubscriptions

3. **Resubscription Process**
   - System checks for existing `stripe_subscription_id`
   - Reuses existing Stripe customer if available
   - Creates new customer only if no previous relationship exists

### Code Changes Made

#### 1. Updated `handle_subscription_deleted()`
```python
# OLD: Cleared stripe_subscription_id
"stripe_subscription_id": None,

# NEW: Preserves customer relationship
# KEEP stripe_subscription_id for customer relationship preservation
```

#### 2. Updated `handle_subscription_updated()`
```python
# OLD: Cleared stripe_subscription_id on cancellation
"stripe_subscription_id": None,  # Clear subscription ID when actually cancelled

# NEW: Preserves customer relationship
# KEEP stripe_subscription_id for customer relationship preservation
```

#### 3. Enhanced `create_checkout_session()`
```python
# Check if user has an existing Stripe customer (from previous subscription)
stripe_customer_id = None
if user_data.get('stripe_subscription_id'):
    try:
        # Try to get the customer ID from the existing subscription
        existing_subscription = stripe.Subscription.retrieve(user_data['stripe_subscription_id'])
        stripe_customer_id = existing_subscription.customer
        print(f"Found existing Stripe customer: {stripe_customer_id}")
    except stripe.error.StripeError as e:
        print(f"Could not retrieve existing subscription: {e}")
        # Continue without customer ID - Stripe will create a new customer

# Use existing customer if available, otherwise create new one
if stripe_customer_id:
    checkout_session_data['customer'] = stripe_customer_id
    print(f"Reusing existing Stripe customer: {stripe_customer_id}")
else:
    checkout_session_data['customer_email'] = user_data.get('email')
    print(f"Creating new Stripe customer for email: {user_data.get('email')}")
```

## Customer Lifecycle Flow

### 1. **First-Time Subscription**
```
User signs up → Creates Stripe customer → Subscription created → stripe_subscription_id stored
```

### 2. **Subscription Cancellation (Period End)**
```
User cancels → Subscription marked as "cancel_at_period_end" → stripe_subscription_id preserved → User retains access until period end
```

### 3. **Subscription End**
```
Period ends → Subscription actually ends → User downgraded to "curious" → stripe_subscription_id preserved → Customer relationship maintained
```

### 4. **Resubscription**
```
User resubscribes → System finds existing stripe_subscription_id → Reuses existing Stripe customer → New subscription created → Updated stripe_subscription_id stored
```

## Data Schema

### User Information Table
```sql
-- Current schema (preserved)
stripe_subscription_id: TEXT | NULL  -- Preserved even when subscription ends
subscription_start_date: TIMESTAMP | NULL
renewal_date: DATE | NULL
plan: TEXT  -- "curious" or "scholar"
plan_cancelled: BOOLEAN
upcoming_plan: TEXT
```

## Best Practices

### 1. **Customer Identification**
- Always check for existing `stripe_subscription_id` before creating new customers
- Use Stripe's customer ID for consistent identification
- Preserve customer relationships across subscription cycles

### 2. **Error Handling**
- Gracefully handle cases where existing subscription cannot be retrieved
- Fall back to creating new customers when necessary
- Log customer relationship decisions for debugging

### 3. **Data Consistency**
- Keep `stripe_subscription_id` even when subscription ends
- Only clear subscription-specific data (start_date, renewal_date)
- Maintain customer relationship for future interactions

## Migration Considerations

### For Existing Users
- Existing users with cleared `stripe_subscription_id` will create new customers on resubscription
- This is acceptable and will not impact functionality
- Future subscriptions will maintain customer relationships

### For New Users
- All new subscriptions will follow the preserved relationship pattern
- Customer data will be consistent from the first subscription

## Monitoring and Analytics

### Key Metrics to Track
1. **Customer Retention Rate**: Percentage of customers who resubscribe
2. **Resubscription Conversion**: Success rate of resubscription attempts
3. **Customer Lifetime Value**: Average revenue per customer over time
4. **Payment Method Reuse**: Percentage of customers reusing saved payment methods

### Logging
- Log customer relationship decisions
- Track customer ID reuse vs. new customer creation
- Monitor subscription lifecycle events

## Conclusion

Preserving customer relationships by maintaining `stripe_subscription_id` provides significant benefits in terms of user experience, data consistency, and operational efficiency. This approach aligns with Stripe's best practices and ensures a seamless subscription experience for users. 