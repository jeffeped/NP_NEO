CREATE TABLE IF NOT EXISTS usage_events (
 id TEXT PRIMARY KEY,
 day TEXT NOT NULL,
 visitor_hash TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('open','action')),
 feature TEXT NOT NULL CHECK(feature IN ('','np_ind','np_padrao','hv','enteral','fenton','intergrowth'))
);
CREATE INDEX IF NOT EXISTS usage_events_day ON usage_events(day);
