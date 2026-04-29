// ========== IN-APP MESSAGING SYSTEM ==========

let currentConversationUser = null;

function sendMessage(fromUserId, toUserId, itemId, content) {
    const message = {
        id: messages.length + 1,
        fromUserId: fromUserId,
        toUserId: toUserId,
        itemId: itemId,
        content: content,
        timestamp: Date.now(),
        read: false
    };
    messages.push(message);
    saveData();
    return message;
}

function getConversation(userId1, userId2) {
    return messages.filter(m =>
        (m.fromUserId === userId1 && m.toUserId === userId2) ||
        (m.fromUserId === userId2 && m.toUserId === userId1)
    ).sort((a, b) => a.timestamp - b.timestamp);
}

function getUserMessages(userId) {
    return messages.filter(m => m.toUserId === userId || m.fromUserId === userId);
}

function markMessageAsRead(messageId) {
    const message = messages.find(m => m.id === messageId);
    if (message) {
        message.read = true;
        saveData();
    }
}

function closeMessagingModal() {
    document.getElementById('messagingModal').classList.remove('active');
    currentConversationUser = null;
}

function openMessagingModal(userId) {
    currentConversationUser = userId;
    document.getElementById('messagingModal').classList.add('active');
    loadConversation(userId);
}

function loadConversation(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const conversation = getConversation(currentUser.id, userId);
    const messagesList = document.getElementById('messagesList');

    messagesList.innerHTML = conversation.map(msg => {
        const isFromCurrentUser = msg.fromUserId === currentUser.id;
        return `
            <div style="display: flex; ${isFromCurrentUser ? 'justify-content: flex-end' : 'justify-content: flex-start'}; margin-bottom: 10px;">
                <div style="max-width: 70%; background: ${isFromCurrentUser ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${isFromCurrentUser ? 'white' : 'var(--text)'}; padding: 10px 15px; border-radius: 8px; word-wrap: break-word;">
                    <p style="margin: 0; font-size: 14px;">${msg.content}</p>
                    <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.7;">${new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
            </div>
        `;
    }).join('');

    // Auto-scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

function sendMessageFromModal() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content || !currentConversationUser) return;

    sendMessage(currentUser.id, currentConversationUser, null, content);
    input.value = '';
    loadConversation(currentConversationUser);
    showToast('Message sent!', 'success');
}
