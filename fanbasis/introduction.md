# FanBasis API Introduction

APIs to create dynamic payment links and check payment status. These APIs enable developers to programmatically generate checkout pages, track payment statuses, and manage subscriber information.

## Webhooks

To subscribe to webhooks, you can use the following endpoints:

- [Create a webhook subscription](/protected/api/create-webhook-subscription)
- [Get all webhook subscriptions](/protected/api/get-webhook-subscriptions)
- [Delete a webhook subscription](/protected/api/delete-webhook-subscription)

For an overview of the webhook events, see [Webhook Events](/protected/webhooks/events).

To test webhooks, you can use the following endpoints:

- [Test a webhook](/protected/api/test-subscription)

The endpoint will send example messages for each event type.

## API Change and Versioning Policy

This document outlines policies and procedures for changes to the external API. The goal is to ensure stability, transparency, and predictability for all customers integrating with the platform.

## Versioning and Breaking Changes

Backward compatibility is maintained whenever possible. However, in cases where breaking changes are required:

- Such changes will be introduced through a new version of the API.
- The API version will be clearly specified in the URL path (e.g., /v2/).
- Older versions will remain active for a defined transition period to allow customers sufficient time to migrate.

## API Reference Sections

- **Introduction** - `/protected/api/fanbasis-api`
- **Checkout Sessions** - 11 items - `/protected/api/checkout-sessions`
- **Webhook Subscriptions** - 4 items - `/protected/api/webhook-subscriptions`
- **Customers** - 3 items - `/protected/api/get-customers`
- **Subscribers** - 1 item - `/protected/api/get-subscribers`
- **Discount Codes** - 5 items - `/protected/api/list-discount-codes`
- **Products** - 1 item - `/protected/api/list-products`
- **Transactions** - 1 item - `/protected/api/get-transaction`

## Top Navigation

- **API Policies** - `/protected/policies/api-policy`
- **API Reference** - `/protected/api/fanbasis-api`
- **Environments** - `/protected/environments`
- **Webhooks** - `/protected/webhooks/events`
