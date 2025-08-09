import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialize Stripe
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// API functions for Stripe integration
export const createCheckoutSession = async (userId: string, successUrl: string, cancelUrl: string) => {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Get the session token for API authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  
  const response = await fetch(`${backendUrl}/user/${userId}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create checkout session');
  }

  return response.json();
};

export const redirectToCheckout = async (userId: string, successUrl: string, cancelUrl: string) => {
  try {
    const { checkout_url } = await createCheckoutSession(userId, successUrl, cancelUrl);
    window.location.href = checkout_url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const createPortalSession = async (userId: string) => {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Get the session token for API authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  
  const response = await fetch(`${backendUrl}/user/${userId}/create-portal-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create portal session');
  }

  return response.json();
};

export const redirectToPortal = async (userId: string) => {
  try {
    const { portal_url } = await createPortalSession(userId);
    window.location.href = portal_url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}; 