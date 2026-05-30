
CREATE TABLE public.review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  x_pct NUMERIC NOT NULL,
  y_pct NUMERIC NOT NULL,
  scroll_y_pct NUMERIC NOT NULL DEFAULT 0,
  author TEXT NOT NULL DEFAULT 'Anonymous',
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX review_comments_path_idx ON public.review_comments(path);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.review_comments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create comments"
  ON public.review_comments FOR INSERT
  WITH CHECK (
    char_length(body) > 0
    AND char_length(body) <= 2000
    AND char_length(author) <= 100
    AND char_length(path) <= 500
  );

CREATE POLICY "Anyone can update comments"
  ON public.review_comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete comments"
  ON public.review_comments FOR DELETE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.review_comments;
