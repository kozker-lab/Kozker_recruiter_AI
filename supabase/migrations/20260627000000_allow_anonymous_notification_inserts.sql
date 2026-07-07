-- Allow system webhooks (unauthenticated/anon calls from background tasks/n8n) to insert notifications
CREATE POLICY "Allow system insert notifications" ON public.notifications
    FOR INSERT 
    WITH CHECK (true);
