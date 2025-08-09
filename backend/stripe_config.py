import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Stripe configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Product and price IDs (you'll get these from your Stripe dashboard)
SCHOLAR_PRODUCT_ID = os.getenv('STRIPE_SCHOLAR_PRODUCT_ID', 'prod_your_scholar_product_id')
SCHOLAR_PRICE_ID = os.getenv('STRIPE_SCHOLAR_PRICE_ID', 'price_your_scholar_price_id')

# Currency and pricing
CURRENCY = 'cad'
SCHOLAR_PRICE = 699  # $6.99 in cents 