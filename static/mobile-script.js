document.addEventListener("DOMContentLoaded", () => {
    const socket = io.connect();
    const startTalkingButton = document.getElementById("mobile-start-talking-button");
    const sendButton = document.getElementById("mobile-send-button");
    const stopAudioButton = document.getElementById("mobile-stop-audio-button");
    const userInput = document.getElementById("mobile-chat-input");
    const messagesDiv = document.getElementById("mobile-chat-messages");
    const audioPlayer = new Audio();  // Create audio player element
    let mediaRecorder;
    let audioChunks = [];

    // Handle incoming message from the server
    socket.on("response_with_audio", data => {
        appendMessage("bot", data.message);
        if (data.audio) {
            const audioBlob = new Blob([data.audio], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.play();
        }
    });

    // Send message to server
    sendButton.addEventListener("click", () => {
        const message = userInput.value.trim();
        if (message) {
            appendMessage("user", message);
            socket.emit("message", message);
            userInput.value = ""; // Clear the input
        }
    });

    // Start or stop voice recording
    startTalkingButton.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        } else {
            startRecording();
        }
    });

    // Start recording audio
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                audioChunks = [];
                mediaRecorder.ondataavailable = event => {
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
                };
            })
            .catch(error => console.error("Error accessing microphone:", error));
    }

    // Append messages to the chat box
    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender.toLowerCase());
        messageElement.textContent = message;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
    }
});
