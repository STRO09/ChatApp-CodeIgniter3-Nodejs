// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================
const APP_CONFIG = {
	serverOrigin: APP.serverorigin,
	myUserId: APP.myRealId,
	myUsername: APP.myRealUsername,
};

// ============================================================================
// DOM ELEMENTS - CHAT INTERFACE
// ============================================================================
const chatElements = {
	messageInput: document.getElementById("message-input"),
	sendButton: document.getElementById("send-button"),
	chatMessages: document.getElementById("chat-messages"),
	chatHeader: document.getElementById("chat-header"),
	chatInputArea: document.getElementById("chat-input-area"),
	welcomeScreen: document.getElementById("welcome-screen"),
	currentChatTitle: document.getElementById("current-chat-title"),
	currentChatStatus: document.getElementById("current-chat-status"),
	currentUserAvatar: document.getElementById("current-user-avatar"),
	typingIndicator: document.getElementById("typing-indicator"),
};

// ============================================================================
// DOM ELEMENTS - SIDEBAR & LISTS
// ============================================================================
const sidebarElements = {
	onlineUsersList: document.getElementById("online-users-list"),
	conversationsList: document.getElementById("conversations-list"),
	groupChatsList: document.getElementById("group-chats-list"),
	onlineCount: document.getElementById("online-count"),
	searchUsers: document.getElementById("search-users"),
};

// ============================================================================
// DOM ELEMENTS - USER PROFILE
// ============================================================================
const userProfileElements = {
	myUsername: document.getElementById("my-username"),
	myUserId: document.getElementById("my-user-id"),
	myAvatar: document.getElementById("my-avatar"),
	myStatus: document.getElementById("my-status"),
	myAvatarContainer: document.getElementById("my-avatar-container"),
};

// ============================================================================
// DOM ELEMENTS - PROFILE MODAL
// ============================================================================
const profileModalElements = {
	modal: document.getElementById("profile-modal"),
	close: document.getElementById("profile-close"),
	edit: document.getElementById("profile-edit"),
	viewUsername: document.getElementById("profile-view-username"),
	viewAvatar: document.getElementById("profile-view-avatar"),
};

// ============================================================================
// DOM ELEMENTS - EDIT PROFILE MODAL
// ============================================================================
const editModalElements = {
	modal: document.getElementById("edit-modal"),
	cancel: document.getElementById("edit-cancel"),
	save: document.getElementById("edit-save"),
	username: document.getElementById("edit-username"),
	currentPassword: document.getElementById("edit-current-password"),
	newPassword: document.getElementById("edit-new-password"),
	confirmPassword: document.getElementById("edit-confirm-password"),
};

// ============================================================================
// DOM ELEMENTS - GROUP CREATION
// ============================================================================
const groupModalElements = {
	modal: document.getElementById("group-modal"),
	close: document.getElementById("close-modal"),
	cancelBtn: document.getElementById("cancel-group"),
	createBtn: document.getElementById("create-group-final"),
	nameInput: document.getElementById("group-name"),
	selectedUsersList: document.getElementById("selected-users-list"),
	availableUsersList: document.getElementById("available-users-list"),
	createGroupBtn: document.getElementById("create-group-btn"),
};

// ============================================================================
// DOM ELEMENTS - FILE ATTACHMENTS
// ============================================================================
const fileElements = {
	attachmentBtn: document.getElementById("attachments"),
	attachmentInput: document.getElementById("attachment"),
	fileName: document.getElementById("file-name"),
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let currentUser = null;
let currentRoom = null;
let currentConversation = null;
let currentChatType = null; // 'private' or 'group'

let myUserData = {
	id: APP_CONFIG.myUserId,
	username: APP_CONFIG.myUsername,
	socketId: null,
};

let onlineUsers = [];
let allConversations = [];
let allUsers = [];
let typingUsers = new Set();
let typingTimer = null;
let selectedUsersForGroup = [];
let unreadCounts = {};

// ============================================================================
// SOCKET INITIALIZATION
// ============================================================================
const socket = io(APP_CONFIG.serverOrigin, {
	withCredentials: true,
});

// ============================================================================
// APP INITIALIZATION
// ============================================================================
function initApp() {
	// Set up search functionality
	sidebarElements.searchUsers.addEventListener("input", filterChats);

	// Authenticate with socket
	socket.emit("authenticate", {
		userId: myUserData.id,
		username: myUserData.username,
	});

	// Load initial data
	loadConversations();
	loadAllUsers();
	startUnreadCheck();

	// Set up event listeners
	setupEventListeners();

	console.log("App initialized for user:", myUserData.username);
}

// Initialize the app when page loads
document.addEventListener("DOMContentLoaded", initApp);

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
	setupChatEventListeners();
	setupFileEventListeners();
	setupGroupModalEventListeners();
	setupProfileEventListeners();
	setupSocketListeners();
}

