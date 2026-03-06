const express = require("express");
const pool = require("./db");

const router = express.Router();

const activeConnections = new Map(); 
// channel -> Set of { userId, res }

function sendEvent(res, event) {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.event_type}\n`);
  res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
}// it is the msg which is sent to the user that is the response 
//write does not close the connection after sending the msg but json and html closes

router.post("/api/events/publish", async (req, res) => {
  const { channel, eventType, payload } = req.body;

  if (!channel || !eventType || !payload)
    return res.status(400).json({ error: "Invalid body" });

  const result = await pool.query(
    "INSERT INTO events (channel, event_type, payload) VALUES ($1,$2,$3) RETURNING *", // returning * means return all the values to the result variable
    [channel, eventType, payload]
  );

  const event = result.rows[0];

  if (activeConnections.has(channel)) {
    for (const client of activeConnections.get(channel)) {
      sendEvent(client.res, event);
    }
  }
  //if the channel is present in the map select the users who have subscribed to that channel and send that events to him


  res.status(202).send();
});

router.post("/api/events/channels/subscribe", async (req, res) => {
  const { userId, channel } = req.body;

  //subscribing the channel means storing  that id and channel in the db
  await pool.query(
    "INSERT INTO user_subscriptions (user_id, channel) VALUES ($1,$2) ON CONFLICT DO NOTHING", // if duplicate is there do nothing like do not add do not through error
    [userId, channel]
  );

  res.status(201).json({
    status: "subscribed",
    userId,
    channel
  });
});

router.post("/api/events/channels/unsubscribe", async (req, res) => {
  const { userId, channel } = req.body;

  await pool.query(
    "DELETE FROM user_subscriptions WHERE user_id=$1 AND channel=$2",
    [userId, channel]
  );
  //deleting the channel and userid 
  res.status(200).json({
    status: "unsubscribed",
    userId,
    channel
  });
});

router.get("/api/events/stream", async (req, res) => {
  const { userId, channels } = req.query;
  //reads the last-event-id if the user is offline browser automatically reads it 
  const lastEventId = req.header("Last-Event-ID");

  if (!userId || !channels)
    return res.status(400).send("Missing parameters");

  const channelList = channels.split(",");

  // select all the channels that the user has subscribed 
  const subs = await pool.query(
    "SELECT channel FROM user_subscriptions WHERE user_id=$1",
    [userId]
    
  );


  const subscribedChannels = subs.rows.map(r => r.channel);

  // means keep the channels which are common from params and db 
  const validChannels = channelList.filter(ch =>
    subscribedChannels.includes(ch)
  );
// if no channels send not subscribed 
  if (validChannels.length === 0) {
  return res.status(403).json({
    error: "Not subscribed to this channel"
  });
}
  res.setHeader("Content-Type", "text/event-stream"); // used to say that do not read the data in the format of json and html read in the text/event stream 
  res.setHeader("Cache-Control", "no-cache");// do not store in   the cache 
  res.setHeader("Connection", "keep-alive"); // do not close the connection after receiving the response ones
  res.flushHeaders();//Send the headers right now and start the stream


  // Replay logic to check and send the previous msgs 
  if (lastEventId) {
    const replay = await pool.query(
      "SELECT * FROM events WHERE channel = ANY($1) AND id > $2 ORDER BY id ASC",
      [validChannels, lastEventId]
    );

    replay.rows.forEach(event => sendEvent(res, event));
  }

  // Register connection
  //check is the channel is present or not  if not add in map  and add the active user to that particular channel 
  validChannels.forEach(channel => {
    if (!activeConnections.has(channel))
      activeConnections.set(channel, new Set());

    activeConnections.get(channel).add({ userId, res });
  });

  // Heartbeat
  // some automatically closes the connection when no msg is received so after every 30s a dumy msg is sent 
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  // if the user left
  req.on("close", () => {
    clearInterval(heartbeat);
    validChannels.forEach(channel => {
      activeConnections.get(channel)?.forEach(client => {
        if (client.res === res)
          activeConnections.get(channel).delete(client);
      });
    });
  });
});

// to get the history of the events
router.get("/api/events/history", async (req, res) => {
  const { channel, page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  const result = await pool.query(
    "SELECT * FROM events WHERE channel=$1 ORDER BY id DESC LIMIT $2 OFFSET $3",
    [channel, limit, offset]
  );

  res.json(result.rows);
});
router.get("/api/events/active-connections", (req, res) => {

  const connections = [];

  activeConnections.forEach((clients, channel) => {

    clients.forEach(client => {
      connections.push({
        userId: client.userId,
        channel
      });
    });

  });

  res.json({
    totalConnections: connections.length,
    connections
  });

});

module.exports = router;
