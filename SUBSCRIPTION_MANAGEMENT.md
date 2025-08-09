# Subscription Management System

This document describes the subscription management system implemented for the Analogous application.

## Overview

The subscription management system allows users to upgrade, downgrade, and manage their subscription plans with proper scheduling and billing cycle handling.

## Database Schema

### User Information Table Fields

The following fields are used in the `user_information` table:

- `plan`: "curious" | "scholar" - Current active plan
- `subscription_start_date`: Date - When the current billing cycle began
- `renewal_date`: Date - When the next billing cycle ends (stored in database)
- `upcoming_plan`: "curious" | "scholar" | null - Indicates scheduled plan change
- `plan_cancelled`: boolean - True if downgrade is scheduled

## Plan States

### 1. User on Curious Plan (Free)
- **Current Plan**: Curious
- **Curious Card**: Shows "Current Plan" (disabled button)
- **Scholar Card**: Shows "Upgrade to Scholar" (clickable)
- **Action**: Clicking upgrade immediately changes plan to Scholar

### 2. User on Scholar Plan (Active)
- **Current Plan**: Scholar
- **Curious Card**: Shows "Downgrade to Curious" (clickable)
- **Scholar Card**: Shows "Current Plan" (disabled button)
- **Action**: Clicking downgrade schedules cancellation for next billing cycle

### 3. User on Scholar Plan (Cancelled)
- **Current Plan**: Scholar (with cancellation scheduled)
- **Curious Card**: Shows "Resume Plan" (clickable)
- **Scholar Card**: Shows "Current Plan" with "Ending [date]" label
- **Warning Banner**: Shows cancellation notice
- **Action**: Clicking resume clears the cancellation schedule

## API Endpoints

### 1. Get User Pricing Stats
```
GET /user/{user_id}/pricing-stats
```
Returns user's current plan, usage statistics, and subscription status.

**Response:**
```json
{
  "currentPlan": "scholar",
  "renewalDate": "2024-02-15",
  "analogiesGeneratedToday": 5,
  "analogiesStoredTotal": 150,
  "upcomingPlan": null,
  "planCancelled": false,
  "subscriptionStartDate": "2024-01-15T10:30:00Z"
}
```

### 2. Upgrade to Scholar
```
POST /user/{user_id}/upgrade-plan
```
Immediately upgrades user from Curious to Scholar plan.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully upgraded to Scholar plan!"
}
```

### 3. Downgrade to Curious
```
POST /user/{user_id}/downgrade-plan
```
Schedules downgrade to Curious plan for next billing cycle.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully scheduled downgrade to Curious plan. Your Scholar benefits will continue until your next billing cycle."
}
```