function setupChatEventListeners() {
	chatElements.sendButton.addEventListener("click", sendMessage);
	chatElements.messageInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			sendMessage();
		}
	});
	chatElements.messageInput.addEventListener("input", handleTyping);
	chatElements.chatHeader.addEventListener("click", () => {
		if (currentChatType === "group") {
			showGroupManagementModal(currentConversation._id);
		}
	});
}

function setupFileEventListeners() {
	fileElements.attachmentBtn.addEventListener("click", () => {
		fileElements.attachmentInput.click();
	});
	fileElements.attachmentInput.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (file) {
			fileElements.fileName.textContent = file.name;
		} else {
			fileElements.fileName.textContent = "";
		}
	});
}

function setupGroupModalEventListeners() {
	groupModalElements.createGroupBtn.addEventListener("click", showGroupModal);
	groupModalElements.close.addEventListener(
		"click",
		() => (groupModalElements.modal.style.display = "none")
	);
	groupModalElements.cancelBtn.addEventListener(
		"click",
		() => (groupModalElements.modal.style.display = "none")
	);
	groupModalElements.createBtn.addEventListener("click", createGroup);
}

function setupProfileEventListeners() {
	// Open profile modal
	userProfileElements.myAvatarContainer.addEventListener("click", () => {
		profileModalElements.viewUsername.textContent = myUserData.username;
		profileModalElements.viewAvatar.src = userProfileElements.myAvatar.src;
		profileModalElements.modal.style.display = "flex";
	});

	// Close profile modal
	profileModalElements.close.addEventListener("click", () => {
		profileModalElements.modal.style.display = "none";
	});

	// Open edit modal from profile modal
	profileModalElements.edit.addEventListener("click", () => {
		editModalElements.username.value = myUserData.username;
		editModalElements.currentPassword.value = "";
		editModalElements.newPassword.value = "";
		editModalElements.confirmPassword.value = "";

		profileModalElements.modal.style.display = "none";
		editModalElements.modal.style.display = "flex";
	});

	// Close edit modal
	editModalElements.cancel.addEventListener("click", () => {
		editModalElements.modal.style.display = "none";
		profileModalElements.modal.style.display = "flex";
	});

	// Save changes in edit modal
	editModalElements.save.addEventListener("click", saveProfileChanges);

	// Close modals on outside click
	profileModalElements.modal.addEventListener("click", (e) => {
		if (e.target === profileModalElements.modal) {
			profileModalElements.modal.style.display = "none";
		}
	});

	editModalElements.modal.addEventListener("click", (e) => {
		if (e.target === editModalElements.modal) {
			editModalElements.modal.style.display = "none";
			profileModalElements.modal.style.display = "flex";
		}
	});
}

// ============================================================================
// SOCKET EVENT LISTENERS
// ============================================================================
function setupSocketListeners() {
	socket.on("connect", handleSocketConnect);
	socket.on("userListUpdate", handleUserListUpdate);
	socket.on("chatRoom", handleIncomingMessage);
	socket.on("userTyping", handleUserTyping);
	socket.on("connect_error", handleConnectionError);
}

function handleSocketConnect() {
	myUserData.socketId = socket.id;
	userProfileElements.myUserId.textContent = `ID: ${myUserData.id.substring(
		0,
		8
	)}...`;
	userProfileElements.myStatus.className = "user-status online";

	console.log("Connected to socket with ID:", socket.id);
}

function handleUserListUpdate(users) {
	console.log("Online users updated:", users);
	onlineUsers = users;

	renderRecentChats(); 
	updateOnlineUsersDisplay(); 
	updateUserStatusInLists(); 
}

function handleIncomingMessage(data) {
	console.log("New message received via socket");

	// Check if this message is for the current conversation
	if (
		currentConversation &&
		currentConversation._id === data.message.conversationId
	) {
		// Message is for current conversation
		if (data.senderId !== myUserData.id) {
			displayMessage(data.message, false, data.message.isGroup || false);
			chatElements.chatMessages.scrollTop =
				chatElements.chatMessages.scrollHeight;

			// Update conversation in sidebar
			updateConversationLastMessage(currentConversation._id, data.message);

			// Mark as read automatically since we're viewing it
			markConversationAsRead(currentConversation._id);
		}
	} else {
		// Message is for another conversation
		if (data.senderId !== myUserData.id) {
			const conversationId = data.message.conversationId;

			// Update unread count
			incrementUnreadCount(conversationId);

			// Update conversation last message in sidebar if it exists
			updateConversationLastMessage(conversationId, data.message);

			// Update document title to show notification
			updateDocumentTitle();

			console.log(`Unread message in conversation ${conversationId}`);
		}
	}
}

