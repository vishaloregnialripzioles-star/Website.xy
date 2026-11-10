# Website.xy — XY Studio

A responsive service studio and customer enquiry website, built with a restrained editorial visual system and a Supabase-ready data layer.

## Design direction

- **Product:** a digital studio presenting web, app, community, gaming marketplace and bot services.
- **Character:** precise, resourceful, quietly expressive.
- **World:** a small independent studio — graphite surfaces, paper-like light sections and a single chartreuse accent.
- **Moments:** the custom XY hero composition and the warm, tactile service catalogue.
- **Signature:** the XY monogram and numbered service index.

The layout follows the craft principles in [heydamir/unslop](https://github.com/heydamir/unslop) (Damir Sokolovsky, CC BY 4.0): quiet chrome, consistent spacing, deliberate visual hierarchy, real content and restrained motion. This project is an original implementation, not a copy of the source repository.

## Included

- Responsive landing page and eight service detail views.
- Project enquiry form with required contact field and unique reference IDs.
- Customer sign-in / sign-up wiring for Supabase Auth.
- Supabase SQL schema for profiles, customer applications and catalogue items.
- Row Level Security policies with server-side role checks via the database.
- Mobile navigation, reduced-motion support and accessible dialog controls.

## Run locally

No build step is required. Serve this folder with any static web server, for example:

```bash
npx serve .
```

Open the local URL shown by the server.

## Enable real accounts and secure application storage

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy the Project URL and public anon/publishable key into `config.js`.
4. In Supabase Auth settings, configure the allowed site URL and redirect URLs.
5. Create your own account through the website.
6. In the Supabase SQL Editor, promote only your own account to admin using its UUID (see the final commented SQL statement in `schema.sql`).
7. Keep Row Level Security enabled. Never place a service_role key or database password in frontend files.

When Supabase is not configured, the site runs in preview mode. Enquiry submissions are saved only in that browser's local storage and are **not** delivered to an administrator. This mode is for UI testing, not production use.

## Deployment

The repository can be served by GitHub Pages or any static host. For GitHub Pages, select **Settings → Pages → Deploy from a branch → main → / (root)**. Configure the Supabase Auth redirect URL to the published site URL.

## Before accepting real orders

- Add verified business contact details, service descriptions, live product inventory and approved prices.
- Add a privacy policy and terms appropriate to the business and region.
- Configure Supabase Auth email confirmation and recovery.
- Test customer and admin accounts separately, including all RLS policies.
- Connect a trusted email notification service using a server-side function (never from the browser).
- Add payment processing only through a provider-hosted or server-verified checkout flow. No payment credentials belong in this repository.
- Verify that every listed digital product/service is permitted by the relevant platform terms and local rules.

## Current limitation

The public frontend and Supabase schema are committed here. Live authentication, database delivery, admin management screens, inventory editing, email notifications and payments require the project credentials and server-side configuration described above; they are not falsely represented as active before setup.
