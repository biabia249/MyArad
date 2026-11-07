# Notifications

Signed-in users have an inbox bell on every city page, with unread count, friend
requests/acceptances, message notices, and mark-as-read controls. New messages
also show a short in-app banner. Opening/reading a conversation marks its incoming
message notices as read. Hidden native city screens stop polling their inboxes.

In-app notifications work in the browser and in installed mobile apps through
`/city/social/notifications`. They do not require OS notification permission.

Phone push is opt-in through “Activează push pe telefon” in the inbox. This needs
a new Android/iOS build containing `expo-notifications`, valid FCM/APNs credentials
for the existing EAS project, and phone notification permission. The old installed
binary cannot acquire the new native module by refreshing JavaScript. Browser OS
push is not implemented; browser users still get the in-app inbox and banners.

Push tokens are associated with the authenticated account. Signing out unregisters
the current installation's token before deleting its session. Tapping a social
push opens Messages. Server pushes have a generic message body; private message
previews remain in the authenticated in-app inbox. Failed delivery leaves the
in-app notification intact.

Validation: server integration tests cover unread counts, message read receipts,
cross-account inbox isolation, and owner-only push-token deregistration. Remote
FCM/APNs delivery must be verified with a newly installed phone build and project
credentials; bundle export alone does not verify delivery.

Android WebView component check with synthetic notifications passed: unread badge,
two inbox entries, mobile popover bounds, mark-as-read badge removal, outside-click
closure, new-message banner, and the open-messages action. No real push or message
was sent during this UI check.
