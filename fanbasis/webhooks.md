# Webhook Events

This document describes all available webhook events that can be received from the Fanbasis system.

## Event Types

### payment.succeeded

- **Category:** payment
- **Action:** succeeded
- **Description:** Triggered when a payment is successfully processed

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "amount", "currency", "status", "created_at", "buyer", "item"],
  "properties": {
    "payment_id": {
      "type": "string",
      "description": "The unique identifier for the payment"
    },
    "amount": {
      "type": "number",
      "description": "The payment amount"
    },
    "currency": {
      "type": "string",
      "description": "The payment currency (e.g., USD)"
    },
    "status": {
      "type": "string",
      "description": "The payment status (e.g., succeeded)"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the payment was created"
    },
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription)" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `payment_id` | string | The unique identifier for the payment |
| `amount` | number | The payment amount |
| `currency` | string | The payment currency (e.g., USD) |
| `status` | string | The payment status (e.g., succeeded) |
| `created_at` | string | ISO 8601 timestamp of when the payment was created |
| `buyer` | object | Buyer information |
| `item` | object | Item information |

#### Example Payload

```json
{
  "payment_id": "example_value",
  "amount": 123.45,
  "currency": "example_value",
  "status": "example_value",
  "created_at": "2025-11-20T21:42:47+00:00",
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  }
}
```

---

### payment.failed

