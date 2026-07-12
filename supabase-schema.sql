-- Run this once in your Supabase project's SQL editor (Supabase dashboard > SQL Editor > New query)

create extension if not exists pgcrypto;

create table if not exists settings (
  id text primary key,
  clinic_name text,
  doctor_name text,
  credentials text,
  address text,
  phone text
);

insert into settings (id, clinic_name, doctor_name, credentials, address, phone)
values ('main', 'Your Clinic Name', 'Dr. Full Name', 'MD — Specialty', 'Clinic address, City', '+20 000 000 0000')
on conflict (id) do nothing;

create table if not exists meds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  form text,
  strength text,
  dose text,
  frequency text,
  duration text
);

insert into meds (name, generic_name, form, strength, dose, frequency, duration) values
  ('Paracetamol', 'Acetaminophen', 'Tablet', '500 mg', '1 tablet', 'Every 6-8 h', '5 days'),
  ('Ibuprofen', 'Ibuprofen', 'Tablet', '400 mg', '1 tablet', 'Every 8 h', '5 days'),
  ('Amoxicillin', 'Amoxicillin', 'Capsule', '500 mg', '1 capsule', 'Every 8 h', '7 days'),
  ('Omeprazole', 'Omeprazole', 'Capsule', '20 mg', '1 capsule', 'Once daily, before breakfast', '14 days'),
  ('Diclofenac', 'Diclofenac sodium', 'Tablet', '50 mg', '1 tablet', 'Twice daily', '5 days'),
  ('Metformin', 'Metformin HCl', 'Tablet', '500 mg', '1 tablet', 'Twice daily, with meals', '30 days'),
  ('Amlodipine', 'Amlodipine besylate', 'Tablet', '5 mg', '1 tablet', 'Once daily', '30 days'),
  ('Atorvastatin', 'Atorvastatin calcium', 'Tablet', '20 mg', '1 tablet', 'Once daily, at night', '30 days'),
  ('Cetirizine', 'Cetirizine HCl', 'Tablet', '10 mg', '1 tablet', 'Once daily', '10 days'),
  ('Prednisolone', 'Prednisolone', 'Tablet', '5 mg', '2 tablets', 'Once daily, morning', '7 days'),
  ('Methotrexate', 'Methotrexate', 'Tablet', '2.5 mg', '4 tablets', 'Once weekly', 'As directed'),
  ('Folic Acid', 'Folic acid', 'Tablet', '5 mg', '1 tablet', 'Once weekly (not on MTX day)', 'As directed'),
  ('Calcium + Vitamin D3', 'Calcium carbonate / Cholecalciferol', 'Tablet', '600 mg / 400 IU', '1 tablet', 'Once daily', '30 days'),
  ('Alendronate', 'Alendronate sodium', 'Tablet', '70 mg', '1 tablet', 'Once weekly, on empty stomach', 'As directed'),
  ('Losartan', 'Losartan potassium', 'Tablet', '50 mg', '1 tablet', 'Once daily', '30 days'),
  ('Azithromycin', 'Azithromycin', 'Tablet', '500 mg', '1 tablet', 'Once daily', '3 days'),
  ('Loratadine', 'Loratadine', 'Tablet', '10 mg', '1 tablet', 'Once daily', '10 days'),
  ('Pantoprazole', 'Pantoprazole sodium', 'Tablet', '40 mg', '1 tablet', 'Once daily, before breakfast', '14 days'),
  ('Tramadol', 'Tramadol HCl', 'Capsule', '50 mg', '1 capsule', 'Every 8 h as needed', '5 days'),
  ('Multivitamin', 'Multivitamin complex', 'Tablet', 'Standard', '1 tablet', 'Once daily', '30 days')
on conflict do nothing;

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  patient_name text not null,
  patient_age text,
  patient_gender text,
  items jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now()
);

alter table settings enable row level security;
alter table meds enable row level security;
alter table prescriptions enable row level security;

-- NOTE: these policies allow full public read/write access using just the
-- anon key. That's fine for a small internal clinic tool where the app URL
-- isn't shared publicly, but anyone with the URL and key could read or
-- change the data. If you want proper staff logins later, ask and we can
-- add Supabase Auth on top of this.
create policy "public access" on settings for all using (true) with check (true);
create policy "public access" on meds for all using (true) with check (true);
create policy "public access" on prescriptions for all using (true) with check (true);
