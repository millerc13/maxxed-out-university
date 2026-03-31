# API Change and Versioning Policy

This document outlines our policies and procedures for changes to our external API. Our goal is to ensure stability, transparency, and predictability for all customers integrating with our platform.

## Change Notifications

We are committed to keeping our customers informed about all API updates and changes. All updates to the API will be communicated via email.

To ensure you receive these notifications, please contact your account manager to confirm that you are included on the API update mailing list.

## Versioning and Breaking Changes

We take care to maintain backward compatibility whenever possible. However, in cases where breaking changes are required:

- Such changes will be introduced through a new version of the API.
- The API version will be clearly specified in the URL path (e.g., /v2/).
- Older versions will remain active for a defined transition period to allow customers sufficient time to migrate.

## Deprecation and Removal Policy

From time to time, certain endpoints or API versions may be deprecated or removed. When deprecation occurs, affected customers will receive at least 60 days' notice before the endpoint is removed.

We actively monitor usage and will reach out directly to any customer still using a deprecated endpoint within 30 days of the removal date to assist with migration.
