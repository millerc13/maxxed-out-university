# Create a Webhook Subscription

**POST** `https://www.fanbasis.com/public-api/webhook-subscriptions`

Create a new webhook subscription.

## Authentication

Header: `x-api-key: <your-api-key>`

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhook_url` | uri | Yes | URL where webhook events will be sent |
| `event_types` | string[] | Yes | Array of event types to subscribe to |

### Possible Event Types

- `payment.succeeded`
- `payment.failed`
- `payment.expired`
- `payment.canceled`
- `product.purchased`
- `subscription.created`
- `subscription.renewed`
- `subscription.completed`
- `subscription.canceled`

### Example Request Body

```json
{
  "webhook_url": "string",
  "event_types": ["payment.succeeded"]
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Webhook subscription created successfully",
  "data": {}
}
```

### 400 Validation Error
### 404 Not Found
