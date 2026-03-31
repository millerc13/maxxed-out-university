# Get Transactions for a Specific Checkout Session

**GET** `https://www.fanbasis.com/public-api/checkout-sessions/:checkoutSessionId/transactions`

Get transactions for a specific checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkoutSessionId` | string | Yes | ID of the checkout session to get transactions for |

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
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "string",
        "fan": {
          "id": "string",
          "name": "string",
          "email": "string",
          "phone": "string",
          "country_code": "string"
        },
        "servicePayment": {
          "id": "string",
          "payment_type": "string",
          "fund_release_on": "date-time",
          "fund_released": true
        },
        "subscriber": {},
        "service": {
          "id": "string",
          "title": "string",
          "price": 0.0
        },
        "fee_amount": 0.0,
        "net_amount": 0.0
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
