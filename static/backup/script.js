document.addEventListener("DOMContentLoaded", () => {
    const socket = io.connect();
    const startTalkingButton = document.getElementById("start-talking-button");
    const keyboardButton = document.getElementById("keyboard-button");
    const sendButton = document.getElementById("send-button");
    const stopAudioButton = document.getElementById("stop-audio-button");
    const userInput = document.getElementById("chat-input");
    const messagesDiv = document.getElementById("chat-messages");
    const hiddenInputContainer = document.getElementById("hidden-input-container");
    const audioPlayer = new Audio();
    let loadingMessageElement = null;
    let loadingInterval = null;

    let mediaRecorder;
    let audioChunks = [];

    // Hide the text input and send button container by default
    hiddenInputContainer.style.display = 'none';

    // Handle incoming message and audio data from the server
    //socket.on("response_with_audio", data => {
        //removeLoadingIndicator();
       // appendMessage("bot", data.message);

      //  if (data.audio) {
           // const audioBlob = new Blob([data.audio], { type: 'audio/mp3' });
           // const audioUrl = URL.createObjectURL(audioBlob);
           // audioPlayer.src = audioUrl;
          //  audioPlayer.onloadedmetadata = () => {
         //       audioPlayer.play();
        //    };
      //  } else {
    //        console.error('Failed to generate audio:', data.error);
  //      }
//    });

    // Handle incoming message and audio data from the server
socket.on("response_with_audio", data => {
    removeLoadingIndicator();
    appendMessage("bot", data.message);

    if (data.audio) {
        const audioBlob = new Blob([data.audio], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Ensure audio playback is tied to user interaction
        audioPlayer.src = audioUrl;
        audioPlayer.onloadedmetadata = () => {
            console.log("Audio metadata loaded, attempting to play...");
            audioPlayer.play().then(() => {
                console.log("Audio is playing.");
            }).catch(error => {
                console.error("Playback error:", error);
                // Provide a visual or audible error indication to the user
                alert("Audio playback failed. Please interact with the page first.");
            });
        };
    } else {
        console.error('Failed to generate audio:', data.error);
    }
});

    socket.on("stt_response", data => {
        removeLoadingIndicator();

        if (data.text) {
            appendMessage("user", data.text);
            showLoadingIndicator();
            socket.emit("message", data.text);
        } else {
            appendMessage("user", "Unable to detect human voice.");
        }
    });

    stopAudioButton.addEventListener("click", () => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    });

    keyboardButton.addEventListener("click", () => {
        const isVisible = hiddenInputContainer.style.display === 'flex';
        hiddenInputContainer.style.display = isVisible ? 'none' : 'flex';
        hiddenInputContainer.style.flexDirection = 'row';

        if (!isVisible) {
            userInput.focus();
        }
    });

    sendButton.addEventListener("click", () => {
        const message = userInput.value.trim();
        if (message) {
            appendMessage("user", message);
            socket.emit("message", message);
            userInput.value = "";
            showLoadingIndicator();
        }
    });

    userInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter" || event.keyCode === 13) {
            sendButton.click();
        }
    });

    startTalkingButton.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            startTalkingButton.classList.remove("recording");
            startTalkingButton.textContent = "🎤";
        } else {
            startRecording();
            startTalkingButton.classList.add("recording");
            startTalkingButton.textContent = "🎤";
        }
    });

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();

                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const reader = new FileReader();

                    reader.onload = () => {
                        const arrayBuffer = reader.result;
                        const audioData = new Uint8Array(arrayBuffer);
                        socket.emit("speech_to_text", { audio: audioData });
                    };

                    reader.readAsArrayBuffer(audioBlob);
                    showLoadingIndicator(true);
                };
            })
            .catch(error => {
                console.error("Error accessing microphone:", error);
            });
    }

    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender.toLowerCase());
        messageElement.innerHTML = message;

        if (message === "Unable to detect human voice." && sender === "user") {
            messageElement.style.backgroundColor = "#DCF8C6";
            messageElement.style.color = "#333";
            messageElement.style.alignSelf = "flex-end";
        }

        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showLoadingIndicator() {
        if (!loadingMessageElement) {
            loadingMessageElement = document.createElement("div");
            loadingMessageElement.classList.add("message", "loading");
            loadingMessageElement.textContent = ".";

            loadingMessageElement.style.textAlign = 'center';
            loadingMessageElement.style.alignSelf = 'center';

            messagesDiv.appendChild(loadingMessageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            let dots = 1;
            loadingInterval = setInterval(() => {
                dots = (dots % 3) + 1;
                loadingMessageElement.textContent = ".".repeat(dots);
            }, 500);
        }
    }

    function removeLoadingIndicator() {
        if (loadingMessageElement) {
            messagesDiv.removeChild(loadingMessageElement);
            loadingMessageElement = null;
        }
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
    }
});
