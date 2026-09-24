const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${location.host}/ws`);

const chatInput = document.querySelector('#chat-input');
const chatButton = document.querySelector('#chat-button');

chatButton.addEventListener('click', (e) => {
    const message = chatInput.value;

    if (!message) {
        return;
    }

    socket.send(message);
})

// прослушка входящих сообщений
socket.onmessage = function(event) {
    let incomingMessage = event.data;
    showMessage(incomingMessage);
};

socket.onclose = event => console.log(`Closed ${event.code}`);

// отображение информации в div#messages
function showMessage(message) {
    let messageElem = document.createElement('div');
    messageElem.textContent = message;
    document.getElementById('messages').prepend(messageElem);
}