### 4. Resume Plan
```
POST /user/{user_id}/resume-plan
```
Cancels scheduled downgrade and resumes Scholar plan.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully resumed your Scholar plan!"
}
```

### 5. Process Scheduled Downgrades (Admin)
```
POST /admin/process-scheduled-downgrades
```
Processes scheduled downgrades for users whose renewal date has passed. Should be called by a cron job daily.

**Response:**
```json
{
  "processed": 3,
  "message": "Successfully processed 3 plan downgrades"
}
```

### 6. Process Billing Cycle Renewals (Admin)
```
POST /admin/process-billing-cycle-renewals
```
Processes billing cycle renewals for active Scholar plans. Updates subscription dates for new billing cycles. Should be called by a cron job daily.

**Response:**
```json
{
  "processed": 5,
  "message": "Successfully processed 5 billing cycle renewals"
}
```

### 7. Set User Plan State (Admin - Testing)
```
POST /admin/test/set-user-plan-state
```
Admin endpoint to set user plan state for testing purposes. Should only be used in development/testing environments.

**Request:**
```json
{
  "user_id": "user-id",
  "plan": "scholar",
  "subscription_start_date": "2024-01-15T10:30:00Z",
  "renewal_date": "2024-02-15",
  "upcoming_plan": null,
  "plan_cancelled": false
}
```

### 8. Simulate Date (Admin - Testing)
```
POST /admin/test/simulate-date
```
Admin endpoint to simulate a specific date for testing purposes. Processes renewals and downgrades as if it were that date.

**Request:**
```json
{
  "target_date": "2024-02-15"
}
```

### 9. Get User Plan State (Admin - Testing)
```
GET /admin/test/get-user-plan-state/{user_id}
```
Admin endpoint to get user plan state for testing purposes.

## Frontend Implementation

### Plan State Logic

The frontend uses helper functions to determine the current plan state:

```typescript
const isOnCuriousPlan = () => userStats?.currentPlan === "curious";
const isOnScholarPlan = () => userStats?.currentPlan === "scholar";
const isPlanCancelled = () => userStats?.planCancelled === true;
const hasUpcomingPlan = () => userStats?.upcomingPlan !== null;
```

### UI Behavior

| Plan State | Curious Card Button | Scholar Card Button | Notes |
|------------|-------------------|-------------------|-------|
| On Curious | Current Plan (disabled) | Upgrade (clickable) | Show current usage stats |
| On Scholar | Downgrade (clickable) | Current Plan (disabled) | |
| Scholar (cancelled) | Resume Plan (clickable) | Current Plan (disabled, with "ending [date]" label) | Show warning banner |

### Warning Banner

When a plan is cancelled, a red warning banner appears above the pricing cards:

```
Plan Cancellation Scheduled
Your Scholar plan has been cancelled. You'll be downgraded to Curious on [renewal_date].
```

## Billing Cycle Logic

- **Upgrades**: Take effect immediately
- **Downgrades**: Scheduled for next billing cycle (30 days from subscription start)
- **Resume**: Cancels scheduled downgrade immediately
- **Renewal Date**: Calculated as 30 days from subscription start date

## Usage Limits

### Curious Plan (Free)
- 5 analogies per day
- 100 analogies stored
- 1 analogy per minute rate limit

### Scholar Plan (Paid - $6.99/month)
- 25 analogies per day
- 500 analogies stored
- 5 analogies per minute rate limit

## Testing

### Automated Testing

A comprehensive test script is provided at `backend/test_subscription_scenarios.py` that covers normal operations and edge cases.

To run all test scenarios:
```bash
cd backend
python test_subscription_scenarios.py
```

### Web-Based Testing Interface

A web-based testing interface is available at `backend/test_interface.html` for interactive testing.

To use the web interface:
1. Start your backend server
2. Open `backend/test_interface.html` in your browser
3. Configure the backend URL and user ID
4. Use the interface to test various scenarios

### Test Scenarios Covered

1. **Normal Upgrade/Downgrade Flow**: Complete upgrade → downgrade → resume cycle
2. **Billing Cycle Renewal**: Testing renewal with past renewal dates
3. **Scheduled Downgrade Processing**: Testing scheduled downgrade execution
4. **Edge Case - Cancellation Before Renewal**: Testing cancellation scheduling
5. **Edge Case - Resume After Renewal**: Testing plan resumption
6. **Edge Case - Multiple Renewals**: Testing multiple billing cycles

### Manual Testing Commands

You can also test individual operations using curl:

```bash
# Get user stats
curl -X GET "http://localhost:8000/user/{user_id}/pricing-stats" \
  -H "Authorization: Bearer {token}"

# Upgrade plan
curl -X POST "http://localhost:8000/user/{user_id}/upgrade-plan" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Schedule downgrade
curl -X POST "http://localhost:8000/user/{user_id}/downgrade-plan" \
  -H "Authorization: Bearer {token}"

# Resume plan
curl -X POST "http://localhost:8000/user/{user_id}/resume-plan" \
  -H "Authorization: Bearer {token}"

# Simulate date (admin)
curl -X POST "http://localhost:8000/admin/test/simulate-date" \
  -H "Content-Type: application/json" \
  -d '{"target_date": "2024-02-15"}'
```

## Cron Job Setup

To automatically process scheduled downgrades and billing cycle renewals, set up daily cron jobs:

```bash
# Add to crontab (runs daily at 2 AM)
# Process scheduled downgrades
0 2 * * * curl -X POST http://localhost:8000/admin/process-scheduled-downgrades

# Process billing cycle renewals
5 2 * * * curl -X POST http://localhost:8000/admin/process-billing-cycle-renewals
```

**Note**: The billing cycle renewal job runs 5 minutes after the downgrade job to ensure proper order of operations.

## Security Considerations

- All endpoints require authentication
- Users can only modify their own plans
- Admin endpoints should be protected with additional authentication
- Plan changes are logged for audit purposes

## Future Enhancements

1. **Payment Integration**: Integrate with Stripe or similar payment processor
2. **Email Notifications**: Send emails for plan changes and upcoming renewals
3. **Usage Analytics**: Track usage patterns and provide insights
4. **Plan Customization**: Allow custom plan limits based on usage
5. **Trial Periods**: Implement free trial periods for new users 