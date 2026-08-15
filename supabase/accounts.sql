-- Technische Accounts für den Dropdown-Login.
-- Diese Adressen sind nur interne Supabase-Benutzernamen und werden auf der Website nicht angezeigt.

insert into public.allowed_emails(email) values
  (lower('admin@fcbayern-ober.example')),
  (lower('patrick@fcbayern-ober.example')),
  (lower('ober@fcbayern-ober.example'))
on conflict do nothing;

insert into public.profiles(email,display_name) values
  (lower('admin@fcbayern-ober.example'),'Admin'),
  (lower('patrick@fcbayern-ober.example'),'Patrick'),
  (lower('ober@fcbayern-ober.example'),'Ober')
on conflict (email) do update set display_name=excluded.display_name;