function handleUserTyping(data) {
	if (data.room === currentRoom) {
		if (data.isTyping) {
			typingUsers.add(data.username);
		} else {
			typingUsers.delete(data.username);
		}
		updateTypingIndicator();
	}
}

function handleConnectionError(err) {
	console.log("Connection failed:", err.message);
	userProfileElements.myUserId.textContent = `Connection error...`;
}

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================
async function saveProfileChanges() {
	const newUsername = editModalElements.username.value.trim();
	const currentPassword = editModalElements.currentPassword.value;
	const newPassword = editModalElements.newPassword.value;
	const confirmPassword = editModalElements.confirmPassword.value;

	// Validate passwords if changing
	if (newPassword && !currentPassword) {
		alert("Please enter current password to change password");
		return;
	}

	if (newPassword && newPassword !== confirmPassword) {
		alert("New passwords do not match");
		return;
	}

	if (newPassword && newPassword.length < 6) {
		alert("Password must be at least 6 characters");
		return;
	}

	try {
		console.log({
			userId: myUserData.id,
			username: newUsername,
			currentPassword: currentPassword,
			newPassword: newPassword || null,
		});
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/user/update-profile`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: myUserData.id,
					username: newUsername,
					currentPassword: currentPassword,
					newPassword: newPassword || null,
				}),
			}
		);

		const data = await response.json();

		if (data.success) {
			// Update user data
			myUserData.username = newUsername;
			// Update UI
			userProfileElements.myUsername.textContent = newUsername;
			profileModalElements.viewUsername.textContent = newUsername;
			userProfileElements.myAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
				newUsername
			)}&background=6366f1&color=fff&bold=true`;
			profileModalElements.viewAvatar.src = userProfileElements.myAvatar.src;

			// Notify socket server
			socket.emit("usernameUpdate", {
				userId: myUserData.id,
				newUsername: newUsername,
			});

			// Close modals
			editModalElements.modal.style.display = "none";
			profileModalElements.modal.style.display = "none";

			alert("Profile updated successfully!");
		} else {
			alert(data.error || "Failed to update profile");
		}
	} catch (err) {
		console.error("Error updating profile:", err);
		alert("Error updating profile");
	}
}

// ============================================================================
// CONVERSATION DATA LOADING
// ============================================================================
async function loadConversations() {
	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/${myUserData.id}/conversations`
		);
		const data = await response.json();

		if (data.conversations && data.conversations.length > 0) {
			allConversations = data.conversations;

			// Initialize unread counts from server
			data.conversations.forEach((conv) => {
				if (conv.unreadCount > 0) {
					unreadCounts[conv._id] = conv.unreadCount;
				}
			});

			// Update document title
			updateDocumentTitle();

			renderRecentChats();

			// Load groups separately
			loadGroups();
		} else {
			sidebarElements.conversationsList.innerHTML =
				'<div class="no-chats">No conversations yet</div>';
		}
	} catch (err) {
		console.error("Error loading conversations:", err);
		sidebarElements.conversationsList.innerHTML =
			'<div class="error">Error loading conversations</div>';
	}
}

async function loadGroups() {
	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/${myUserData.id}/groups`
		);
		const data = await response.json();

		if (data.groups && data.groups.length > 0) {
			displayGroups(data.groups);
			document.getElementById("groups-header").style.display = "block";

			// Initialize unread counts for groups from server
			data.groups.forEach((group) => {
				if (group.unreadCount > 0) {
					unreadCounts[group._id] = group.unreadCount;
				}
			});

			// Update document title
			updateDocumentTitle();
		}
	} catch (err) {
		console.error("Error loading groups:", err);
	}
}

async function loadAllUsers() {
	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/users/chat/${myUserData.id}`
		);
		const data = await response.json();

		if (data.users && data.users.length > 0) {
			allUsers = data.users;
		}
	} catch (err) {
		console.error("Error loading all users:", err);
	}
}

async function loadChatHistory(conversationId) {
	chatElements.chatMessages.innerHTML = "";

	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/messages/${conversationId}?userId=${myUserData.id}`
		);
		const messages = await response.json();

		var isGroup = messages.isGroup;

		console.log("history data", messages);

		if (messages.messages.length === 0) {
			const welcomeMsg = document.createElement("div");
			welcomeMsg.className = "message received";
			welcomeMsg.innerHTML = `
        <div class="message-content">
          Start your conversation with ${currentUser.username}! Send your first message.
        </div>
        <div class="message-time">Just now</div>
      `;
			chatElements.chatMessages.appendChild(welcomeMsg);
		} else {
			messages.messages.forEach((msg) => {
				displayMessage(msg, msg.sender._id === myUserData.id, isGroup);
			});
		}

		chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;
	} catch (err) {
		console.error("Error loading chat history:", err);
	}
}

