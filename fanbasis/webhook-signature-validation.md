# Signature Validation

All webhook requests are signed using HMAC-SHA256 to ensure the authenticity of the payload. The signature is sent in the `X-Webhook-Signature` header. The secret key is provided in the webhook subscription creation.

To validate the signature:

1. Get the raw request body
2. Get the signature from the `X-Webhook-Signature` header
3. Generate the expected signature using your webhook secret key
4. Compare the signatures

Here are examples of how to validate the signature in different languages:

#### PHP

```php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$secret = 'your_webhook_secret_key';
$expectedSignature = hash_hmac('sha256', $payload, $secret);
if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}
```

#### Node.js

```javascript
const crypto = require('crypto');
function validateWebhookSignature(req, secret) {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}
// Usage in Express
app.post('/webhook', express.json(), (req, res) => {
    if (!validateWebhookSignature(req, 'your_webhook_secret_key')) {
        return res.status(401).send('Invalid signature');
    }
    // Process webhook...
});
```

#### Python

```python
import hmac
import hashlib
import json

def validate_webhook_signature(request_body, signature_header, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        request_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature_header)

# Usage in Flask
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    if not signature:
        return 'No signature', 401
    if not validate_webhook_signature(
        request.get_data(),
        signature,
        'your_webhook_secret_key'
    ):
        return 'Invalid signature', 401
    # Process webhook...
```

#### Ruby

```ruby
require 'openssl'

def validate_webhook_signature(payload, signature, secret)
    expected_signature = OpenSSL::HMAC.hexdigest(
        'sha256',
        secret,
        payload
    )
    ActiveSupport::SecurityUtils.secure_compare(
        expected_signature,
        signature
    )
end

# Usage in Rails
class WebhooksController < ApplicationController
    def create
        signature = request.headers['X-Webhook-Signature']
        return head :unauthorized unless signature
        unless validate_webhook_signature(
            request.raw_post,
            signature,
            'your_webhook_secret_key'
        )
            return head :unauthorized
        end
        # Process webhook...
    end
end
```

### Best Practices

- Always validate the webhook signature before processing the payload
- Use constant-time comparison functions to prevent timing attacks
- Keep your webhook secret key secure and never expose it
- Return a 401 status code for invalid signatures
- Log failed signature validations for security monitoring
