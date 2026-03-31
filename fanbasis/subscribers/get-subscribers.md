# Get All Subscribers

**GET** `https://www.fanbasis.com/public-api/subscribers`

Get all subscribers for a creator with optional filtering.

## Authentication

Header: `x-api-key: <your-api-key>`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | No | Filter by customer ID |
| `product_id` | string | No | Filter by product ID |
| `page` | integer | No | Page number for pagination. Possible values: >= 1 |
| `per_page` | integer | No | Number of items per page. Possible values: >= 1 and <= 100 |

## Responses

### 200 Success

```json
{
  "status": "success",
  "message": "Subscribers retrieved successfully",
  "data": {
    "subscribers": [
      {
        "id": "string",
        "customer": {
          "id": "string",
          "name": "string",
          "email": "string",
          "phone": "string",
          "country_code": "string"
        },
        "product": {
          "id": "string",
          "title": "string",
          "description": "string",
          "price": 0.0,
          "payment_link": "string"
        },
        "subscription": {
          "id": "string",
          "status": "string",
          "service_type": "string",
          "payment_frequency": 30,
          "completion_date": "date-time",
          "cancelled_at": "date-time",
          "auto_renew_count": 0,
          "charge_consent": true,
          "created_at": "date-time",
          "updated_at": "date-time"
        }
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

#### subscribers[]

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Subscriber ID |

#### subscribers[].customer

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Customer ID |
| `name` | string | Customer name |
| `email` | string | Customer email |
| `phone` | string | Customer phone |
| `country_code` | string | Customer country code |

#### subscribers[].product

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Product ID |
| `title` | string | Product title |
| `description` | string | Product description |
| `price` | number | Product price |
| `payment_link` | string | Product payment link |

#### subscribers[].subscription

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Subscription ID |
| `status` | string | Subscription status |
| `service_type` | string | Type of service |
| `payment_frequency` | integer | Payment frequency in days |
| `completion_date` | date-time | When the subscription completes |
| `cancelled_at` | date-time (nullable) | When the subscription was cancelled |
| `auto_renew_count` | integer | Number of auto-renewals |
| `charge_consent` | boolean | Whether charge consent was given |
| `created_at` | date-time | When the subscription was created |
| `updated_at` | date-time | When the subscription was last updated |

#### pagination

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number |
| `total_pages` | integer | Total number of pages |
| `per_page` | integer | Items per page |
| `total_items` | integer | Total number of items |
| `has_more` | boolean | Whether there are more pages |

### 400 Validation Error
### 500 Server Error
