# Fanbasis API Documentation

Complete reference for the Fanbasis Public API v1.0.0.

## Quick Reference

- **Production Base URL:** `https://www.fanbasis.com/public-api`
- **Sandbox Base URL:** `https://qa.dev-fan-basis.com/`
- **Authentication:** `x-api-key: <your-api-key>` header on all requests
- **Content-Type:** `application/json`

## General Documentation

| File | Description |
|------|-------------|
| [introduction.md](./introduction.md) | Overview of API sections and webhook system |
| [api-policies.md](./api-policies.md) | Versioning, change notifications, deprecation policy (60-day notice) |
| [api-change-log.md](./api-change-log.md) | API changelog |
| [environments.md](./environments.md) | Production/Sandbox URLs and test card numbers |
| [webhooks.md](./webhooks.md) | Webhook event schemas and example payloads |
| [webhook-signature-validation.md](./webhook-signature-validation.md) | HMAC-SHA256 signature validation (PHP, Node.js, Python, Ruby) |
| [api-reference-introduction.md](./api-reference-introduction.md) | API authentication and versioning |

---

## Checkout Sessions

Base path: `/public-api/checkout-sessions`

[Section overview](./checkout-sessions/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| POST | `/public-api/checkout-sessions` | [create-checkout-session.md](./checkout-sessions/create-checkout-session.md) | Create a checkout session |
| GET | `/public-api/checkout-sessions/:checkoutSessionId` | [get-checkout-session.md](./checkout-sessions/get-checkout-session.md) | Get a checkout session by ID |
| DELETE | `/public-api/checkout-sessions/:checkoutSessionId` | [delete-checkout-session.md](./checkout-sessions/delete-checkout-session.md) | Delete a checkout session |
| GET | `/public-api/checkout-sessions/transactions` | [get-transactions.md](./checkout-sessions/get-transactions.md) | Get all transactions for a creator with product filter |
| GET | `/public-api/checkout-sessions/:productId/subscriptions` | [get-product-subscriptions.md](./checkout-sessions/get-product-subscriptions.md) | Get subscriptions for a specific product |
| GET | `/public-api/checkout-sessions/:checkoutSessionId/transactions` | [get-checkout-session-transactions.md](./checkout-sessions/get-checkout-session-transactions.md) | Get transactions for a specific checkout session |
| GET | `/public-api/checkout-sessions/:checkoutSessionId/subscriptions` | [get-checkout-session-subscriptions.md](./checkout-sessions/get-checkout-session-subscriptions.md) | Get subscriptions for a specific checkout session |
| DELETE | `/public-api/checkout-sessions/:checkoutSessionId/subscriptions/:subscriptionId` | [cancel-checkout-session-subscription.md](./checkout-sessions/cancel-checkout-session-subscription.md) | Cancel a specific subscription |
| POST | `/public-api/checkout-sessions/embedded` | [create-embedded-checkout-session.md](./checkout-sessions/create-embedded-checkout-session.md) | Create an embedded checkout session |
| POST | `/public-api/checkout-sessions/transactions/:transactionId/refund` | [refund-transaction.md](./checkout-sessions/refund-transaction.md) | Refund a transaction |
| POST | `/public-api/checkout-sessions/:checkoutSessionId/extend-subscription` | [extend-subscription.md](./checkout-sessions/extend-subscription.md) | Extend a subscription |

---

## Webhook Subscriptions

Base path: `/public-api/webhook-subscriptions`

[Section overview](./webhook-subscriptions/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/webhook-subscriptions` | [get-webhook-subscriptions.md](./webhook-subscriptions/get-webhook-subscriptions.md) | Get all webhook subscriptions |
| POST | `/public-api/webhook-subscriptions` | [create-webhook-subscription.md](./webhook-subscriptions/create-webhook-subscription.md) | Create a new webhook subscription |
| DELETE | `/public-api/webhook-subscriptions/:webhookSubscriptionId` | [delete-webhook-subscription.md](./webhook-subscriptions/delete-webhook-subscription.md) | Delete a webhook subscription |
| POST | `/public-api/webhook-subscriptions/:webhookSubscriptionId/test` | [test-webhook-subscription.md](./webhook-subscriptions/test-webhook-subscription.md) | Test a webhook subscription |

### Webhook Event Types

- `payment.succeeded`
- `payment.failed`
- `payment.expired`
- `payment.canceled`
- `product.purchased`
- `subscription.created`
- `subscription.renewed`
- `subscription.completed`
- `subscription.canceled`

---

## Customers

Base path: `/public-api/customers`

[Section overview](./customers/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/customers` | [get-customers.md](./customers/get-customers.md) | Get unique customers (filterable by search term) |
| GET | `/public-api/customers/:customerId/payment-methods` | [get-customer-payment-methods.md](./customers/get-customer-payment-methods.md) | Get saved payment methods for a customer |
| POST | `/public-api/customers/:customerId/charge` | [charge-customer.md](./customers/charge-customer.md) | Charge a customer using a saved payment method |

---

## Subscribers

Base path: `/public-api/subscribers`

[Section overview](./subscribers/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/subscribers` | [get-subscribers.md](./subscribers/get-subscribers.md) | Get all subscribers with optional filtering by customer or product |

---

## Discount Codes

Base path: `/public-api/discount-codes`

[Section overview](./discount-codes/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/discount-codes` | [list-discount-codes.md](./discount-codes/list-discount-codes.md) | List discount codes with pagination and search |
| POST | `/public-api/discount-codes` | [create-discount-code.md](./discount-codes/create-discount-code.md) | Create a new discount code |
| GET | `/public-api/discount-codes/:id` | [get-discount-code.md](./discount-codes/get-discount-code.md) | Get a specific discount code |
| PUT | `/public-api/discount-codes/:id` | [update-discount-code.md](./discount-codes/update-discount-code.md) | Update an existing discount code |
| DELETE | `/public-api/discount-codes/:id` | [delete-discount-code.md](./discount-codes/delete-discount-code.md) | Delete a discount code |

### Discount Code Fields

- **discount_type:** `cash` or `percentage`
- **duration:** `once`, `forever`, or `multiple_months`

---

## Products

Base path: `/public-api/products`

[Section overview](./products/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/products` | [list-products.md](./products/list-products.md) | List all products for a creator |

---

## Transactions

Base path: `/public-api/transactions`

[Section overview](./transactions/overview.md)

| Method | Endpoint | File | Description |
|--------|----------|------|-------------|
| GET | `/public-api/transactions/:transactionId` | [get-transaction.md](./transactions/get-transaction.md) | Get a single transaction by ID (hashid or numeric) |

---

## Test Card Numbers

| Brand | Number | CVC | Expiry |
|-------|--------|-----|--------|
| Visa | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Mastercard | 5555 5555 5555 4444 | Any 3 digits | Any future date |
| Amex | 3782 822463 10005 | Any 4 digits | Any future date |
| Discover | 6011 1111 1111 1117 | Any 3 digits | Any future date |

---

## File Structure

```
api-docs/
  README.md                          # This file — complete index
  introduction.md
  api-policies.md
  api-change-log.md
  environments.md
  webhooks.md
  webhook-signature-validation.md
  api-reference-introduction.md
  checkout-sessions/
    overview.md
    create-checkout-session.md
    get-checkout-session.md
    delete-checkout-session.md
    get-transactions.md
    get-product-subscriptions.md
    get-checkout-session-transactions.md
    get-checkout-session-subscriptions.md
    cancel-checkout-session-subscription.md
    create-embedded-checkout-session.md
    refund-transaction.md
    extend-subscription.md
  webhook-subscriptions/
    overview.md
    get-webhook-subscriptions.md
    create-webhook-subscription.md
    delete-webhook-subscription.md
    test-webhook-subscription.md
  customers/
    overview.md
    get-customers.md
    get-customer-payment-methods.md
    charge-customer.md
  subscribers/
    overview.md
    get-subscribers.md
  discount-codes/
    overview.md
    list-discount-codes.md
    create-discount-code.md
    get-discount-code.md
    update-discount-code.md
    delete-discount-code.md
  products/
    overview.md
    list-products.md
  transactions/
    overview.md
    get-transaction.md
```
