let AppID = ""; // Agora RTC App ID
let appKey = ""; // Agora Chat App ID
let totalViewers = 0;

// Agora RTC SDK setup
AgoraRTC.enableLogUpload();
AgoraRTC.setLogLevel(4);

// Initialize AgoraRTC SDK
const client = AgoraRTC.createClient({
  mode: "live",
  codec: "vp8",
});

// Get Agora App IDs
let conn = null;
fetch("../../env")
  .then((res) => res.json())
  .then((data) => {
    AppID = data.agoraAppId;
    appKey = data.agoraChatAppId;

    // Join the chatroom
    conn = new WebIM.connection({
      appKey,
    });
    joinAC();
  });

// Join chatroom
// const conn = new WebIM.connection({
//   appKey,
// });

joinAC = async () => {
  const response = await fetch("../../get-user-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "user",
      user: "admin",
    }),
  });
  const { token } = await response.json();
  try {
    conn.open({
      user: "admin",
      agoraToken: token,
    });

    // Join chatroom
  } catch (error) {
    console.error("Error joining chatroom:", error);
  }

  conn.addEventHandler("connection&message", {
    onChatroomEvent: (msg) => {
      switch (msg.operation) {
        case "memberPresence":
          totalViewers++;
          break;
        case "memberAbsence":
          totalViewers--;
          break;
      }
      document.querySelector("#viewers span").innerText = totalViewers;
    },
    onConnected: async () => {
      console.log("Connection opened");
      // Join chatroom
      let options = {
        roomId: getParameterByName("event") || "demo-event",
        message: "event",
      };
      await conn.joinChatRoom(options);

      let response = await conn.getChatRoomDetails({
        chatRoomId: getParameterByName("event") || "demo-event",
      });
      let { data } = response;
      console.log(data);
      totalViewers = data[0].affiliations_count - 1; // Exclude the host
      document.querySelector("#viewers span").innerText = totalViewers;
      // Update event name
      document.querySelector("#event-name span").innerText = data[0].name;
    },
    onDisconnected: () => {
      console.log("Connection closed");
    },
    onTextMessage: (message) => {
      // Append the message to the chat window
      console.log("Message received:", message);
      appendMessage(message.msg, "audience", message.from);
    },
    onCmdMessage: (message) => {
      console.log("Command message received:", message);
      receiveReaction(message.ext[0]);
    },
  });
};

// Add AC event listeners

// Create local tracks
const localTracks = {
  videoTrack: null,
  audioTrack: null,
};

// Create a local video track
AgoraRTC.createCameraVideoTrack({
  encoderConfig: "720p_3",
})
  .then((videoTrack) => {
    localTracks.videoTrack = videoTrack;
    videoTrack.play("video-stream");
    AgoraRTC.createMicrophoneAudioTrack()
      .then((audioTrack) => {
        localTracks.audioTrack = audioTrack;
        // Enable join button
        document.getElementById("start-btn").style.display = "block";
      })
      .catch((error) => {
        console.error("Error creating audio track:", error);
      });
  })
  .catch((error) => {
    console.error("Error creating video track:", error);
  });

// Stream control buttons
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");

startBtn.addEventListener("click", async () => {
  // Start streaming logic here
  console.log("Stream started");

  // Join the channel
  // Fetch the token from the server
  const response = await fetch("../../get-user-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "rtc",
      user: 0,
      channel: getParameterByName("event") || "demo-channel",
      role: 1,
    }),
  });
  const { token } = await response.json();

  await client.join(
    AppID,
    getParameterByName("event") || "demo-channel",
    token,
    1000
  );

  // Trigger RTSTT

  const stt = await fetch("../../enable_rtstt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channelName: getParameterByName("event") || "demo-channel",
    }),
  });
  const sttResponse = await stt.json();
  console.log(sttResponse);

  // Hide start button and show stop button
  startBtn.style.display = "none";
  stopBtn.style.display = "block";

  // Set role as host
  await client.setClientRole("host");
  // Publish the local tracks
  await client.publish([localTracks.videoTrack, localTracks.audioTrack]);
});

