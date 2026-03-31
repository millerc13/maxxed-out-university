# Create an Embedded Checkout Session

**POST** `https://www.fanbasis.com/public-api/checkout-sessions/embedded`

Create an embedded checkout session.

## Authentication

Header: `x-api-key: <your-api-key>`

## Request Body

**Content-Type:** `application/json`

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metadata` | object | No | Arbitrary JSON object to store with the checkout session. Example: `{"key":"value","custom_field":"custom_value"}` |

### Example Request Body

```json
{
  "metadata": {
    "key": "value",
    "custom_field": "custom_value"
  }
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Embedded checkout session created successfully",
  "data": {
    "id": "123",
    "checkout_session_secret": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {"key": "value", "custom_field": "custom_value"},
    "created_at": "date-time"
  }
}
```

### 400 Validation Error
### 500 Server Error