- **Category:** payment
- **Action:** failed
- **Description:** Triggered when a payment fails (e.g., card declined, insufficient funds)

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "customer_id", "failure_reason", "timestamp"],
  "properties": {
    "payment_id": {
      "type": "string",
      "description": "The unique identifier for the payment (payment_intent_id, charge_id, etc.)"
    },
    "customer_id": {
      "type": "integer",
      "description": "The customer/user ID. May be 0 if customer cannot be determined."
    },
    "subscription_id": {
      "type": ["integer", "null"],
      "description": "The subscription ID if this payment failure is related to a subscription"
    },
    "failure_reason": {
      "type": "string",
      "description": "The reason for the payment failure (e.g., \"Your card was declined\", \"Insufficient funds\")"
    },
    "status_code": {
      "type": ["string", "null"],
      "description": "HTTP or gateway status code if available (e.g., \"card_declined\", \"insufficient_funds\")"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the payment failure occurred"
    },
    "service_id": {
      "type": ["integer", "null"],
      "description": "The service/product ID if available"
    },
    "event_type": {
      "type": "string",
      "description": "The event type identifier"
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `payment_id` | string | The unique identifier for the payment (payment_intent_id, charge_id, etc.) |
| `customer_id` | integer | The customer/user ID. May be 0 if customer cannot be determined. |
| `failure_reason` | string | The reason for the payment failure |
| `timestamp` | string | ISO 8601 timestamp of when the payment failure occurred |

#### Example Payload

```json
{
  "payment_id": "example_value",
  "customer_id": 123,
  "failure_reason": "example_value",
  "timestamp": "2025-11-20T21:42:47+00:00"
}
```

---

### payment.expired

- **Category:** payment
- **Action:** expired
- **Description:** Triggered when a checkout session expires without completion

#### Schema

```json
{
  "type": "object",
  "required": ["checkout_session_id", "customer_id", "failure_reason", "expiration_date", "timestamp"],
  "properties": {
    "checkout_session_id": {
      "type": "string",
      "description": "The checkout session ID that expired"
    },
    "customer_id": {
      "type": "integer",
      "description": "The customer/user ID. May be 0 if customer cannot be determined."
    },
    "subscription_id": {
      "type": ["integer", "null"],
      "description": "The subscription ID if this expired session is related to a subscription"
    },
    "failure_reason": {
      "type": "string",
      "description": "The reason for expiration (always \"Payment session expired\")"
    },
    "expiration_date": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the checkout session expired"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the expiration event was processed"
    },
    "service_id": {
      "type": ["integer", "null"],
      "description": "The service/product ID"
    },
    "service_title": {
      "type": ["string", "null"],
      "description": "The service/product title"
    },
    "service_type": {
      "type": ["string", "null"],
      "description": "The service type (e.g., subscription, onetime)"
    },
    "event_type": {
      "type": "string",
      "description": "The event type identifier"
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `checkout_session_id` | string | The checkout session ID that expired |
| `customer_id` | integer | The customer/user ID. May be 0 if customer cannot be determined. |
| `failure_reason` | string | The reason for expiration (always "Payment session expired") |
| `expiration_date` | string | ISO 8601 timestamp of when the checkout session expired |
| `timestamp` | string | ISO 8601 timestamp of when the expiration event was processed |

#### Example Payload

```json
{
  "checkout_session_id": "example_value",
  "customer_id": 123,
  "failure_reason": "example_value",
  "expiration_date": "2025-11-20T21:42:47+00:00",
  "timestamp": "2025-11-20T21:42:47+00:00"
}
```

---

### payment.canceled

- **Category:** payment
- **Action:** canceled
- **Description:** Triggered when a payment is canceled by the user or system

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "customer_id", "failure_reason", "timestamp"],
  "properties": {
    "payment_id": {
      "type": "string",
      "description": "The unique identifier for the canceled payment"
    },
    "customer_id": {
      "type": "integer",
      "description": "The customer/user ID. May be 0 if customer cannot be determined."
    },
    "subscription_id": {
      "type": ["integer", "null"],
      "description": "The subscription ID if this payment cancellation is related to a subscription"
    },
    "failure_reason": {
      "type": "string",
      "description": "The reason for payment cancellation (e.g., \"Payment was canceled by user\", \"Payment canceled\")"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the payment was canceled"
    },
    "service_id": {
      "type": ["integer", "null"],
      "description": "The service/product ID if available"
    },
    "event_type": {
      "type": "string",
      "description": "The event type identifier"
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `payment_id` | string | The unique identifier for the canceled payment |
| `customer_id` | integer | The customer/user ID. May be 0 if customer cannot be determined. |
| `failure_reason` | string | The reason for payment cancellation |
| `timestamp` | string | ISO 8601 timestamp of when the payment was canceled |

#### Example Payload

```json
{
  "payment_id": "example_value",
  "customer_id": 123,
  "failure_reason": "example_value",
  "timestamp": "2025-11-20T21:42:47+00:00"
}
```

---

### product.purchased

- **Category:** product
- **Action:** purchased
- **Description:** Triggered when a product is purchased (unique for each bump, upsell, or downsell)

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "currency", "status", "created_at", "product_price", "buyer", "item"],
  "properties": {
    "payment_id": {
      "type": "string",
      "description": "The unique identifier for the payment"
    },
    "currency": {
      "type": "string",
      "description": "The payment currency (e.g., USD)"
    },
    "status": {
      "type": "string",
      "description": "The payment status (e.g., succeeded)"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the payment was created"
    },
    "product_price": {
      "type": "number",
      "description": "The price of the purchased product"
    },
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription, onetime)" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    },
    "additional_params": {
      "type": ["object", "null"],
      "description": "Additional parameters specific to the purchase (e.g., upsell, downsell, bump)"
    },
    "event_type": {
      "type": "string",
      "description": "The event type identifier"
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `payment_id` | string | The unique identifier for the payment |
| `currency` | string | The payment currency (e.g., USD) |
| `status` | string | The payment status (e.g., succeeded) |
| `created_at` | string | ISO 8601 timestamp of when the payment was created |
| `product_price` | number | The price of the purchased product |
| `buyer` | object | Buyer information |
| `item` | object | Item information |

#### Example Payload

```json
{
  "payment_id": "example_value",
  "currency": "example_value",
  "status": "example_value",
  "created_at": "2025-11-20T21:42:47+00:00",
  "product_price": 123.45,
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  }
}
```

---

### subscription.created

- **Category:** subscription
- **Action:** created
- **Description:** Triggered when a new subscription is created

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "amount", "currency", "status", "created_at", "buyer", "item", "subscription"],
  "properties": {
    "payment_id": { "type": "string", "description": "The unique identifier for the payment" },
    "amount": { "type": "number", "description": "The payment amount" },
    "currency": { "type": "string", "description": "The payment currency (e.g., USD)" },
    "status": { "type": "string", "description": "The payment status (e.g., succeeded)" },
    "created_at": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the payment was created" },
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription)" }
      }
    },
    "subscription": {
      "type": "object",
      "required": ["id", "status", "start_date"],
      "properties": {
        "id": { "type": "integer", "description": "The subscription's unique identifier" },
        "status": { "type": "string", "description": "The subscription status (e.g., active)" },
        "start_date": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription started" },
        "end_date": { "type": ["string", "null"], "format": "date-time", "description": "ISO 8601 timestamp of when the subscription ends (null if not applicable)" },
        "is_free_trial": { "type": "boolean", "description": "Whether this is a free trial subscription" },
        "payment_frequency": { "type": "string", "description": "The frequency of subscription payments (e.g., monthly)" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    }
  }
}
```

#### Example Payload

```json
{
  "payment_id": "example_value",
  "amount": 123.45,
  "currency": "example_value",
  "status": "example_value",
  "created_at": "2025-11-20T21:42:47+00:00",
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  },
  "subscription": {
    "id": 123,
    "status": "example_value",
    "start_date": "2025-11-20T21:42:47+00:00"
  }
}
```

---

### subscription.renewed

- **Category:** subscription
- **Action:** renewed
- **Description:** Triggered when a subscription is renewed

#### Schema

```json
{
  "type": "object",
  "required": ["payment_id", "amount", "currency", "status", "created_at", "buyer", "item", "subscription"],
  "properties": {
    "payment_id": { "type": "string", "description": "The unique identifier for the payment" },
    "amount": { "type": "number", "description": "The payment amount" },
    "currency": { "type": "string", "description": "The payment currency (e.g., USD)" },
    "status": { "type": "string", "description": "The payment status (e.g., succeeded)" },
    "created_at": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the payment was created" },
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription)" }
      }
    },
    "subscription": {
      "type": "object",
      "required": ["id", "status", "start_date", "renewed_at"],
      "properties": {
        "id": { "type": "integer", "description": "The subscription's unique identifier" },
        "status": { "type": "string", "description": "The subscription status (e.g., active)" },
        "start_date": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription started" },
        "renewed_at": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription was renewed" },
        "end_date": { "type": ["string", "null"], "format": "date-time", "description": "ISO 8601 timestamp of when the subscription ends (null if not applicable)" },
        "payment_frequency": { "type": "string", "description": "The frequency of subscription payments (e.g., monthly)" },
        "auto_renew_count": { "type": "integer", "description": "The number of times the subscription has been auto-renewed" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    }
  }
}
```

#### Example Payload

```json
{
  "payment_id": "example_value",
  "amount": 123.45,
  "currency": "example_value",
  "status": "example_value",
  "created_at": "2025-11-20T21:42:47+00:00",
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  },
  "subscription": {
    "id": 123,
    "status": "example_value",
    "start_date": "2025-11-20T21:42:47+00:00",
    "renewed_at": "2025-11-20T21:42:47+00:00"
  }
}
```

---

### subscription.completed

- **Category:** subscription
- **Action:** completed
- **Description:** Triggered when a subscription is completed or ended

#### Schema

```json
{
  "type": "object",
  "required": ["buyer", "item", "subscription"],
  "properties": {
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription)" }
      }
    },
    "subscription": {
      "type": "object",
      "required": ["id", "status", "start_date", "completed_at"],
      "properties": {
        "id": { "type": "integer", "description": "The subscription's unique identifier" },
        "status": { "type": "string", "description": "The subscription status (e.g., completed)" },
        "start_date": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription started" },
        "completed_at": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription was completed" },
        "payment_frequency": { "type": "string", "description": "The frequency of subscription payments (e.g., monthly)" },
        "auto_renew_count": { "type": "integer", "description": "The number of times the subscription was auto-renewed" },
        "completion_reason": { "type": "string", "description": "The reason for subscription completion (e.g., period_ended, cancelled)" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    }
  }
}
```

#### Example Payload

```json
{
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  },
  "subscription": {
    "id": 123,
    "status": "example_value",
    "start_date": "2025-11-20T21:42:47+00:00",
    "completed_at": "2025-11-20T21:42:47+00:00"
  }
}
```

---

### subscription.canceled

- **Category:** subscription
- **Action:** canceled
- **Description:** Triggered when a subscription is cancelled

#### Schema

```json
{
  "type": "object",
  "required": ["buyer", "item", "subscription"],
  "properties": {
    "buyer": {
      "type": "object",
      "required": ["id", "name", "email"],
      "properties": {
        "id": { "type": "integer", "description": "The buyer's user ID" },
        "name": { "type": "string", "description": "The buyer's full name" },
        "email": { "type": "string", "format": "email", "description": "The buyer's email address" }
      }
    },
    "item": {
      "type": "object",
      "required": ["id", "title", "type"],
      "properties": {
        "id": { "type": "integer", "description": "The purchased item's ID" },
        "title": { "type": "string", "description": "The purchased item's title" },
        "type": { "type": "string", "description": "The type of item (e.g., subscription)" }
      }
    },
    "subscription": {
      "type": "object",
      "required": ["id", "status", "start_date", "cancelled_at"],
      "properties": {
        "id": { "type": "integer", "description": "The subscription's unique identifier" },
        "status": { "type": "string", "description": "The subscription status (e.g., cancelled)" },
        "start_date": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription started" },
        "cancelled_at": { "type": "string", "format": "date-time", "description": "ISO 8601 timestamp of when the subscription was cancelled" },
        "end_date": { "type": ["string", "null"], "format": "date-time", "description": "ISO 8601 timestamp of when the subscription was scheduled to end (null if not applicable)" },
        "payment_frequency": { "type": "string", "description": "The frequency of subscription payments (e.g., monthly)" },
        "auto_renew_count": { "type": "integer", "description": "The number of times the subscription was auto-renewed" },
        "cancellation_reason": { "type": "string", "description": "The reason for subscription cancellation (e.g., user_request, admin_action)" }
      }
    },
    "api_metadata": {
      "type": "object",
      "description": "Additional metadata for API integration",
      "properties": {
        "data": { "type": "object", "description": "The API metadata content" }
      }
    }
  }
}
```

#### Example Payload

```json
{
  "buyer": {
    "id": 123,
    "name": "example_value",
    "email": "user@example.com"
  },
  "item": {
    "id": 123,
    "title": "example_value",
    "type": "example_value"
  },
  "subscription": {
    "id": 123,
    "status": "example_value",
    "start_date": "2025-11-20T21:42:47+00:00",
    "cancelled_at": "2025-11-20T21:42:47+00:00"
  }
}
```
