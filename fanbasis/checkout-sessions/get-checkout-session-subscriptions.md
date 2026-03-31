# Get Subscriptions for a Specific Checkout Session

**GET** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId/subscriptions`

Get subscriptions for a specific checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session to get subscriptions for |

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number for pagination. Possible values: >= 1 |
| `per_page` | integer | No | Number of items per page. Possible values: >= 1 and <= 100 |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "id": "string",
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "phone": "string",
        "country_code": "string",
        "subscription_status": "string",
        "next_renewal_date": "date-time",
        "created_at": "date-time"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_items": 0,
      "has_more": false
    }
  }
}
```

### 400 Validation Error
### 401 Unauthorized
### 404 Not Found
### 500 Server Error