// ============================================================================
// CONVERSATION DISPLAY & UI
// ============================================================================
function renderRecentChats() {
	console.log("Rendering Recent Chats...");
	sidebarElements.conversationsList.innerHTML = "";

	// Create Set of online user IDs for fast lookup
	const onlineUserIds = new Set(
		onlineUsers
			.filter(u => u.userId !== myUserData.id)
			.map(u => u.userId)
	);

	console.log("Online user IDs:", Array.from(onlineUserIds));

	// Filter to only show OFFLINE users in Recent Chats
	const offlineConversations = allConversations.filter((conv) => {
		if (conv.isGroup) return false; // Skip groups
		
		const otherParticipant = conv.participants?.find(
			(p) => p._id !== myUserData.id
		);
		
		if (!otherParticipant) return false;
		
		// Only show if user is OFFLINE
		const isOnline = onlineUserIds.has(otherParticipant._id);
		console.log(`User ${otherParticipant.username}: online=${isOnline}`);
		
		return !isOnline; // Show only offline users
	});

	console.log(`Showing ${offlineConversations.length} offline conversations`);

	if (offlineConversations.length === 0) {
		sidebarElements.conversationsList.innerHTML =
			'<div class="no-chats">No offline conversations</div>';
		return;
	}

	// Render each offline conversation
	offlineConversations.forEach((conv) => {
		const otherParticipant = conv.participants?.find(
			(p) => p._id !== myUserData.id
		);
		
		if (otherParticipant) {
			const unreadCount = conv.unreadCount || unreadCounts[conv._id] || 0;

			const conversationItem = createConversationItem({
				id: conv._id,
				name: otherParticipant.username,
				avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
					otherParticipant.username
				)}&background=random&color=fff`,
				lastMessage: conv.lastMessage?.text || "Start chatting",
				time: formatTime(conv.updatedAt),
				type: "private",
				userId: otherParticipant._id,
				isOnline: false, // Always offline in Recent Chats
				unread: unreadCount,
			});

			sidebarElements.conversationsList.appendChild(conversationItem);
		}
	});
}

function displayGroups(groups) {
	sidebarElements.groupChatsList.innerHTML = "";

	groups.forEach((group) => {
		const unreadCount = group.unreadCount || 0;

		// Store in global unread counts
		if (unreadCount > 0) {
			unreadCounts[group._id] = unreadCount;
		}

		const groupItem = createConversationItem({
			id: group._id,
			name: group.groupName,
			avatar:
				group.groupImage ||
				`https://ui-avatars.com/api/?name=${encodeURIComponent(
					group.groupName
				)}&background=6366f1&color=fff`,
			lastMessage: group.lastMessage?.text || "No messages yet",
			time: formatTime(group.updatedAt),
			type: "group",
			participantsCount: group.participants?.length || 0,
			unread: unreadCount,
		});

		sidebarElements.groupChatsList.appendChild(groupItem);
	});
}

function createConversationItem(data) {
	const item = document.createElement("div");
	item.className = `chat-item ${(data.unread || 0) > 0 ? "unread" : ""}`;
	item.dataset.id = data.id;
	item.dataset.type = data.type;
	item.dataset.userId = data.userId || "";

	// Show unread badge if count > 0
	const unreadBadgeHTML =
		(data.unread || 0) > 0
			? `<div class="unread-badge">${
					data.unread > 99 ? "99+" : data.unread
			  }</div>`
			: "";

	item.innerHTML = `
  <div class="chat-avatar ${data.type === "group" ? "group" : ""}">
    <img src="${data.avatar}" alt="${data.name}">
    ${
			data.type === "private"
				? `<div class="chat-status ${
						data.isOnline ? "online" : "offline"
				  }"></div>`
				: ""
		}
  </div>
  <div class="chat-info">
    <div class="chat-header">
      <div class="chat-name">${data.name}</div>
      <div class="chat-time">${data.time}</div>
    </div>
    <div class="last-message">${data.lastMessage}</div>
    ${
			data.type === "group"
				? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${data.participantsCount} members</div>`
				: ""
		}
  </div>
  ${unreadBadgeHTML}
  `;

	item.addEventListener("click", () => {
		selectConversation(data);
	});

	return item;
}

async function selectConversation(data) {
	// Remove active class from all items
	document
		.querySelectorAll(".chat-item")
		.forEach((item) => item.classList.remove("active"));
	event.currentTarget.classList.add("active");

	// Hide welcome screen, show chat
	chatElements.welcomeScreen.style.display = "none";
	chatElements.chatHeader.style.display = "flex";
	chatElements.chatMessages.style.display = "block";
	chatElements.chatInputArea.style.display = "flex";

	// Set current conversation data
	currentChatType = data.type;

	if (data.type === "private") {
		// Private chat
		currentUser = {
			id: data.userId,
			username: data.name,
			avatar: data.avatar,
		};

		chatElements.currentChatTitle.textContent = data.name;
		chatElements.currentChatStatus.textContent = data.isOnline
			? "Online"
			: "Offline";
		chatElements.currentChatStatus.innerHTML = data.isOnline
			? '<i class="fas fa-circle" style="color: #10b981; font-size: 10px;"></i> Online'
			: '<i class="fas fa-circle" style="color: #94a3b8; font-size: 10px;"></i> Offline';

		// Get or create conversation
		try {
			const response = await fetch(
				`${APP_CONFIG.serverOrigin}/api/conversation`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId1: myUserData.id,
						userId2: data.userId,
					}),
				}
			);

			const convData = await response.json();
			currentConversation = convData.conversation;
			currentRoom = currentConversation.roomName;
		} catch (err) {
			console.error("Error getting conversation:", err);
			return;
		}
	} else {
		// Group chat
		currentUser = {
			id: data.id,
			username: data.name,
			avatar: data.avatar,
			isGroup: true,
		};

		chatElements.currentChatTitle.textContent = data.name;
		chatElements.currentChatStatus.textContent = `${data.participantsCount} members`;
		chatElements.currentChatStatus.innerHTML = `<i class="fas fa-users" style="color: #6366f1;"></i> ${data.participantsCount} members`;

		currentConversation = { _id: data.id, roomName: `group_${data.id}` };
		currentRoom = `group_${data.id}`;
	}

	// Update avatar
	chatElements.currentUserAvatar.src = data.avatar;

	// Join socket room
	socket.emit("joinRoom", {
		roomName: currentRoom,
		username: myUserData.username,
		id: myUserData.id,
	});

	// Mark conversation as read
	await markConversationAsRead(currentConversation._id);

	// Enable message input
	chatElements.messageInput.disabled = false;
	chatElements.sendButton.disabled = false;
	chatElements.messageInput.focus();

	// Load chat history
	loadChatHistory(currentConversation._id);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================
