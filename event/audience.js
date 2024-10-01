AgoraRTC.setLogLevel(4); // Debug
AgoraRTC.enableLogUpload(); // Error reporting
let isSTTEnable = false;
let userId = getParameterByName("user") || null;

// Beforeunload
window.addEventListener("beforeunload", async () => {
  let option = {
    roomId: getParameterByName("event") || "demo-event",
  };
  await conn.leaveChatRoom(option).then((res) => console.log(res));
  conn.close();
});
// Initialize AgoraRTC SDK
const client = AgoraRTC.createClient({
  mode: "live",
  codec: "vp8",
  role: "audience",
});

const joinCall = () =>
  new Promise(async (resolve, reject) => {
    try {
      // Fetch audience token
      const response = await fetch("../../get-user-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "rtc",
          user: 0,
          channel: getParameterByName("event") || "demo-channel",
          role: 0, // Audience
        }),
      });

      const { token } = await response.json();

      // Join the channel
      await client.join(
        AppID,
        getParameterByName("event") || "demo-channel",
        token
      );
      resolve();
    } catch (error) {
      reject(error);
    }
  });

// Subscribe to remote streams
client.on("user-published", async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  if (mediaType === "video") {
    const remoteVideoContainer = document.getElementById(
      "remote-video-container"
    );
    user.videoTrack.play("video-stream");
  }
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
});

document.querySelector("#toggle-stt").addEventListener("click", () => {
  if (isSTTEnable) {
    document.querySelector("#transcript-content").innerHTML = "";
    document.querySelector("#transcript").style.visibility = "hidden";
  }
  isSTTEnable = !isSTTEnable;

  document.querySelector("#toggle-stt").textContent = isSTTEnable
    ? "Hide transcriptions"
    : "Show transcriptions";
});
// Subscribe to RT-STT
let clearTranscript;
client.on("stream-message", async (user, data) => {
  if (!isSTTEnable) return;
  const msg = $protobufRoot.lookup("Text").decode(data) || {};
  const { words, data_type, trans = [], duration_ms, uid } = msg;

  // let transcript = words[0].text;
  words.pop();
  let transcript = words.map((word) => word.text).join(" ");
  document.querySelector("#transcript").style.visibility =
    words.length > 0 ? "visible" : "hidden";
  document.querySelector("#transcript-content ").innerHTML = transcript;

  console.log(words);
  // Clear the transcript after 5 seconds if final

  if (words[0]?.isFinal) {
    clearTranscript = setTimeout(() => {
      document.querySelector("#transcript-content").innerHTML = "";
      document.querySelector("#transcript").style.visibility = "hidden";
    }, 5000);
  }
});
// Reactions

const reactionButtons = document.querySelectorAll(".reaction-button");
const videoStream = document.getElementById("video-stream");

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const reaction = button.textContent;
    sendReaction(reaction);
  });
});

const joinChat = () =>
  new Promise(async (resolve, reject) => {
    if (!userId) {
      // Randonmy generate a uid
      userId = "user_" + Math.random().toString(16).slice(2, 6);
      // Send request to backend to register the user
      const newUserRsp = await fetch("../../new_chat_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId,
        }),
      });
      const newUser = await newUserRsp.json();
      console.log(newUser);
    }
    document.querySelector("#user-info span").innerText = userId;
    try {
      const response = await fetch("../../get-user-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user",
          user: userId,
        }),
      });
      const { token } = await response.json();

      await conn.open({
        user: userId,
        agoraToken: token,
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
const addEventHandlerChat = () => {
  conn.addEventHandler("connection&message", {
    onConnected: () => {
      console.log("Connection opened");
      // Join chatroom
      let options = {
        roomId: getParameterByName("event") || "demo-event",
        message: "event",
      };
      console.log(conn.joinChatRoom(options));
    },
    onDisconnected: () => {
      console.log("Connection closed");
    },
    onTextMessage: function (message) {
      // Append the message to the chat window
      appendMessage(message.msg, message.from, message.from);
    },
  });
};
const chatInput = document.querySelector("#chat-input input");
const sendBtn = document.getElementById("send-btn");
const chatMessages = document.getElementById("chat-messages");

// Function to append a message to the chat window
const appendMessage = (message, sender, username = "User") => {
  // Create a new message element
  const messageElem = document.createElement("div");

  // Determine if the message is from the host or a user
  if (sender === "admin") {
    messageElem.classList.add("message", "host-message");
    messageElem.innerHTML = `<span class="label">[Host]</span> ${message}`;
  } else if (sender === "self") {
    messageElem.classList.add("message", "user-message");
    messageElem.innerHTML = `<span class="label">[Me]</span> ${message}`;
  } else {
    messageElem.classList.add("message", "audience-message");
    messageElem.innerHTML = `<span class="label">[${username}]</span> ${message}`;
  }

  // Append the message to the chat window
  chatMessages.appendChild(messageElem);

  // Scroll to the bottom of the chat window
  chatMessages.scrollTop = chatMessages.scrollHeight;
};
// Send chat message
const sendMessage = async () => {
  const message = chatInput.value;
  chatInput.value = "";
  // Append the message to the chat window
  appendMessage(message, "self");
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
function sendReaction(reaction) {
  // Create the floating reaction element
  const reactionElem = document.createElement("div");
  reactionElem.classList.add("reaction-float");
  reactionElem.textContent = reaction;
  reactionElem.style.left = Math.random() * 80 + 10 + "%"; // Random horizontal position
  reactionElem.style.top = 100 + "%"; // Start from the bottom

  // Append to video stream
  videoStream.appendChild(reactionElem);

  // Send via chat message
  let msg = WebIM.message.create({
    type: "cmd",
    to: getParameterByName("event") || "demo-event",
    chatType: "chatRoom",
    ext: [reaction],
  });
  conn.send(msg);

  // Remove the element after animation completes
  reactionElem.addEventListener("animationend", () => {
    reactionElem.remove();
  });
}

function getParameterByName(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, "\\$&"); // Correct the regex for special characters
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
