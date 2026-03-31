# Get Unique Customers

**GET** `https://www.fanbasis.com/public-api/customers`

Get unique customers for a creator.

## Authentication

Header: `x-api-key: <your-api-key>`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number for pagination. Possible values: >= 1 |
| `per_page` | integer | No | Number of items per page. Possible values: >= 1 and <= 100 |
| `search` | string | No | Search term to filter customers by email, name, or phone (non-empty) |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Customers retrieved successfully",
  "data": {
    "customers": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "phone": "string",
        "country_code": "string",
        "total_transactions": 0,
        "total_spent": 0.0,
        "last_transaction_date": "date-time"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "per_page": 20,
      "total_items": 200,
      "has_more": true
    }
  }
}
```

### Response Fields

#### customers[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Customer ID |
| `name` | string | Customer name |
| `email` | string | Customer email |
| `phone` | string (nullable) | Customer phone number |
| `country_code` | string (nullable) | Customer country code |
| `total_transactions` | integer | Total number of transactions |
| `total_spent` | number | Total amount spent |
| `last_transaction_date` | date-time | Date of last transaction |

#### pagination

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number |
| `total_pages` | integer | Total number of pages |
| `per_page` | integer | Items per page |
| `total_items` | integer | Total number of items |
| `has_more` | boolean | Whether there are more pages |
