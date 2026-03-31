# Checkout Sessions

Everything about your Checkout Sessions.

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/public-api/checkout-sessions` | [Create a checkout session](./create-checkout-session.md) |
| GET | `/public-api/checkout-sessions/:checkoutSessionId` | [Get a checkout session by ID](./get-checkout-session.md) |
| DELETE | `/public-api/checkout-sessions/:checkoutSessionId` | [Delete a checkout session](./delete-checkout-session.md) |
| GET | `/public-api/checkout-sessions/transactions` | [Get all transactions for a creator with product filter](./get-transactions.md) |
| GET | `/public-api/checkout-sessions/:productId/subscriptions` | [Get subscriptions for a specific product](./get-product-subscriptions.md) |
| GET | `/public-api/checkout-sessions/:checkoutSessionId/transactions` | [Get transactions for a specific checkout session](./get-checkout-session-transactions.md) |
| GET | `/public-api/checkout-sessions/:checkoutSessionId/subscriptions` | [Get subscriptions for a specific checkout session](./get-checkout-session-subscriptions.md) |
| DELETE | `/public-api/checkout-sessions/:checkoutSessionId/subscriptions/:subscriptionId` | [Cancel a specific subscription for a checkout session](./cancel-checkout-session-subscription.md) |
| POST | `/public-api/checkout-sessions/embedded` | [Create an embedded checkout session](./create-embedded-checkout-session.md) |
| POST | `/public-api/checkout-sessions/transactions/:transactionId/refund` | [Refund a transaction](./refund-transaction.md) |
| POST | `/public-api/checkout-sessions/:checkoutSessionId/extend-subscription` | [Extend subscription](./extend-subscription.md) |
