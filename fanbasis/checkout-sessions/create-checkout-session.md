# Create a Checkout Session

**POST** `https://www.fanbasis.com/public-api/checkout-sessions`

Create a checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Request Body

**Content-Type:** `application/json`

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product` | object | Yes | Product information |
| `product.title` | string | Yes | Possible values: <= 255 characters |
| `product.description` | string | No (nullable) | Product description |
| `amount_cents` | integer | Yes | Possible values: >= 0 |
| `application_fee` | number | No (nullable) | Possible values: >= 0 |
| `type` | string | Yes | Possible values: `subscription`, `onetime_reusable`, `onetime_non_reusable` |
| `metadata` | object | No | Additional metadata (property name* : any) |
| `expiration_date` | date | No (nullable) | Expiration date for the checkout session |
| `subscription` | object | No (nullable) | Required fields if type is `subscription` |
| `subscription.frequency_days` | integer | Required if subscription | Possible values: >= 1 |
| `subscription.auto_expire_after_x_periods` | integer | No (nullable) | Possible values: >= 1 |
| `subscription.free_trial_days` | integer | No (nullable) | Free trial days |
| `subscription.initial_fee` | number | No (nullable) | Possible values: >= 0 |
| `subscription.initial_fee_days` | number | No (nullable) | Initial fee days |
| `success_url` | uri | Yes | Redirect URL on successful payment |
| `webhook_url` | uri | No (nullable) | Webhook URL for payment events |

### Example Request Body

```json
{
  "product": {
    "title": "string",
    "description": "string"
  },
  "amount_cents": 0,
  "application_fee": 0,
  "type": "subscription",
  "metadata": {},
  "expiration_date": "2024-07-29",
  "subscription": {
    "frequency_days": 0,
    "auto_expire_after_x_periods": 0,
    "free_trial_days": 0,
    "initial_fee": 0,
    "initial_fee_days": 0
  },
  "success_url": "string",
  "webhook_url": "string"
}
```

## Responses

### 200 OK

```json
{
  "status": "success",
  "message": "Created Product",
  "data": {
    "checkout_session_id": 123,
    "payment_link": "https://checkout.fanbasis.com/123"
  }
}
```

### 400 Validation Error

```json
{
  "status": "error",
  "message": "Validation failed",
  "data": [],
  "errors": {}
}
```

## Code Examples

### cURL

```bash
curl -X POST https://www.fanbasis.com/public-api/checkout-sessions \
  -H "Accept: application/json" \
  -H "x-api-key: <x-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "title": "string",
      "description": "string"
    },
    "amount_cents": 0,
    "application_fee": 0,
    "type": "subscription",
    "metadata": {},
    "expiration_date": "2024-07-29",
    "subscription": {
      "frequency_days": 0,
      "auto_expire_after_x_periods": 0,
      "free_trial_days": 0,
      "initial_fee": 0,
      "initial_fee_days": 0
    },
    "success_url": "string",
    "webhook_url": "string"
  }'
```
