# Update a Discount Code

**PUT** `https://www.fanbasis.com/public-api/discount-codes/:id`

Update an existing discount code.

## Authentication

Header: `x-api-key: <your-api-key>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | ID of the discount code |

## Request Body

**Content-Type:** `application/json`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Discount code. Possible values: <= 45 characters |
| `description` | string (nullable) | No | Description of the discount code |
| `discount_type` | string | Yes | Type of discount. Possible values: `cash`, `percentage` |
| `value` | number | Yes | Discount value |
| `duration` | string | Yes | How long the discount applies. Possible values: `once`, `forever`, `multiple_months` |
| `expiry` | date (nullable) | No | Expiration date of the discount code |
| `expiry_time` | H:i (nullable) | No | Expiration time of the discount code |
| `limited_redemptions` | boolean (nullable) | No | Whether the code has limited redemptions |
| `usable_number` | integer (nullable) | No | Number of times the code can be used |
| `no_of_months` | integer (nullable) | No | Number of months (used with `multiple_months` duration) |
| `one_time` | boolean (nullable) | No | Whether the code can only be used once per customer |
| `service_ids` | integer[] | Yes | Array of product/service IDs the discount applies to |

### Example Request Body

```json
{
  "code": "SAVE20",
  "description": "string",
  "discount_type": "cash",
  "value": 20,
  "duration": "once",
  "expiry": "2024-07-29",
  "expiry_time": "23:59",
  "limited_redemptions": true,
  "usable_number": 100,
  "no_of_months": 0,
  "one_time": true,
  "service_ids": [1, 2]
}
```

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Discount code updated successfully",
  "data": {}
}
```

### 400 Validation Error
