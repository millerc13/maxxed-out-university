# List Discount Codes

**GET** `https://www.fanbasis.com/public-api/discount-codes`

List discount codes with pagination and search.

## Authentication

Header: `x-api-key: <your-api-key>`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search term |
| `per_page` | integer | No | Number of items per page. Possible values: >= 1 and <= 100 |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Discount codes retrieved successfully",
  "data": {
    "current_page": 1,
    "data": [],
    "total": 0
  }
}
```

### Response Fields

#### data

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number |
| `data` | array | Array of discount code objects |
| `total` | integer | Total number of discount codes |

### 400 Validation Error
