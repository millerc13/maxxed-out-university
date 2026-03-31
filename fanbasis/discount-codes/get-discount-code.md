# Get a Discount Code

**GET** `https://www.fanbasis.com/public-api/discount-codes/:id`

Get a specific discount code.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ID of the discount code |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Discount code retrieved successfully",
  "data": {}
}
```

### 400 Validation Error
