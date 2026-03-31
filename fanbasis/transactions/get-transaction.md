# Get a Single Transaction by ID

**GET** `https://www.fanbasis.com/public-api/transactions/:transactionId`

Get a single transaction by ID.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transactionId` | string | Yes | ID of the transaction to retrieve (can be hashid or numeric) |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "string",
    "transaction_date": "date-time",
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
    "service": {
      "id": "string",
      "title": "string",
      "description": "string",
      "price": 0.0,
      "payment_link": "string"
    },
    "product": {
      "id": "string",
      "title": "string",
      "description": "string",
      "price": 0.0,
      "payment_link": "string"
    },
    "refunds": [
      {
        "id": "string",
        "payment_id": "string",
        "amount": 0.0,
        "created_at": "date-time"
      }
    ],
    "fee_amount": 0.0,
    "net_amount": 0.0
  }
}
```

### Response Fields

#### data

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Transaction ID |
| `transaction_date` | date-time | Date and time of the transaction |
| `fee_amount` | number | The processing fee charged (in same currency as transaction) |
| `net_amount` | number | Amount after fees (transaction amount - fee) |

#### data.fan

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Fan/customer ID |
| `name` | string | Fan name |
| `email` | string | Fan email |
| `phone` | string | Fan phone |
| `country_code` | string | Fan country code |

#### data.servicePayment

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Service payment ID |
| `payment_type` | string | Type of payment |
| `fund_release_on` | date-time | When funds are scheduled for release |
| `fund_released` | boolean | Whether funds have been released |

#### data.service

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Service/checkout session ID |
| `title` | string | Service title |
| `description` | string | Service description |
| `price` | number | Service price |
| `payment_link` | string | Service payment link |

#### data.product

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Product ID |
| `title` | string | Product title |
| `description` | string | Product description |
| `price` | number | Product price |
| `payment_link` | string | Product payment link |

#### data.refunds[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Refund ID |
| `payment_id` | string | Original payment ID |
| `amount` | number | Refunded amount |
| `created_at` | date-time | When the refund was created |

### 401 Unauthorized
### 404 Not Found
### 500 Server Error
