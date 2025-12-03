<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat App Dashboard</title>
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
    <link rel="stylesheet" href="<?php echo base_url("assets/dashboardstyles.css")?>">
</head>

<body>
    <!-- Sidebar with chat list -->
    <div class="sidebar">


        <div class="sidebar-header">
            <h2>Messages</h2>
            <a href="<?= site_url('AuthController/Logout') ?>" class="logout-btn">Logout</a>
        </div>


        <!-- Current User Info -->
        <div class="current-user-info">
            <div class="profile-pic-small">
                <img src="https://i.pravatar.cc/150?u=<?php echo urlencode($username); ?>" alt="Profile" id="my-avatar">
                <div class="status-indicator online" id="my-status"></div>
            </div>
            <div class="user-details">
                <div class="username" id="my-username"><?php echo htmlspecialchars($username); ?></div>
                <div class="user-id" id="my-user-id">Connecting...</div>
            </div>
        </div>


        <div class="search-container">
            <button id="create-group-btn" class="create-group-btn">Create a Group +</button>
            <input type="text" class="search-box" placeholder="Search users..." id="search-users">
        </div>


        <!-- Online Users Section -->
        <div class="section-header">
            <span>Online Users</span>
            <span class="online-count" id="online-count">0</span>
        </div>
        <div class="chats-list" id="online-users-list">
            <div class="loading">Loading online users...</div>
        </div>
    </div>



    <!-- Main Chat Area -->
    <div class="chat-area">
        <div class="chat-header-area">
            <div class="profile-pic">
                <img src="https://i.pravatar.cc/150?img=1" alt="Profile" id="current-user-avatar">
                <div class="status-indicator offline" id="current-user-status"></div>
            </div>
            <div class="chat-header-info">
                <div class="chat-title" id="current-chat-title">Select a chat</div>
                <div class="chat-status" id="current-chat-status">Select a user to start chatting</div>
            </div>
            <div class="typing-indicator" id="typing-indicator" style="display: none;"></div>
        </div>
        <div class="chat-messages" id="chat-messages">
            <div class="welcome-message">
                <div class="message received">
                    <div class="message-text">Welcome to the chat! Select a user from the sidebar to start messaging.</div>
                    <div class="message-time">Just now</div>
                </div>
            </div>
        </div>
        <div class="chat-input-area">
            <input type="text" class="message-input" id="message-input" placeholder="Type a message..." disabled>
            <button class="send-button" id="send-button" disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
        </div>
    </div>



    <script>
    // Socket.IO connection
    const socket = io("http://10.10.15.140:5555", {
        withCredentials: true
    });
    // DOM elements
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const staticUsersList = document.getElementById('static-users-list');
    const onlineUsersList = document.getElementById('online-users-list');
    const currentChatTitle = document.getElementById('current-chat-title');
    const currentChatStatus = document.getElementById('current-chat-status');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUserStatus = document.getElementById('current-user-status');
    const onlineCount = document.getElementById('online-count');
    const myUsername = document.getElementById('my-username');
    const myUserId = document.getElementById('my-user-id');
    const myAvatar = document.getElementById('my-avatar');
    const myStatus = document.getElementById('my-status');
    const typingIndicator = document.getElementById('typing-indicator');
    const searchUsers = document.getElementById('search-users');
    // Current user and chat state
    let currentUser = null;
    let currentRoom = null;
    // Get username from PHP
    const myRealUsername = <?php echo json_encode($username); ?>;
    const myRealId = <?php echo json_encode($userId); ?>;
    let myUserData = {
        id: myRealId,
        username: myRealUsername,
        socketId: null,
        isTemporary: false
    };
    let mySocketId = null;
    // Online users array
    let onlineUsers = [];
    let typingUsers = new Set();
    let typingTimer = null;
    // Initialize the app
    function initApp() {
        // Set up search functionality
        searchUsers.addEventListener('input', filterUsers);
        // Update UI with user info immediately
        myUsername.textContent = myUserData.username;
        myStatus.className = 'status-indicator online';
        loadOfflineConversations();
        loadGroupConversations();
    }
    // Load online users list
    function loadOnlineUsers() {
        onlineUsersList.innerHTML = '';
        if(onlineUsers.length === 0) {
            onlineUsersList.innerHTML = '<div class="no-users">No users online</div>';
            return;
        }
        onlineUsers.forEach(user => {
            if(user.userId !== myUserData.id) {
                // Check if this user is already in offline list
                const offlineItem = document.querySelector(`[data-user-id="${user.userId}"][data-type="offline"]`);
                if(offlineItem) {
                    // Update offline item to online
                    offlineItem.dataset.type = 'online';
                    offlineItem.querySelector('.status-indicator').className = 'status-indicator online';
                    offlineItem.querySelector('.timestamp').textContent = 'Online';
                    offlineItem.querySelector('.last-message').textContent = 'Available to chat';
                    if(!offlineItem.querySelector('.online-pulse')) {
                        offlineItem.innerHTML += '<div class="online-pulse"></div>';
                    }
                } else {
                    // Create new online item
                    const userItem = createUserItem({
                        id: user.userId,
                        username: user.username,
                        status: 'online',
                        lastSeen: 'Online',
                        lastMessage: 'Available to chat',
                        socketId: user.socketId
                    }, 'online');
                    onlineUsersList.appendChild(userItem);
                }
            }
        });
    }
    // Load offline conversations
    async function loadOfflineConversations() {
        try {
            const response = await fetch(`http://10.10.15.140:5555/api/${myUserData.id}/conversations`);
            const data = await response.json();
            if(data.conversations && data.conversations.length > 0) {
                const offlineUsersList = document.getElementById('static-users-list') || createOfflineSection();
                data.conversations.forEach(conversation => {
                    // Get the other participant
                    const otherParticipant = conversation.participants.find(p => p._id !== myUserData.id);
                    if(otherParticipant) {
                        // Check if user is already online
                        const isOnline = onlineUsers.some(u => u.userId === otherParticipant._id);
                            const lastMsgText = conversation.lastMessage
      ? `${conversation.lastMessage.sender?.username || ''}: ${conversation.lastMessage.text}`
      : 'Start chatting';
                        // Only add if offline
                        if(!isOnline) {
                            const user = {
                                id: otherParticipant._id,
                                username: otherParticipant.username,
                                status: 'offline',
                                lastSeen: 'Offline',
                                lastMessage: lastMsgText,
                                conversationId: conversation._id
                            };
                            // Use your existing function
                            const userItem = createUserItem(user, 'offline');
                            offlineUsersList.appendChild(userItem);
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Error loading offline conversations:", err);
        }
    }

    async function loadGroupConversations() {
  try {
    const response = await fetch(`http://10.10.15.140:5555/api/${myUserData.id}/groups`);
    const data = await response.json();
    if (data.groups && data.groups.length > 0) {
      const groupList = document.getElementById('group-chats-list') || createGroupSection();
      groupList.innerHTML = ''; // clear old entries

      data.groups.forEach(group => {

          const memberNames = group.participants
    ? group.participants.map(p => p.username).join(', ')
    : '';
      const lastMsgText = group.lastMessage
    ? `${group.lastMessage.sender?.username || ''}: ${group.lastMessage.text}`
    : 'Start chatting';

        const user = {
          id: group._id,                  // use conversation id
          username: group.conversationName,
          status: 'offline',              // groups don’t have a single online state
          lastSeen: '—',
          lastMessage: lastMsgText || 'Start chatting',
          conversationId: group._id,
          roomName: group.roomName,
          isGroup: true
        };
        const userItem = createUserItem(user, 'offline');
        groupList.appendChild(userItem);
      });
    }
  } catch (err) {
    console.error("Error loading group conversations:", err);
  }
}

    // Create offline section if needed
    function createOfflineSection() {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.innerHTML = 'Recent Chats';
        const offlineList = document.createElement('div');
        offlineList.className = 'chats-list';
        offlineList.id = 'static-users-list';
        // Insert after online users section
        const sidebar = document.querySelector('.sidebar');
        const onlineList = document.getElementById('online-users-list');
        sidebar.insertBefore(sectionHeader, onlineList.nextSibling);
        sidebar.insertBefore(offlineList, sectionHeader.nextSibling);
        return offlineList;
    }

    function createGroupSection() {
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'section-header';
      sectionHeader.innerHTML = 'Groups';

      const groupList = document.createElement('div');
      groupList.className = 'chats-list';
      groupList.id = 'group-chats-list';

      // Insert after the recent chats section
      const sidebar = document.querySelector('.sidebar');
      const recentSection = document.getElementById('static-users-list') || document.getElementById('online-users-list');
      sidebar.insertBefore(sectionHeader, recentSection.nextSibling);
      sidebar.insertBefore(groupList, sectionHeader.nextSibling);

      return groupList;
    }

    // Create user list item
    function createUserItem(user, type) {
        const userItem = document.createElement('div');
        userItem.className = 'chat-item';
        userItem.dataset.userId = user.id;
        userItem.dataset.username = user.name || user.username;
        userItem.dataset.type = type;
        userItem.dataset.isGroup = user.isGroup ? 'true' : 'false';
        userItem.dataset.socketId = user.socketId || '';
        const status = type === 'online' ? 'online' : (user.status || 'offline');
  const displayName = user.username + (user.isGroup ? ' (Group)' : '');
  const avatarId = user.isGroup ? `group_${user.id}` : user.id;
        userItem.innerHTML = `
        <div class="profile-pic">
            <img src="https://i.pravatar.cc/150?u=${avatarId}" alt="Profile">
            <div class="status-indicator ${status}"></div>
        </div>
        <div class="chat-info">
            <div class="chat-header">
                <div class="contact-name">${displayName}</div>
                <div class="timestamp">${type === 'online' ? 'Online' : (user.lastSeen || 'Offline')}</div>
            </div>
            <div class="last-message">${user.lastMessage || (type === 'online' ? 'Available to chat' : 'Offline')}</div>
               ${user.memberCount ? `<div class="group-member-count">${user.memberCount} members</div>` : ''}
        </div>
        ${user.unread > 0 ? `<div class="notification-badge">${user.unread}</div>` : ''}
        ${type === 'online' ? '<div class="online-pulse"></div>' : ''}
        `;
        // Normal click = open chat
         userItem.addEventListener('click', (e) => {
        // If checkbox was clicked, don't select chat
        if (e.target.type === 'checkbox') {
            return;
        }
        
        if (groupMode) {
            // In group mode, toggle checkbox when clicking item
            const checkbox = userItem.querySelector('.user-checkbox');
            if (checkbox && checkbox.dataset.userId !== myUserData.id) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        } else {
            selectUser(user, type);
        }
    });
    
    return userItem;
}
    let groupMode = false;
    let selectedUsers = [];
    const groupBtn = document.getElementById('create-group-btn');

// Toggle group mode
groupBtn.addEventListener('click', () => {
    if (!groupMode) {
        // Enter group creation mode
        enterGroupMode();
    } else {
        // Confirm and create group
        confirmGroup();
    }
});

function enterGroupMode() {
    groupMode = true;
    selectedUsers = [];
    
    // Update button
    groupBtn.textContent = 'Confirm Group (0)';
    groupBtn.classList.add('confirm-mode');
    
    // Add checkboxes to user items
    addCheckboxesToUsers();
    
}

function exitGroupMode() {
    groupMode = false;
    selectedUsers = [];
    
    // Reset button
    groupBtn.textContent = 'Create a Group +';
    groupBtn.classList.remove('confirm-mode');
    
    // Remove checkboxes
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.remove();
    });
}

function addCheckboxesToUsers() {
    const allUserItems = document.querySelectorAll('.chat-item');
    allUserItems.forEach(item => {
        // Only add to non-group items and not current user
        if (item.dataset.isGroup !== 'true' && item.dataset.userId !== myUserData.id) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'user-checkbox';
            checkbox.dataset.userId = item.dataset.userId;
            
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger chat selection
            });
            
            checkbox.addEventListener('change', (e) => {
                toggleUserSelection(item, e.target.checked);
            });
            
            // Insert checkbox at the beginning
            item.insertBefore(checkbox, item.firstChild);
        }
    });
}



