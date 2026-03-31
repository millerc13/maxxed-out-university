# Delete a Discount Code

**DELETE** `https://www.fanbasis.com/public-api/discount-codes/:id`

Delete a discount code.

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
  "message": "Discount code deleted successfully",
  "data": []
}
```

### 400 Validation Error
