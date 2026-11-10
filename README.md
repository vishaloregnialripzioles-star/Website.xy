# Website.xy — XY Studio

A responsive service studio and customer enquiry website, built with a restrained editorial visual system and a Supabase-ready data layer.

## Design direction

- **Product:** a digital studio presenting web, app, community, gaming marketplace and bot services.
- **Character:** precise, resourceful, quietly expressive.
- **World:** a deep navy and midnight-blue studio with cool blue highlights and high-contrast service panels.
- **Moments:** the custom XY hero composition and the warm, tactile service catalogue.
- **Signature:** the XY monogram and numbered service index.

The layout follows the craft principles in [heydamir/unslop](https://github.com/heydamir/unslop) (Damir Sokolovsky, CC BY 4.0): quiet chrome, consistent spacing, deliberate visual hierarchy, real content and restrained motion. This project is an original implementation, not a copy of the source repository.

## Included

- Responsive landing page and eight service detail views.
- Project enquiry form with required contact field and unique reference IDs.
- Customer email/password sign-in and sign-up, plus Google OAuth button.
- Customer dashboard for viewing personal applications and their status.
- Admin dashboard for reviewing applications, updating statuses/notes, and adding or activating/deactivating catalogue items.
- Supabase SQL schema for profiles, customer applications and catalogue items, protected by Row Level Security.
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
4. In Supabase → Authentication → URL Configuration, set the Site URL to `https://website-xy.onrender.com` and add that exact URL to the allowed redirect URLs.
5. For Google sign-in, create a Google OAuth Web client. Add `https://website-xy.onrender.com` as an Authorized JavaScript origin. Add the callback URL shown on Supabase → Authentication → Providers → Google as an Authorized redirect URI. Paste the Google Client ID and Client Secret into the Supabase Google provider settings and enable the provider. See the [official Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
6. Create your own account through the website and verify it if email confirmation is enabled.
7. In Supabase SQL Editor, run `select id, email from auth.users;`, copy your own account UUID, then run `update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';` with your own UUID. Never promote an account you do not control.
8. Keep Row Level Security enabled. Never place a service_role key or database password in frontend files.

Google OAuth will not work until its provider credentials have been added in Supabase. The Google button is wired in the frontend, but the provider must be enabled in the Supabase dashboard.

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

## Remaining setup

The frontend and admin/customer screens are committed. Google OAuth still requires Google Client ID/Secret configuration in Supabase. The first administrator must be promoted manually using their own account UUID. Email notifications, payment processing and advanced catalogue editing are not included.
