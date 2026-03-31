# Charge Customer

**POST** `https://www.fanbasis.com/public-api/customers/:customerId/charge`

Charge a customer using a specific payment method.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | string | Yes | ID of the customer to charge |

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_method_id` | string | No | ID of the payment method to use |
| `service_id` | string | No | ID of the service |
| `amount_cents` | integer | No | Amount in cents to charge. Possible values: >= 1 |
| `description` | string | No | Description of the charge |
| `metadata` | object | No | Arbitrary JSON object to store with the charge |

### Example Request Body

```json
{
  "payment_method_id": "string",
  "service_id": "string",
  "amount_cents": 1000,
  "description": "string",
  "metadata": {}
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Customer charged successfully",
  "data": {
    "charge_id": "string",
    "amount": 10.00,
    "status": "string",
    "created_at": "date-time"
  }
}
```

### Response Fields

#### data

| Field | Type | Description |
|-------|------|-------------|
| `charge_id` | string | ID of the charge |
| `amount` | number | Amount charged |
| `status` | string | Status of the charge |
| `created_at` | date-time | When the charge was created |

### 400 Validation Error
### 404 Not Found
