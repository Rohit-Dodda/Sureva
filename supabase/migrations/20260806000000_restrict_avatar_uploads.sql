-- The avatars bucket was created in schema.sql with nothing but
-- `public => true`, which leaves it accepting a file of any type at any
-- size. The storage RLS policies already stop one user writing into
-- another user's folder, but they say nothing about *what* lands there:
-- a crafted request carrying a user's own valid token could park an
-- arbitrary payload — an HTML document, a multi-hundred-megabyte blob —
-- on a publicly-readable URL under our own Supabase domain.
--
-- The matching checks in SupabaseService.uploadAvatar are only there to
-- give the user a readable error; anything running on the device can be
-- bypassed, so these two bucket limits are the authoritative rule and
-- Storage enforces them itself.
--
-- 5 MB sits comfortably above what expo-image-picker produces for a 1:1
-- avatar at quality 0.85 (typically well under 1 MB) while leaving room
-- for a high-resolution device camera. The MIME list covers what iOS and
-- Android actually hand back from the camera and photo library.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'avatars';