async function sendMessage() {
	const message = chatElements.messageInput.value.trim();
	const file = fileElements.attachmentInput.files[0];

	if (!message && !file) return;

	if (!currentConversation) {
		alert("Please select a conversation first");
		return;
	}

	const formData = new FormData();
	formData.append("text", message);
	formData.append("senderId", myUserData.id);
	formData.append("conversationId", currentConversation._id);

	if (file) {
		formData.append("file", file);
	}

	try {
		const response = await fetch(`${APP_CONFIG.serverOrigin}/api/messages`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const savedMessage = await response.json();

		// Display the sent message immediately
		displayMessage(savedMessage, true, savedMessage.isGroup || false);

		// Emit socket event with conversationId
		socket.emit("chatRoom", {
			room: currentRoom,
			senderId: myUserData.id,
			message: savedMessage,
			conversationId: currentConversation._id,
		});

		// Clear inputs
		chatElements.messageInput.value = "";
		fileElements.attachmentInput.value = "";
		fileElements.fileName.textContent = "";

		// Scroll to bottom
		chatElements.chatMessages.scrollTop = chatElements.chatMessages.scrollHeight;

		// Update conversation list
		updateConversationLastMessage(currentConversation._id, savedMessage);
	} catch (err) {
		console.error("Error sending message:", err);
		alert("Error sending message");
	}
}

function displayMessage(msg, isSent, isGroup = false) {
	const messageDiv = document.createElement("div");
	messageDiv.className = `message ${isSent ? "sent" : "received"}`;

	let content = `<div class="message-content">
    ${
			msg.isGroup === true || isGroup === true
				? `<span class="username">${msg.sender.username}:</span>`
				: ""
		}
    ${msg.text || ""}
  </div>`;

	// Add attachments if present
	if (msg.attachments && msg.attachments.length > 0) {
		msg.attachments.forEach((att) => {
			const secureUrl = `${APP_CONFIG.serverOrigin}/api/messages/file/${msg._id}/${att.fileUrl}?userId=${myUserData.id}`;

			if (att.fileType.startsWith("image/")) {
				content += `<div class="attachment"><img src="${secureUrl}" alt="${att.fileName}"></div>`;
			} else if (att.fileType.startsWith("video/")) {
				content += `<div class="attachment"><video controls><source src="${secureUrl}" type="${att.fileType}"></video></div>`;
			} else {
				content += `<a href="${secureUrl}" target="_blank" class="attachment-file">
          <i class="fas fa-file"></i>
          <span>${att.fileName}</span>
        </a>`;
			}
		});
	}

	const time = new Date(msg.createdAt).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
	content += `<div class="message-time">${time}</div>`;

	messageDiv.innerHTML = content;
	chatElements.chatMessages.appendChild(messageDiv);
}

function handleTyping() {
	if (currentRoom) {
		socket.emit("typing", {
			room: currentRoom,
			username: myUserData.username,
			isTyping: true,
		});

		if (typingTimer) clearTimeout(typingTimer);

		typingTimer = setTimeout(() => {
			socket.emit("typing", {
				room: currentRoom,
				username: myUserData.username,
				isTyping: false,
			});
		}, 1000);
	}
}

function updateTypingIndicator() {
	if (typingUsers.size > 0) {
		const names = Array.from(typingUsers);
		const text =
			names.length === 1
				? `${names[0]} is typing...`
				: `${names.length} people are typing...`;
		chatElements.typingIndicator.textContent = text;
		chatElements.typingIndicator.style.display = "block";
	} else {
		chatElements.typingIndicator.style.display = "none";
	}
}

// ============================================================================
// GROUP CHAT MANAGEMENT
// ============================================================================
async function showGroupModal() {
	selectedUsersForGroup = [];
	groupModalElements.nameInput.value = "";
	groupModalElements.selectedUsersList.innerHTML =
		'<div class="hint">No users selected yet</div>';
	groupModalElements.availableUsersList.innerHTML = "";

	// Load available users
	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/users/all/${myUserData.id}`
		);
		const data = await response.json();

		if (data.users && data.users.length > 0) {
			data.users.forEach((user) => {
				if (user._id !== myUserData.id) {
					const userItem = createUserSelectItem(user);
					groupModalElements.availableUsersList.appendChild(userItem);
				}
			});
		}
	} catch (err) {
		console.error("Error loading users for group:", err);
		groupModalElements.availableUsersList.innerHTML =
			'<div class="error">Error loading users</div>';
	}

	groupModalElements.modal.style.display = "flex";
}

function createUserSelectItem(user) {
	const item = document.createElement("div");
	item.className = "user-select-item";
	item.dataset.userId = user._id;

	item.innerHTML = `
    <img src="${
			user.avatar ||
			`https://ui-avatars.com/api/?name=${encodeURIComponent(
				user.username
			)}&background=random&color=fff`
		}" alt="${user.username}">
    <div class="user-select-info">
      <h4 style="text-transform:capitalize">${user.username}</h4>
      <p>${user.isOnline ? "Online" : "Offline"}</p>
    </div>
    <div class="user-checkbox">
      <i class="fas fa-check"></i>
    </div>
  `;

	item.addEventListener("click", () => {
		toggleUserSelection(user, item);
	});

	return item;
}

function toggleUserSelection(user, item) {
	const userId = user._id;
	const index = selectedUsersForGroup.indexOf(userId);

	if (index === -1) {
		// Select user
		selectedUsersForGroup.push(userId);
		item.classList.add("selected");

		// Add to selected users list
		const selectedUserEl = document.createElement("div");
		selectedUserEl.className = "selected-user";
		selectedUserEl.dataset.userId = userId;
		selectedUserEl.innerHTML = `
      ${user.username}
      <span class="remove-user" onclick="removeUserFromGroup('${userId}')">&times;</span>
    `;

		// Remove hint if present
		const hint = groupModalElements.selectedUsersList.querySelector(".hint");
		if (hint) hint.remove();

		groupModalElements.selectedUsersList.appendChild(selectedUserEl);
	} else {
		// Deselect user
		selectedUsersForGroup.splice(index, 1);
		item.classList.remove("selected");

		// Remove from selected users list
		const selectedUserEl = groupModalElements.selectedUsersList.querySelector(
			`[data-user-id="${userId}"]`
		);
		if (selectedUserEl) selectedUserEl.remove();

		// Add hint if no users selected
		if (selectedUsersForGroup.length === 0) {
			groupModalElements.selectedUsersList.innerHTML =
				'<div class="hint">No users selected yet</div>';
		}
	}
}

window.removeUserFromGroup = function (userId) {
	selectedUsersForGroup = selectedUsersForGroup.filter((id) => id !== userId);

	// Update selected users list
	const selectedUserEl = groupModalElements.selectedUsersList.querySelector(
		`[data-user-id="${userId}"]`
	);
	if (selectedUserEl) selectedUserEl.remove();

	// Update user select item
	const userItem = groupModalElements.availableUsersList.querySelector(
		`[data-user-id="${userId}"]`
	);
	if (userItem) userItem.classList.remove("selected");

	// Add hint if no users selected
	if (selectedUsersForGroup.length === 0) {
		groupModalElements.selectedUsersList.innerHTML =
			'<div class="hint">No users selected yet</div>';
	}
};

async function createGroup() {
	const groupName = groupModalElements.nameInput.value.trim();

	if (!groupName) {
		alert("Please enter a group name");
		return;
	}

	if (selectedUsersForGroup.length < 1) {
		alert("Please select at least one user for the group");
		return;
	}

	try {
		const response = await fetch(`${APP_CONFIG.serverOrigin}/api/group`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: groupName,
				participants: selectedUsersForGroup,
				admin: myUserData.id,
				isGroup: true,
			}),
		});

		const data = await response.json();

		if (data.success) {
			// Close modal
			groupModalElements.modal.style.display = "none";

			// Reload groups
			loadGroups();

			// Show success message
			alert("Group created successfully!");

			// Optionally, automatically select the new group
			if (data.conversation && data.conversation._id) {
				setTimeout(() => {
					loadGroups();
				}, 1000);
			}
		} else {
			alert("Error creating group: " + (data.error || "Unknown error"));
		}
	} catch (err) {
		console.error("Error creating group:", err);
		alert("Error creating group: " + err.message);
	}
}

function showGroupManagementModal(conversationId) {
	// Fetch group details
	fetch(`${APP_CONFIG.serverOrigin}/api/conversation/${conversationId}`)
		.then((res) => res.json())
		.then((group) => {
			const modal = document.createElement("div");
			modal.className = "modal-overlay";
			modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>Manage Group: ${group.groupName}</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <h4>Members</h4>
            <ul id="members-list">
              ${group.participants
								.map(
									(u) => `
                <li class="member-item">
                  <span class="member-name">${u.username}</span>
                  <button class="remove-user btn btn-secondary" data-id="${u._id}">Remove</button>
                </li>
              `
								)
								.join("")}
            </ul>
            <h4>Add User</h4>
            <div class="add-user-row">
              <input type="text" id="new-user-id" placeholder="Enter Username">
              <button id="add-user-btn" class="btn btn-primary">Add</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" id="delete-group-btn">Delete Group</button>
          </div>
        </div>
      `;
			document.body.appendChild(modal);

			// Close modal
			modal
				.querySelector(".close-modal")
				.addEventListener("click", () => modal.remove());

			const membersList = modal.querySelector("#members-list");

			// Remove user
			modal.querySelectorAll(".remove-user").forEach((btn) => {
				btn.addEventListener("click", () => {
					const userId = btn.dataset.id;
					fetch(`${APP_CONFIG.serverOrigin}/api/group/remove`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ conversationId, userId }),
					})
						.then((res) => res.json())
						.then((updated) => {
							membersList.innerHTML = updated.conversation.participants
								.map(
									(u) => `
              <li class="member-item">
                <span class="member-name">${u.username}</span>
                <button class="remove-user btn btn-secondary" data-id="${u._id}">Remove</button>
              </li>
            `
								)
								.join("");

							membersList.querySelectorAll(".remove-user").forEach((newBtn) => {
								newBtn.addEventListener("click", () => {
									const uid = newBtn.dataset.id;
									fetch(`${APP_CONFIG.serverOrigin}/api/group/remove`, {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ conversationId, userId: uid }),
									}).then(() => showGroupManagementModal(conversationId));
								});
							});
						});
				});
			});

			// Add user
			modal.querySelector("#add-user-btn").addEventListener("click", () => {
				const userName = document.getElementById("new-user-id").value.trim();
				if (!userName) return;
				fetch(`${APP_CONFIG.serverOrigin}/api/group/add`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ conversationId, userName }),
				})
					.then((res) => res.json())
					.then((updated) => {
						membersList.innerHTML = updated.conversation.participants
							.map(
								(u) => `
            <li class="member-item">
              <span class="member-name">${u.username}</span>
              <button class="remove-user btn btn-secondary" data-id="${u._id}">Remove</button>
            </li>
          `
							)
							.join("");
					});
			});

			// Delete group with confirmation
			modal.querySelector("#delete-group-btn").addEventListener("click", () => {
				if (
					confirm(
						"Are you sure you want to delete this group? This action cannot be undone."
					)
				) {
					fetch(`${APP_CONFIG.serverOrigin}/api/group/${conversationId}`, {
						method: "DELETE",
					}).then(() => {
						alert("Group deleted successfully");
						modal.remove();
						location.reload();
					});
				}
			});
		});
}

