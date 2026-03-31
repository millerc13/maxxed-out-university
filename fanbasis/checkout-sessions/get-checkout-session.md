# Get a Checkout Session by ID

**GET** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId`

Get a checkout session by ID.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session to retrieve |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Checkout session retrieved successfully",
  "data": {
    "product": {
      "id": "string",
      "title": "string",
      "description": "string"
    },
    "amount_cents": 0,
    "type": "subscription | onetime_reusable | onetime_non_reusable",
    "metadata": {},
    "expiration_date": "date",
    "subscription": {
      "frequency_days": 0,
      "auto_expire_after_x_periods": 0,
      "free_trial_days": 0,
      "initial_fee": 0,
      "initial_fee_days": 0
    },
    "success_url": "uri",
    "webhook_url": "uri"
  }
}
```

### 401 Unauthorized

Authentication error.

### 404 Not Found

Checkout session not found.
