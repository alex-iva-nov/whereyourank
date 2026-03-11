-- MVP hardening indexes

create index if not exists idx_uploads_user_kind_created_at
  on public.uploads (user_id, detected_file_kind, created_at desc);

create index if not exists idx_deletion_requests_user_status_requested
  on public.deletion_requests (user_id, status, requested_at desc);
