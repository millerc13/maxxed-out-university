# Extend Subscription

**POST** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId/extend-subscription`

Extend a subscription for a specific user and product.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session (product) |

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | No | ID of the user whose subscription to extend |
| `duration_days` | integer | No | Number of days to extend the subscription. Possible values: >= 1 |

### Example Request Body

```json
{
  "user_id": "string",
  "duration_days": 30
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Subscription extended successfully",
  "data": {}
}
```

### 400 Validation Error
### 401 Unauthorized
### 404 Not Found
### 500 Server Error
