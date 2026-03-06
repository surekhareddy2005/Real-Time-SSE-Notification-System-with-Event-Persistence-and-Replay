-- bigseiral means automatically gives number like  1 2 3 ...
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY, 
  channel VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_id
ON events(channel, id); -- it makes search easier 

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id INTEGER NOT NULL,
  channel VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, channel)
);

-- Seed users implicitly via subscriptions   // default data stroing seed means init.sql creating the table like model in sql
INSERT INTO user_subscriptions (user_id, channel)
VALUES (1, 'test-channel'),
       (2, 'alerts')
ON CONFLICT DO NOTHING;