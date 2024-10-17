document.addEventListener("DOMContentLoaded", () => {
    const socket = io.connect();
    const startTalkingButton = document.getElementById("start-talking-button");  // Microphone button
    const keyboardButton = document.getElementById("keyboard-button");  // Keyboard button
    const sendButton = document.getElementById("send-button");  // Send button
    const stopAudioButton = document.getElementById("stop-audio-button");  // Stop Audio button
    const userInput = document.getElementById("chat-input");  // Input field for typing text
    const messagesDiv = document.getElementById("chat-messages");
    const hiddenInputContainer = document.getElementById("hidden-input-container");  // Container for input box and send button
    let audioPlayer = null;  // Create a new audio player element on first interaction
    let loadingMessageElement = null;
    let loadingInterval = null;

    let mediaRecorder;
    let audioChunks = [];

    hiddenInputContainer.style.display = 'none';

    // Function to create an audio player when needed
    function initializeAudioPlayer() {
        if (!audioPlayer) {
            audioPlayer = new Audio();
        }
    }

    // Handle incoming message and audio data from the server
    socket.on("response_with_audio", data => {
        removeLoadingIndicator();
        appendMessage("bot", data.message);

        if (data.audio) {
            const audioBlob = new Blob([data.audio], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Initialize and stop the current audio before playing the new one
            initializeAudioPlayer();
            if (!audioPlayer.paused) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            }

            audioPlayer.src = audioUrl;
            audioPlayer.onloadedmetadata = () => {
                audioPlayer.play().catch(error => {
                    console.error("Playback error on mobile:", error);
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
            console.error('Failed to convert speech to text:', data.error);
        }
    });

    stopAudioButton.addEventListener("click", () => {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            console.log("Audio playback stopped.");
        }
    });

    keyboardButton.addEventListener("click", () => {
        const isVisible = hiddenInputContainer.style.display === 'flex';
        hiddenInputContainer.style.display = isVisible ? 'none' : 'flex';
        hiddenInputContainer.style.flexDirection = 'row';
        if (!isVisible) {
            userInput.focus();
        }
    });

    // Ensure audio permission is triggered by the first user interaction
    sendButton.addEventListener("click", () => {
        const message = userInput.value.trim();
        if (message) {
            appendMessage("user", message);
            socket.emit("message", message);
            userInput.value = "";  // Clear the input field after sending
            showLoadingIndicator();

            // Stop the current audio before playing the new one
            initializeAudioPlayer();
            if (!audioPlayer.paused) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            }
        }
    });

    userInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter" || event.keyCode === 13) {
            sendButton.click();  // Trigger send button click on 'Enter' press
        }
    });

    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender.toLowerCase());
        messageElement.innerHTML = message;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
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
