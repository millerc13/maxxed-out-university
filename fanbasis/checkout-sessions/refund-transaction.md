# Refund a Transaction

**POST** `https://www.fanbasis.com/public-api/checkout-sessions/transactions/:transactionId/refund`

Refund a transaction.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transactionId` | string/integer | Yes | ID of the transaction to refund (can be hashid or payment_id) |

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount_cents` | integer | No | Amount in cents to refund. Possible values: >= 1 |

### Example Request Body

```json
{
  "amount_cents": 1000
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Transaction refunded successfully",
  "data": {},
  "request_id": "req_1234567890"
}
```

### 400 Validation Error
### 401 Unauthorized
### 403 Forbidden
### 404 Not Found
### 500 Server Error
