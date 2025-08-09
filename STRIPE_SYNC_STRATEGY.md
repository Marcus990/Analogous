# Stripe Sync Strategy

This document explains how we maintain bidirectional synchronization between our database and Stripe for subscription management.

## 🔄 **Bidirectional Sync Overview**

### **Your Website → Stripe**
When users take actions on your website, we update Stripe accordingly:

1. **User cancels subscription** → Cancel Stripe subscription at period end
2. **User resumes subscription** → Reactivate Stripe subscription
3. **User upgrades** → Create new Stripe subscription (via checkout)

### **Stripe → Your Database**
When Stripe events occur, webhooks update our database:

1. **Payment successful** → Update renewal date and plan status
2. **Subscription canceled** → Downgrade user to free plan
3. **Payment failed** → Handle according to retry logic

## 📊 **Data Flow**

### **Cancellation Flow:**
```
User clicks "Cancel" on website
    ↓
Update local database: plan_cancelled = true
    ↓
Call Stripe API: cancel_at_period_end = true
    ↓
User keeps access until billing period ends
    ↓
Stripe sends webhook: subscription.deleted
    ↓
Update local database: plan = "curious"
```

### **Resume Flow:**
```
User clicks "Resume" on website
    ↓
Call Stripe API: cancel_at_period_end = false
    ↓
Update local database: plan_cancelled = false
    ↓
User immediately regains Scholar access
```

## 🛠 **Implementation Details**

### **Key Stripe API Calls:**

#### **Cancel Subscription (at period end):**
```python
stripe.Subscription.modify(
    subscription_id,
    cancel_at_period_end=True
)
```

#### **Resume Subscription:**
```python
stripe.Subscription.modify(
    subscription_id,
    cancel_at_period_end=False
)
```

#### **Get Subscription Status:**
```python
subscription = stripe.Subscription.retrieve(subscription_id)
status = subscription.status  # 'active', 'canceled', etc.
cancel_at_period_end = subscription.cancel_at_period_end  # True/False
```

### **Database Schema:**
```sql
user_information:
- stripe_subscription_id (links to Stripe)
- plan (curious/scholar)
- plan_cancelled (boolean)
- upcoming_plan (curious/scholar)
- renewal_date (next billing date)
- subscription_start_date
```

## 🎯 **Status Mapping**

### **Local Database States:**
- `plan = "scholar"` + `plan_cancelled = false` → Active Scholar subscription
- `plan = "scholar"` + `plan_cancelled = true` → Scholar subscription cancelled at period end
- `plan = "curious"` + `plan_cancelled = false` → Free plan (no subscription)

### **Stripe Subscription States:**
- `status = "active"` + `cancel_at_period_end = false` → Active subscription
- `status = "active"` + `cancel_at_period_end = true` → Active but cancelling at period end
- `status = "canceled"` → Subscription cancelled

## 🔧 **Webhook Event Handling**

### **checkout.session.completed:**
- User completes payment
- Update: `plan = "scholar"`, `plan_cancelled = false`
- Store: `stripe_subscription_id`

### **customer.subscription.updated:**
- Handle status changes:
  - `active` + `cancel_at_period_end = true` → Mark as cancelled
  - `active` + `cancel_at_period_end = false` → Mark as active
  - `canceled` → Downgrade to curious

### **customer.subscription.deleted:**
- Subscription fully cancelled
- Update: `plan = "curious"`, clear subscription data

### **invoice.paid:**
- Payment successful
- Update: `renewal_date` (next billing cycle)

### **invoice.payment_failed:**
- Payment failed
- If final attempt: downgrade to curious
- If retry scheduled: keep current plan

## 🚨 **Error Handling**

### **Stripe API Failures:**
- If Stripe API call fails, log error but don't fail user request
- Webhooks will handle sync when Stripe processes the change
- User experience remains smooth

### **Webhook Failures:**
- Stripe retries webhook delivery
- Monitor webhook delivery logs
- Manual sync endpoints available for admin use

## 📈 **Monitoring & Debugging**

### **Key Metrics to Monitor:**
- Webhook delivery success rate
- Stripe API call success rate
- Plan status consistency between DB and Stripe
- Failed payment recovery rate

### **Debugging Tools:**
- Webhook event logs
- Stripe dashboard for subscription status
- Database queries for plan state
- Manual sync endpoints for admin use

## 🔄 **Manual Sync (Admin Only)**

### **Sync User Plan from Stripe:**
```bash
POST /admin/sync-user-plan/{user_id}
```

### **Sync All Users:**
```bash
POST /admin/sync-all-plans
```

## 🎯 **Best Practices**

1. **Always update local database first** before calling Stripe API
2. **Use webhooks as the source of truth** for Stripe changes
3. **Handle API failures gracefully** - don't break user experience
4. **Monitor webhook delivery** and retry failed events
5. **Keep subscription IDs** for all paid users
6. **Test cancellation/resume flows** regularly

## 🚀 **Future Enhancements**

1. **Real-time sync status** in admin dashboard
2. **Automated reconciliation** of plan states
3. **Enhanced error reporting** for sync issues
4. **Bulk operations** for plan management
5. **Audit trail** for all subscription changes 