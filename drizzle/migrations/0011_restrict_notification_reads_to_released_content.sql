ALTER POLICY "Signed in read notifications"
ON public.notifications
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    (kind = 'info' AND video_id IS NULL)
    OR EXISTS (
      SELECT 1
      FROM public.videos AS notification_video
      WHERE notification_video.id = notifications.video_id
        AND notification_video.is_published
        AND notification_video.publish_at <= now()
    )
  )
);