// ============================================================================
// UNREAD MESSAGES MANAGEMENT
// ============================================================================
function incrementUnreadCount(conversationId) {
	let currentCount = unreadCounts[conversationId] || 0;
	currentCount++;
	unreadCounts[conversationId] = currentCount;
	updateUnreadBadge(conversationId, currentCount);
}

function clearUnreadCount(conversationId) {
	unreadCounts[conversationId] = 0;
	updateUnreadBadge(conversationId, 0);
}

function updateUnreadBadge(conversationId, count) {
	const conversationItem = document.querySelector(
		`.chat-item[data-id="${conversationId}"]`
	);
	if (conversationItem) {
		let unreadBadge = conversationItem.querySelector(".unread-badge");

		if (count > 0) {
			conversationItem.classList.add("unread");
			if (!unreadBadge) {
				unreadBadge = document.createElement("div");
				unreadBadge.className = "unread-badge";
				conversationItem.appendChild(unreadBadge);
			}
			unreadBadge.textContent = count > 99 ? "99+" : count;
		} else {
			conversationItem.classList.remove("unread");
			if (unreadBadge) {
				unreadBadge.remove();
			}
		}
	}
}

function updateDocumentTitle() {
	let totalUnread = 0;
	Object.values(unreadCounts).forEach((count) => {
		totalUnread += count;
	});

	if (totalUnread > 0) {
		document.title = `(${totalUnread}) Chatapp`;
	} else {
		document.title = "Chatapp";
	}
}

