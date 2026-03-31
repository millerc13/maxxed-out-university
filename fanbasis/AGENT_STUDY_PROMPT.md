# Fanbasis API — Agent Study Prompt

You are being asked to deeply study the Fanbasis API documentation so you can assist in building integrations against it. Follow every step below completely before doing any implementation work.

---

## Step 1: Read the Index First

Start with the master index file:

```
/Users/cjmiller/development/todd/fanbasis/api-docs/README.md
```

This gives you the full map — every endpoint, its HTTP method, URL, and which file covers it. Read it completely and internalize the structure before moving on.

---

## Step 2: Read Every File Systematically

Read every file in this order. Do not skip any.

### General / Policy
- `introduction.md`
- `api-reference-introduction.md`
- `api-policies.md`
- `api-change-log.md`
- `environments.md`
- `webhooks.md`
- `webhook-signature-validation.md`

### Checkout Sessions
- `checkout-sessions/overview.md`
- `checkout-sessions/create-checkout-session.md`
- `checkout-sessions/get-checkout-session.md`
- `checkout-sessions/delete-checkout-session.md`
- `checkout-sessions/get-transactions.md`
- `checkout-sessions/get-product-subscriptions.md`
- `checkout-sessions/get-checkout-session-transactions.md`
- `checkout-sessions/get-checkout-session-subscriptions.md`
- `checkout-sessions/cancel-checkout-session-subscription.md`
- `checkout-sessions/create-embedded-checkout-session.md`
- `checkout-sessions/refund-transaction.md`
- `checkout-sessions/extend-subscription.md`

### Webhook Subscriptions
- `webhook-subscriptions/overview.md`
- `webhook-subscriptions/get-webhook-subscriptions.md`
- `webhook-subscriptions/create-webhook-subscription.md`
- `webhook-subscriptions/delete-webhook-subscription.md`
- `webhook-subscriptions/test-webhook-subscription.md`

### Customers
- `customers/overview.md`
- `customers/get-customers.md`
- `customers/get-customer-payment-methods.md`
- `customers/charge-customer.md`

### Subscribers
- `subscribers/overview.md`
- `subscribers/get-subscribers.md`

### Discount Codes
- `discount-codes/overview.md`
- `discount-codes/list-discount-codes.md`
- `discount-codes/create-discount-code.md`
- `discount-codes/get-discount-code.md`
- `discount-codes/update-discount-code.md`
- `discount-codes/delete-discount-code.md`

### Products
- `products/overview.md`
- `products/list-products.md`

### Transactions
- `transactions/overview.md`
- `transactions/get-transaction.md`

All files are under the base path:
```
/Users/cjmiller/development/todd/fanbasis/api-docs/
```

---

## Step 3: Save Everything Important to Memory

After reading all files, save the following to memory. Use your memory system's Write tool to create persistent memory files. Each memory should be its own file with proper frontmatter.

### Memory files to create:

**`fanbasis_api_overview.md`**
- Base URLs (production + sandbox)
- Authentication method (header name + format)
- Content-Type requirement
- API version
- Deprecation policy summary

**`fanbasis_checkout_sessions.md`**
- Every endpoint: method, URL pattern, required/optional params, what it does
- Key fields in the checkout session object
- How embedded vs standard checkout sessions differ
- How subscriptions relate to checkout sessions

**`fanbasis_webhooks.md`**
- All 9 webhook event types and what triggers each
- Webhook payload structure
- How to register/delete/test webhook subscriptions
- HMAC-SHA256 signature validation process (the header name, algorithm, how to verify)

**`fanbasis_customers.md`**
- How to retrieve customers and what search/filter options exist
- How to retrieve a customer's saved payment methods
- How to charge a customer using a saved payment method (fields required)

**`fanbasis_subscribers.md`**
- What the subscribers endpoint returns
- Available filter options

**`fanbasis_discount_codes.md`**
- Full CRUD — how to create, read, update, delete codes
- All discount_type options (`cash`, `percentage`)
- All duration options (`once`, `forever`, `multiple_months`)
- Key fields and constraints

**`fanbasis_products.md`**
- What the products endpoint returns
- Any filtering/pagination options

**`fanbasis_transactions.md`**
- How to look up a transaction (hashid vs numeric ID)
- Fields returned

**`fanbasis_environments.md`**
- Production URL
- Sandbox URL
- Test card numbers (Visa, Mastercard, Amex, Discover) with CVCs and expiry rules

**`fanbasis_gotchas.md`**
- Anything non-obvious, surprising, or easy to get wrong
- Any undocumented constraints you noticed while reading
- Edge cases in parameters (e.g. conflicting fields, required-if conditions)
- Pagination patterns used across endpoints
- Any rate limiting or policy notes

---

## Step 4: Build a Mental Model

After saving memory, synthesize what you've learned into a working mental model. Be able to answer:

1. If I want to sell a product to a customer — what's the flow? Which endpoints, in what order?
2. If I want to know who is subscribed to a product — which endpoint(s) do I call?
3. If a payment succeeds — how do I get notified? What does the payload look like?
4. If I want to give a customer a discount — how do I create a code and apply it?
5. How do I verify a webhook came from Fanbasis and not a bad actor?
6. What is the difference between sandbox and production — and how do I switch?

If you cannot answer all six confidently from memory, go back and re-read the relevant files.

---

## Step 5: Confirm Readiness

Once complete, state:
- How many endpoints you've internalized
- Which sections you feel most/least confident about
- Any gaps or ambiguities you found in the docs that may require clarification before building

You are now ready to assist with building integrations against the Fanbasis API.
