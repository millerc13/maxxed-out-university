# Get All Webhook Subscriptions

**GET** `https://www.fanbasis.com/public-api/webhook-subscriptions`

Get all webhook subscriptions for the authenticated user.

## Authentication

Header: `x-api-key: <your-api-key>`

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Webhook subscriptions retrieved successfully",
  "data": [
    {
      "id": "string",
      "webhook_url": "uri",
      "event_types": ["payment.succeeded", "subscription.created"],
      "is_active": true,
      "created_at": "date-time",
      "updated_at": "date-time"
    }
  ]
}
```
