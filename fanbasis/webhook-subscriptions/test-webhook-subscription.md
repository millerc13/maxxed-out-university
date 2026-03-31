# Test Webhook Subscription

**POST** `https://www.fanbasis.com/public-api/webhook-subscriptions/:webhookSubscriptionId/test`

Test a webhook subscription by sending a test event.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookSubscriptionId` | string | Yes | ID of the webhook subscription to test |

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_type` | string | No | Type of event to test |

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
  "event_type": "payment.succeeded"
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Test event sent successfully",
  "data": {}
}
```

### 400 Validation Error
### 404 Not Found
