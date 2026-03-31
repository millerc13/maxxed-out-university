# Delete a Checkout Session

**DELETE** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId`

Delete a checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session to delete |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Checkout session deleted successfully",
  "data": []
}
```

### 401 Unauthorized

Authentication error.

### 404 Not Found

Checkout session not found.
