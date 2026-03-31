# Delete a Webhook Subscription

**DELETE** `https://www.fanbasis.com/public-api/webhook-subscriptions/:webhookSubscriptionId`

Delete a webhook subscription.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookSubscriptionId` | string | Yes | ID of the webhook subscription to delete |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Webhook subscription deleted successfully",
  "data": [],
  "request_id": "string"
}
```

### 404 Not Found
