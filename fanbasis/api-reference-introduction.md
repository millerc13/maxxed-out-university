# Fanbasis API Reference - Introduction

**Version:** 1.0.0

## Authentication

The Fanbasis API uses API Key authentication.

| Property | Value |
|----------|-------|
| Security Scheme Type | apiKey |
| Header parameter name | `x-api-key` |

All API requests must include the `x-api-key` header with your API key.

### Example

```
x-api-key: your_api_key_here
```

## Base URLs

- **Production:** `https://www.fanbasis.com/public-api`
- **Sandbox:** `https://qa.dev-fan-basis.com/`

## API Sections

- [Checkout Sessions](./checkout-sessions/overview.md) - 11 endpoints
- [Webhook Subscriptions](./webhook-subscriptions/overview.md) - 4 endpoints
- [Customers](./customers/overview.md) - 3 endpoints
- [Subscribers](./subscribers/overview.md) - 1 endpoint
- [Discount Codes](./discount-codes/overview.md) - 5 endpoints
- [Products](./products/overview.md) - 1 endpoint
- [Transactions](./transactions/overview.md) - 1 endpoint
