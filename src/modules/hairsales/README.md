# HairSales module boundary

HairSales is the professional-facing B2C product: the app, assistant, Telegram,
WhatsApp Cloud connection, marketing packs, subscriber billing, and subscriber
agenda/client data.

## Belongs in HairSales

- `subscriber_*` data and helpers.
- Plan catalog, entitlements, billing portal access, and Stripe customer state
  for Standard/Pro subscribers.
- Professional-facing assistant, Telegram, WhatsApp Cloud, marketing packs,
  reminders, onboarding, and agenda sync flows.
- Brand constants for the HairSales product line.

## Does not belong here

- ROM team panel authentication, session cookies, and staff permissions.
- Unit/team operational screens under the ROM salon workflow.
- ROM contacts or shared salon CRM data. HairSales subscriber clients are
  private to the professional subscriber and must not be blended into ROM
  contact lists.

Use `src/modules/hairsales/index.ts` as the public import surface when code
outside the module needs HairSales concepts. Keep deeper imports for internal
implementation files until there is a deliberate module migration.
