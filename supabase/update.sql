ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS prediction_result VARCHAR(20);
ALTER TABLE public.predictions ALTER COLUMN home_score DROP NOT NULL;
ALTER TABLE public.predictions ALTER COLUMN away_score DROP NOT NULL;
