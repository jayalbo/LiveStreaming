require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

// Agora Chat credentials
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_SECRET = process.env.AGORA_APP_SECRET;
const AGORA_CID = process.env.AGORA_CID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;
const ORG_NAME = process.env.ORG_NAME;
const APP_NAME = process.env.APP_NAME;
const APP_REST_API = process.env.APP_REST_API;

const axios = require("axios");
const express = require("express");
const path = require("path");
const ChatTokenBuilder =
  require("./inc/token/src/ChatTokenBuilder").ChatTokenBuilder;
const RtcTokenBuilder =
  require("./inc/token/src/RtcTokenBuilder2").RtcTokenBuilder;
const Role = require("./inc/token/src/RtcTokenBuilder2").Role;
const app = express();
const port = 3000;

// Serve static files from the "event" directory
app.use(express.json());
app.use("/event", express.static(path.join(__dirname, "event")));
app.use("/admin", express.static(path.join(__dirname, "event/admin.html")));

// Function to create a new Agora chatroom (event)
async function createAgoraChatroom(token, eventName) {
  const url = `https://${APP_REST_API}/${ORG_NAME}/${APP_NAME}/chatrooms`;
  try {
    const response = await axios.post(
      url,
      {
        name: eventName, // Name of the chatroom (event name)
        description: `Chatroom for event: ${eventName}`,
        owner: "admin", // Admin user in your Agora Chat App
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating chatroom:", error.response.data);
    throw new Error("Failed to create chatroom");
  }
}

// Function to list Agora chatrooms (events)
async function listAgoraChatrooms(token) {
  const url = `https://${APP_REST_API}/${ORG_NAME}/${APP_NAME}/chatrooms`;
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching chatrooms:", error.response.data);
    throw new Error("Failed to fetch chatrooms");
  }
}

// Endpoint to retrieve app IDs
app.get("/env", (req, res) => {
  res.status(200).json({
    agoraAppId: AGORA_APP_ID,
    agoraChatAppId: `${ORG_NAME}#${APP_NAME}`,
  });
});
// Register a new chat user
app.post("/new_chat_user", async (req, res) => {
  const { username } = req.body;
  const url = `https://${APP_REST_API}/${ORG_NAME}/${APP_NAME}/users`;
  const token = getAgoraToken("app");
  try {
    const response = await axios.post(
      url,
      {
        username: username,
        password: "password",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.status(200).json({
      message: "Chat user registered successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to register chat user" });
  }
});

app.post("/enable_rtstt", async (req, res) => {
  // Check if STT users are already in the channel
  const { channelName } = req.body;

  const statsUrl = `https://api.agora.io/dev/v1/channel/user/${AGORA_APP_ID}/${channelName}`;
  const statsResponse = await axios.get(statsUrl, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    auth: {
      username: AGORA_CID,
      password: AGORA_SECRET,
    },
  });
  const { data } = statsResponse.data;
  console.log(data);
  if (data.broadcasters.includes(3000)) {
    res.status(200).json({ message: "RTSTT already enabled" });
    return; // STT was already enabled
  }

  // Acquire
  // Post request

  const token = getAgoraToken("app");
  const url = `https://api.agora.io/v1/projects/${AGORA_APP_ID}/rtsc/speech-to-text/builderTokens`;
  try {
    const response = await axios.post(
      url,
      {
        instanceId: uuidv4(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        auth: {
          username: AGORA_CID,
          password: AGORA_SECRET,
        },
      }
    );
    const { instanceId, tokenName } = response.data;

    // If successful execute the next query
    const url_start = `https://api.agora.io/v1/projects/${AGORA_APP_ID}/rtsc/speech-to-text/tasks?builderToken=${tokenName}`;
    // Payload
    const payload = {
      languages: ["en-US"],
      maxIdleTime: 60,
      rtcConfig: {
        channelName: channelName,
        subBotUid: "2000",
        subBotToken: getAgoraToken("rtc", 2000, channelName, Role.SUBSCRIBER),
        pubBotUid: "3000",
        pubBotToken: getAgoraToken("rtc", 3000, channelName, Role.PUBLISHER),
      },
    };

    const response_start = await axios.post(url_start, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      auth: {
        username: AGORA_CID,
        password: AGORA_SECRET,
      },
    });
    res.status(200).json(response_start.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to enable RTSTT" });
    throw new Error("Failed to enable RTSTT", error);
    // */
  }
});

// Function to delete an Agora chatroom (event)
async function deleteAgoraChatroom(token, chatroomId) {
  const url = `https://${APP_REST_API}/${ORG_NAME}/${APP_NAME}/chatrooms/${chatroomId}`;
  try {
    const response = await axios.delete(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting chatroom:", error.response.data);
    throw new Error("Failed to delete chatroom");
  }
}
// Endpoint to get chatroom (event) details
app.get("/get-event/:chatroomId", async (req, res) => {
  const token = getAgoraToken("app");
  const { chatroomId } = req.params;

  try {
    // Fetch the chatroom details
    const chatroomData = await listAgoraChatrooms(token);
    const chatroom = chatroomData.data.find((room) => room.id === chatroomId);

    // Respond with the chatroom information
    res.status(200).json({
      message: "Event details",
      chatroom: chatroom,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event details" });
  }
});
// Endpoint to create a new event (chatroom)
app.post("/create-event", async (req, res) => {
  const token = getAgoraToken("app");
  const { eventName } = req.body;

  if (!eventName) {
    return res.status(400).json({ error: "Event name is required" });
  }

  try {
    // Create the Agora chatroom (event)
    const chatroomData = await createAgoraChatroom(token, eventName);
    // Respond with the chatroom information
    res.status(201).json({
      message: "Event created successfully",
      chatroom: chatroomData,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
});
// Endpoint to get token for user
app.post("/get-user-token", async (req, res) => {
  const { type, user, channel, role } = req.body;
  let token;
  if (type === "rtc") {
    token = getAgoraToken("rtc", user, channel, role);
  } else if (type === "user") {
    // Chat user
    token = getAgoraToken("user", user);
  } else {
    // Chat app
    token = getAgoraToken("app");
  }
  res.status(200).json({
    message: "User token generated successfully",
    token: token,
  });
});

// Endpoint to list all chatrooms (events)
app.get("/list-events", async (req, res) => {
  const token = getAgoraToken("app");

  try {
    // Fetch the list of chatrooms
    const chatroomsData = await listAgoraChatrooms(token);

    // Respond with the list of chatrooms
    res.status(200).json({
      message: "List of events",
      events: chatroomsData.data,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Endpoint to delete a chatroom (event)
app.delete("/delete-event/:chatroomId", async (req, res) => {
  const token = getAgoraToken("app");
  const { chatroomId } = req.params;

  try {
    // Delete the specified chatroom
    await deleteAgoraChatroom(token, chatroomId);

    // Respond with a success message
    res.status(200).json({
      message: `Event with ID ${chatroomId} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Basic route for testing
app.get("/", (req, res) => {
  // Rediect to admin page
  res.redirect("/admin");

  // res.send("Agora Events Server is running!");
});

// Generate Agora token
function getAgoraToken(
  type,
  user = "admin",
  channel = "",
  role = Role.PUBLISHER
) {
  let token = "";
  if (type === "user") {
    const user_uuid = user;
    token = ChatTokenBuilder.buildUserToken(
      AGORA_APP_ID,
      APP_CERTIFICATE,
      user_uuid,
      86400
    );
  } else if (type === "app") {
    token = ChatTokenBuilder.buildAppToken(
      AGORA_APP_ID,
      APP_CERTIFICATE,
      86400
    );
  } else {
    // Create universal RTC token
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      APP_CERTIFICATE,
      channel,
      user.toString(),
      role,
      86400
    );
    console.log(`Token ${token}`);
    //
  }
  return token;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
