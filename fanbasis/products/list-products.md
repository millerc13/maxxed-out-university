# List Products

**GET** `https://www.fanbasis.com/public-api/products`

List all products for a creator.

## Authentication

Header: `x-api-key: <your-api-key>`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number for pagination. Possible values: >= 1 |
| `per_page` | integer | No | Number of items per page. Possible values: >= 1 and <= 100 |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Products retrieved successfully",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": "string",
        "title": "string",
        "internal_name": "string",
        "description": "string",
        "price": 0.0,
        "payment_link": "uri"
      }
    ],
    "first_page_url": "uri",
    "from": 1,
    "last_page": 10,
    "last_page_url": "uri",
    "next_page_url": "uri",
    "path": "uri",
    "per_page": 20,
    "prev_page_url": "uri",
    "to": 20,
    "total": 200
  }
}
```

### Response Fields

#### data (pagination wrapper)

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number |
| `data` | object[] | Array of product objects |
| `first_page_url` | uri | URL of first page |
| `from` | integer | First item index on this page |
| `last_page` | integer | Last page number |
| `last_page_url` | uri | URL of last page |
| `next_page_url` | uri (nullable) | URL of next page |
| `path` | uri | Base path |
| `per_page` | integer | Items per page |
| `prev_page_url` | uri (nullable) | URL of previous page |
| `to` | integer | Last item index on this page |
| `total` | integer | Total number of items |

#### data.data[] (products)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Product ID |
| `title` | string | Product title |
| `internal_name` | string (nullable) | Internal name for the product |
| `description` | string (nullable) | Product description |
| `price` | number | Product price |
| `payment_link` | uri | URL of the payment/checkout page |

### 400 Validation Error
### 500 Server Error
