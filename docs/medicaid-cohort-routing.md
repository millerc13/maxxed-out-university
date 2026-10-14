# Medicaid cohort lead routing

The public intake is `https://university.maxxedout.com/apply/cohort`, posting to
`/api/cohort-application`. This is separate from the legacy healthcare GHL funnel.

New applications are owned by Jackie in the cohort dashboard and in GoHighLevel.
The GHL user ID comes from `GHL_USER_JACKIE_ID`, with the verified Jackie ID as a
fallback. Historical applications keep their existing owner.

Staff SMS uses the `cohortNotificationRecipientId` database Setting to select one
verified NotificationRecipient. The recipient must be active, have `notifyOnLead`
enabled, and subscribe to `medicaid-cohort` (or all sources). Configure this before
deploying. Use the staff contact's verified phone and GHL **contact** ID; assignment
uses the separate GHL **user** ID. Never select a staff recipient by name alone.

`internalNotificationsEnabled` gates staff SMS and Slack. `testPhoneOverride`
continues to reroute staff SMS when deliberately enabled. No override should be
active for live delivery to Jackie. Other recipients who subscribe to all sources
are excluded from cohort staff SMS.

Slack continues through the existing cohort bot/channel configuration, falling
back to active `cohort_application` webhook subscriptions. The card mentions Jackie.
GHL/applicant confirmation, staff SMS, and Slack start independently so one failed
provider does not prevent the other notifications.

Delivery evidence is recorded in WebhookLog under source `medicaid-cohort` with
the application ID and events `cohort:ghl-assignment`, `cohort:staff-sms`,
`cohort:applicant-sms`, and `cohort:slack`. SMS success means provider acceptance;
use the saved message ID to read the final GHL delivery status. Slack bot message
IDs remain on CohortApplication for the existing Contacted action.

Verify with one clearly labeled synthetic application: read back its saved owner,
GHL contact owner, Slack message ID, and staff SMS delivery status. Do not run the
general notification test endpoint: it broadcasts to every active recipient.