async function markConversationAsRead(conversationId) {
	try {
		const response = await fetch(
			`${APP_CONFIG.serverOrigin}/api/conversation/${conversationId}/read`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: myUserData.id }),
			}
		);

		if (response.ok) {
			clearUnreadCount(conversationId);
			updateDocumentTitle();
		}
	} catch (err) {
		console.error("Error marking conversation as read:", err);
	}
}

function startUnreadCheck() {
	// Check for unread messages every 30 seconds
	setInterval(async () => {
		try {
			const response = await fetch(
				`${APP_CONFIG.serverOrigin}/api/unread/${myUserData.id}`
			);
			const data = await response.json();

			// Update total unread count in document title
			if (data.totalUnread > 0) {
				document.title = `(${data.totalUnread}) Chatapp`;
			} else {
				document.title = "Chatapp";
			}
		} catch (err) {
			console.error("Error checking unread messages:", err);
		}
	}, 30000);
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================
function updateOnlineUsersDisplay() {
	sidebarElements.onlineUsersList.innerHTML = "";
	sidebarElements.onlineCount.textContent = onlineUsers.length;

	if (onlineUsers.length === 0) {
		sidebarElements.onlineUsersList.innerHTML =
			'<div class="no-users">No users online</div>';
		return;
	}

	// Filter out current user
	const otherUsers = onlineUsers.filter((u) => u.userId !== myUserData.id);

	if (otherUsers.length === 0) {
		sidebarElements.onlineUsersList.innerHTML =
			'<div class="no-users">No other users online</div>';
		return;
	}

	otherUsers.forEach((user) => {
		// Find if there's a conversation with this user
		const existingConv = allConversations.find(
			(conv) =>
				!conv.isGroup && conv.participants.some((p) => p._id === user.userId)
		);

		const unreadCount = existingConv ? unreadCounts[existingConv._id] || 0 : 0;

		const userItem = createConversationItem({
			id: existingConv ? existingConv._id : `online_${user.userId}`,
			name: user.username,
			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
				user.username
			)}&background=10b981&color=fff`,
			lastMessage: "Click to chat",
			time: "Online",
			type: "private",
			userId: user.userId,
			isOnline: true,
			unread: unreadCount,
		});

		sidebarElements.onlineUsersList.appendChild(userItem);
	});
}

function updateUserStatusInLists() {
	document
		.querySelectorAll('.chat-item[data-type="private"]')
		.forEach((item) => {
			const userId = item.dataset.userId;
			const isOnline = onlineUsers.some((u) => u.userId === userId);
			const statusEl = item.querySelector(".chat-status");

			if (statusEl) {
				statusEl.className = `chat-status ${isOnline ? "online" : "offline"}`;
			}

			// Update time display for online users
			const timeEl = item.querySelector(".chat-time");
			if (timeEl && isOnline) {
				timeEl.textContent = "Online";
			}
		});
}

function updateConversationLastMessage(conversationId, message) {
	const conversationItem = document.querySelector(
		`.chat-item[data-id="${conversationId}"]`
	);
	if (conversationItem) {
		const lastMessageEl = conversationItem.querySelector(".last-message");
		const timeEl = conversationItem.querySelector(".chat-time");

		if (lastMessageEl) {
			lastMessageEl.textContent = message.text || "Attachment";
		}
		if (timeEl) {
			timeEl.textContent = formatTime(message.createdAt);
		}
	}
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function filterChats() {
	const searchTerm = sidebarElements.searchUsers.value.toLowerCase();
	const allChatItems = document.querySelectorAll(".chat-item");

	allChatItems.forEach((item) => {
		const chatName = item.querySelector(".chat-name").textContent.toLowerCase();
		if (chatName.includes(searchTerm)) {
			item.style.display = "flex";
		} else {
			item.style.display = "none";
		}
	});
}

function formatTime(dateString) {
	if (!dateString) return "";

	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now - date;
	const diffMins = Math.floor(diffMs / (1000 * 60));

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}