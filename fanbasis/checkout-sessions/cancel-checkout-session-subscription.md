# Cancel a Specific Subscription for a Checkout Session

**DELETE** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId/subscriptions/:subscriptionId`

Cancel a specific subscription for a checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session |
| `subscriptionId` | string | Yes | ID of the subscription to cancel (AgencyServiceSubscriber ID from subscription list) |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Subscription cancelled successfully",
  "data": {}
}
```

### 400 Validation Error
### 401 Unauthorized
### 404 Not Found
### 500 Server Error
