-- Where the user actually wears their Sureva device — a real algorithmic
-- input (see Algorithm/js/depletionEngine.js's calculatePlacementCorrection,
-- driven by algorithmConstants.js's PLACEMENT_CORRECTION_FACTORS), not just
-- display data. Wrist placement underreads real UV exposure and gets its
-- reading boosted before it enters the depletion math; every other position
-- keys off this same column too. Default 'shoulder_strap' matches the
-- existing mock profile's default (Algorithm/mock/mockData.js) and carries
-- a 1.0x correction — so a user who never visits this setting depletes
-- exactly as before, no regression.
alter table public.users add column if not exists device_placement text default 'shoulder_strap';
