# Get Customer Payment Methods

**GET** `https://www.fanbasis.com/public-api/customers/:customerId/payment-methods`

Get saved payment methods for a customer.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | string | Yes | ID of the customer |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Payment methods retrieved successfully",
  "data": {
    "customer": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "payment_methods": [
      {
        "id": "string",
        "type": "string",
        "last4": "string",
        "brand": "string",
        "exp_month": 12,
        "exp_year": 2026,
        "is_default": true
      }
    ]
  }
}
```

### Response Fields

#### customer

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Customer ID |
| `name` | string | Customer name |
| `email` | string | Customer email |

#### payment_methods[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Payment method ID |
| `type` | string | Payment method type |
| `last4` | string (nullable) | Last 4 digits of card |
| `brand` | string (nullable) | Card brand |
| `exp_month` | integer (nullable) | Card expiration month |
| `exp_year` | integer (nullable) | Card expiration year |
| `is_default` | boolean (nullable) | Whether this is the default payment method |

### 404 Not Found