stopBtn.addEventListener("click", () => {
  // Stop streaming logic here
  console.log("Stream stopped");
  client.leave();
  // Hide stop button and show start button
  startBtn.style.display = "block";
  stopBtn.style.display = "none";
});

// Chat functionality

// Function to append a message to the chat window
const appendMessage = (message, sender, username = "User") => {
  // Create a new message element
  const messageElem = document.createElement("div");

  // Determine if the message is from the host or a user
  if (sender === "host") {
    messageElem.classList.add("message", "host-message");
    messageElem.innerHTML = `<span class="label">[Me]</span> ${message}`;
  } else {
    messageElem.classList.add("message", "user-message");
    messageElem.innerHTML = `<span class="label">[${username}]</span> ${message}`;
  }

  // Append the message to the chat window
  chatMessages.appendChild(messageElem);

  // Scroll to the bottom of the chat window
  chatMessages.scrollTop = chatMessages.scrollHeight;
};
const chatInput = document.querySelector("#chat-input input");
const sendBtn = document.getElementById("send-btn");
const chatMessages = document.getElementById("chat-messages");

// Send chat message
const sendMessage = async () => {
  const message = chatInput.value;
  chatInput.value = "";
  // Append the message to the chat window
  appendMessage(message, "host");
  //   appendMessage(message, "audience", "Jay");

  // Send the message to the chatroom
  let msg = WebIM.message.create({
    type: "txt",
    msg: message,
    to: getParameterByName("event") || "demo-event",
    chatType: "chatRoom",
  });
  await conn.send(msg);

  console.log("Message sent");
};

// Bind click & enter key to send chat message
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
sendBtn.addEventListener("click", sendMessage);

// Send chat message

// Receive chat message

// Reaction display area
const reactionDisplay = document.getElementById("reaction-display");
const videoStream = document.getElementById("video-stream");

// Simulate receiving reactions from the audience
function receiveReaction(reaction) {
  // Update reaction counts
  updateReactionDisplay(reaction);

  // Show floating reaction
  showFloatingReaction(reaction);
}

function updateReactionDisplay(reaction) {
  let existingCount = document.querySelector(
    `.reaction-count[data-reaction="${reaction}"]`
  );
  if (existingCount) {
    let countSpan = existingCount.querySelector(".count");
    countSpan.textContent = parseInt(countSpan.textContent) + 1;
  }
}

function showFloatingReaction(reaction) {
  // Create the floating reaction element
  const reactionElem = document.createElement("div");
  reactionElem.classList.add("reaction-float");
  reactionElem.textContent = reaction;
  reactionElem.style.left = Math.random() * 80 + 10 + "%"; // Random horizontal position

  // Append to video stream
  videoStream.appendChild(reactionElem);

  // Remove the element after animation completes
  reactionElem.addEventListener("animationend", () => {
    reactionElem.remove();
  });
}

// For demonstration purposes, simulate reactions every few seconds
const reactions = ["👍", "❤️", "😂", "👏", "👎"];
// setInterval(() => {
//   const randomReaction =
//     reactions[Math.floor(Math.random() * reactions.length)];
//   receiveReaction(randomReaction);
// }, 3000);

function getParameterByName(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, "\\$&"); // Correct the regex for special characters
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Chat toggle logic
const toggleChatBtn = document.getElementById("toggle-chat-btn");
const chat = document.getElementById("chat");

toggleChatBtn.addEventListener("click", () => {
  if (chat.classList.contains("hidden")) {
    chat.classList.remove("hidden");
    toggleChatBtn.textContent = "Hide Chat";
  } else {
    chat.classList.add("hidden");
    toggleChatBtn.textContent = "Show Chat";
  }
});
