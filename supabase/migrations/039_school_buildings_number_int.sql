-- =============================================================================
-- ConED · school_buildings.building_number text → integer
-- Safe to re-run. Filenames still use 3-digit pad (001); DB stores 1.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'school_buildings'
      AND column_name = 'building_number'
      AND data_type IN ('text', 'character varying')
  ) THEN
    -- Drop unique that references text column, then recreate on integer
    ALTER TABLE public.school_buildings
      DROP CONSTRAINT IF EXISTS school_buildings_school_id_building_number_key;

    ALTER TABLE public.school_buildings
      ALTER COLUMN building_number TYPE integer
      USING NULLIF(trim(building_number::text), '')::integer;

    ALTER TABLE public.school_buildings
      ALTER COLUMN building_number SET NOT NULL;

    ALTER TABLE public.school_buildings
      ADD CONSTRAINT school_buildings_school_id_building_number_key
      UNIQUE (school_id, building_number);
  END IF;
END $$;

COMMENT ON COLUMN public.school_buildings.building_number IS
  'Integer building id; Storage filenames use 3-digit pad (1 → 001)';