// Update toggleUserSelection function
function toggleUserSelection(item, isChecked) {
    const userId = item.dataset.userId;
    
    if (isChecked) {
        if (!selectedUsers.includes(userId)) {
            selectedUsers.push(userId);
            item.classList.add('selected');
        }
    } else {
        selectedUsers = selectedUsers.filter(id => id !== userId);
        item.classList.remove('selected');
    }
    
    // Update button count
    groupBtn.textContent = `Confirm Group (${selectedUsers.length})`;
}

function confirmGroup() {
    if (selectedUsers.length === 0) {
        alert('Please select at least one user');
        return;
    }
    
    const groupName = prompt('Enter group name:');
    if (!groupName || groupName.trim() === '') {
        alert('Group name is required');
        return;
    }
    
    createGroup(groupName);
}


async function createGroup(groupName) {
  try {
    const response = await fetch("http://10.10.15.140:5555/api/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupName,
        participants: selectedUsers,
        admin: myUserData.id
      })
    });
    const data = await response.json();
    if (data.success) {
          const selectedUsernames = [];
      selectedUsers.forEach(userId => {
        const item = document.querySelector(`[data-user-id="${userId}"]`);
        if (item) {
          selectedUsernames.push(item.dataset.username);
        }
      });
      
      // Create group item with member count
      const groupList = document.getElementById('group-chats-list') || createGroupSection();
      const groupItem = createUserItem({
        id: data.conversation._id,
        username: data.conversation.conversationName,
        status: 'offline',
        lastSeen: '—',
        lastMessage: selectedUsernames.join(', '), // Show members in last message
        conversationId: data.conversation._id,
        roomName: data.conversation.roomName,
        isGroup: true,
        memberCount: selectedUsers.length + 1 // +1 for admin
      }, 'offline');
      
      groupList.prepend(groupItem);
      
      // Show success message
      alert(`Group "${groupName}" created with ${selectedUsers.length + 1} members!`);
      
      // Exit group mode
      exitGroupMode();
    } else {
      alert("Error creating group");
    }
  } catch (err) {
    console.error("Error creating group:", err);
    alert("Error creating group");
  }
}

    // Filter users based on search
    function filterUsers() {
        const searchTerm = searchUsers.value.toLowerCase();
        const allUserItems = document.querySelectorAll('.chat-item');
        allUserItems.forEach(item => {
            const userName = item.dataset.username.toLowerCase();
            if(userName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    console.log("My Id: " + myUserData.id);
    // Select a user to chat with
    function selectUser(user, type) {
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        event.currentTarget.classList.add('active');
        currentUser = user;
  if (user.isGroup) {
    currentRoom = user.roomName;
    currentChatTitle.textContent = user.username;
    currentChatStatus.textContent = "Group Chat";
    currentChatStatus.style.color = "#2196f3";
    currentUserAvatar.src = `https://i.pravatar.cc/150?u=group_${user.id}`;
    currentUserStatus.className = "status-indicator offline";

    socket.emit("joinRoom", {
      roomName: currentRoom,
      username: myUserData.username,
      id: myUserData.id
    });

    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();

    loadChatHistory(user.conversationId, user.username);
  }
    else {
                if(user.conversationId) {
            // Already have conversation from offline list
            currentRoom = `chat_${myUserData.id}_${user.id}`; // or use conversation.roomName if you stored it
            const displayName = user.username;
            currentChatTitle.textContent = displayName;
            currentChatStatus.textContent = "Offline";
            currentChatStatus.style.color = "#757575";
            currentUserAvatar.src = `https://i.pravatar.cc/150?u=${user.id}`;
            currentUserStatus.className = "status-indicator offline";
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
            loadChatHistory(user.conversationId, displayName); // <-- directly load history
        } else {
            // Online user: fetch or create conversation
            fetch("http://10.10.15.140:5555/api/conversation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId1: myUserData.id,
                    userId2: user.id
                })
            }).then(res => res.json()).then(data => {
                const {
                    conversation
                } = data;
                currentRoom = conversation.roomName;
                const displayName = user.username;
                currentChatTitle.textContent = displayName;
                currentChatStatus.textContent = "Online - Active now";
                currentChatStatus.style.color = "#4caf50";
                currentUserAvatar.src = `https://i.pravatar.cc/150?u=${user.id}`;
                currentUserStatus.className = "status-indicator online";
                socket.emit("joinRoom", {
                    roomName: currentRoom,
                    username: myUserData.username,
                    id: myUserData.id
                });
                messageInput.disabled = false;
                sendButton.disabled = false;
                messageInput.focus();
                loadChatHistory(conversation._id, displayName);
            }).catch(err => console.error("Error fetching conversation/messages:", err));
        }
    }
    }

    function loadChatHistory(conversationId, userName) {
        chatMessages.innerHTML = "";
        const welcomeMessage = document.createElement("div");
        welcomeMessage.className = "message received";
        welcomeMessage.innerHTML = `
    <div class="message-text">You are now chatting with <strong>${userName}</strong>. Start the conversation!</div>
    <div class="message-time">Just now</div>
  `;
        chatMessages.appendChild(welcomeMessage);
        fetch(`http://10.10.15.140:5555/api/messages/${conversationId}`).then(res => res.json()).then(messages => {
            messages.forEach(msg => {
                // normalize sender id check
                const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
                  const senderName = typeof msg.sender === "object" ? msg.sender.username : msg.senderName || "";
                  console.log(senderName);
                const messageElement = document.createElement("div");
                messageElement.className = senderId === myUserData.id ? "message sent" : "message received";
                messageElement.innerHTML = `
            <div class="message-text">
    ${currentUser.isGroup && senderName ? `<strong>${senderName}:</strong> ` : ''}${msg.text}
  </div>
          <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute : '2-digit', hour12: true})}</div>
        `;
                chatMessages.appendChild(messageElement);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }).catch(err => console.error("Error loading chat history:", err));
    }
    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if(message && currentUser && currentRoom) {
            console.log(`Sending message to room ${currentRoom}: ${message}`);
            // Emit message to server
            socket.emit('chatRoom', {
                room: currentRoom,
                senderId: myUserData.id,
                name: myUserData.username,
                message: message
            });
            // Create sent message element
            const messageElement = document.createElement('div');
            messageElement.className = 'message sent';
            messageElement.innerHTML = `
            <div>
     ${currentUser.isGroup && myRealUsername? `<strong>${myRealUsername}:</strong> ` : ''}${message}
  </div>
        <div class="message-time">${getCurrentTime()}</div>
        `;
            // Add to chat
            chatMessages.appendChild(messageElement);
            // Clear input
            messageInput.value = '';
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Stop typing indicator
            if(typingTimer) clearTimeout(typingTimer);
            socket.emit('typing', {
                room: currentRoom,
                username: myUserData.username,
                isTyping: false
            });
        }
    }
    // Handle typing
    function handleTyping() {
        if(currentRoom && currentUser) {
            socket.emit('typing', {
                room: currentRoom,
                username: myUserData.username,
                isTyping: true
            });
            // Clear previous timer
            if(typingTimer) clearTimeout(typingTimer);
            // Set timer to stop typing indicator after 1 second
            typingTimer = setTimeout(() => {
                socket.emit('typing', {
                    room: currentRoom,
                    username: myUserData.username,
                    isTyping: false
                });
            }, 1000);
        }
    }
    // Receive message
    function receiveMessage(data) {
        console.log('Received message:', data);
        // Only show message if it's for the current room and not from current user
        if(data.room === currentRoom && data.senderId !== myUserData.id) {
            const messageElement = document.createElement('div');
            messageElement.className = data.senderId === myUserData.id ? 'message sent' : 'message received';
            messageElement.innerHTML = `<div>
     ${currentUser.isGroup && data.name ? `<strong>${data.name}:</strong> ` : ''}${data.message}
  </div>
      <div class="message-time">${new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Remove typing indicator
            typingUsers.delete(data.name);
            updateTypingIndicator();
        } else if(data.room !== currentRoom) {
            console.log(`Message received for different room: ${data.room}, current room: ${currentRoom}`);
        }
    }
    // Update typing indicator
    function updateTypingIndicator() {
        if(typingUsers.size > 0) {
            const names = Array.from(typingUsers);
            const text = names.length === 1 ? `${names[0]} is typing...` : `${names.join(', ')} are typing...`;
            typingIndicator.textContent = text;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
    // Get current time in HH:MM AM/PM format
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return hours + ':' + minutes + ' ' + ampm;
    }
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            sendMessage();
        }
    });
    messageInput.addEventListener('input', handleTyping);
    // Socket event listeners
    socket.on('connect', () => {
        mySocketId = socket.id;
        myUserId.textContent = `ID: ${mySocketId.substring(0, 8)}...`;
        console.log('Connected with ID:', mySocketId);
        // Immediately join with real username when connected
        socket.emit('joinRoom', {
            roomName: 'general',
            username: myUserData.username,
            id: myUserData.id
        });
    });
socket.on('userListUpdate', (users) => {
    console.log('User list updated:', users);
    onlineUsers = users;

    // Save checkbox states before updating
    const checkboxStates = new Map();
    if (groupMode) {
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkboxStates.set(checkbox.dataset.userId, checkbox.checked);
        });
    }

    // Update all user statuses
    const allUserItems = document.querySelectorAll('.chat-item');
    allUserItems.forEach(item => {
        const userId = item.dataset.userId;
        const isOnline = onlineUsers.some(u => u.userId === userId && u.userId !== myUserData.id);
        
        if (isOnline) {
            item.dataset.type = 'online';
            item.querySelector('.status-indicator').className = 'status-indicator online';
            item.querySelector('.timestamp').textContent = 'Online';
            item.querySelector('.last-message').textContent = 'Available to chat';
            if (!item.querySelector('.online-pulse')) {
                item.innerHTML += '<div class="online-pulse"></div>';
            }
            // Move to online list if in offline list
            if (item.parentNode.id === 'static-users-list') {
                onlineUsersList.appendChild(item);
            }
        } else if (userId !== myUserData.id) {
            item.dataset.type = 'offline';
            item.querySelector('.status-indicator').className = 'status-indicator offline';
            item.querySelector('.timestamp').textContent = 'Offline';
            item.querySelector('.last-message').textContent = 'Click to chat';
            const pulse = item.querySelector('.online-pulse');
            if (pulse) pulse.remove();
            // Move to offline list if in online list
            if (item.parentNode.id === 'online-users-list') {
                const offlineList = document.getElementById('static-users-list');
                if (offlineList) {
                    offlineList.appendChild(item);
                }
            }
        }
    });

    // Restore checkbox states if in group mode
    if (groupMode) {
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            if (checkboxStates.has(checkbox.dataset.userId)) {
                checkbox.checked = checkboxStates.get(checkbox.dataset.userId);
            }
        });
    }

    // Keep this line - load online users list
    loadOnlineUsers();
    onlineCount.textContent = `(${Math.max(0, onlineUsers.length - 1)})`;
});
    socket.on('chatRoom', (data) => {
        console.log('Chat room event received:', data);
        receiveMessage(data);
    });
    socket.on('userTyping', (data) => {
        if(data.isTyping) {
            typingUsers.add(data.username);
        } else {
            typingUsers.delete(data.username);
        }
        updateTypingIndicator();
    });
    socket.on('user_joined', (data) => {
        console.log(`${data.username} joined the chat`);
    });
    socket.on('user_left', (data) => {
        console.log(`${data.username} left the chat`);
    });
    socket.on('disconnect', () => {
        myStatus.className = 'status-indicator offline';
        myUserId.textContent = 'Disconnected';
    });
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
    // Initialize the app when page loads
    document.addEventListener('DOMContentLoaded', initApp);
    </script>

</body>

</html>