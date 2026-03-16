<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatapp</title>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  <link rel="stylesheet" href="<?php echo base_url("assets/dashboardstyles.css") ?>">
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <?php $serverorigin = $this->config->item('server_origin'); ?>
</head>

  <script>
    function decodeJWT(token) {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(json);
    }

    const jwt = localStorage.getItem("access_token");

    if (!jwt) {
      window.location.href = "<?= site_url('AuthController') ?>";
    }

    const decodedjwt = decodeJWT(jwt);

    // ---------------------------------------------------------------
    // Pull identity from JWT claims.
    // Adjust the claim keys below to match your actual token payload
    // (e.g. decodedjwt.sub, decodedjwt.user_id, decodedjwt.name …)
    // ---------------------------------------------------------------
    const myUsername = decodedjwt.username;
    const myUserId   = decodedjwt.id;
    const isBot = decodedjwt.isBot;
    window.APP = {
      myRealUsername: myUsername,
      myRealId:       myUserId,
      isBot : isBot,
      serverorigin:   <?= json_encode($serverorigin) ?>  // server config – still requires PHP
    };

    // Populate all identity-dependent DOM nodes as soon as the
    // document is ready (avoids a flash of empty / wrong content).
    document.addEventListener("DOMContentLoaded", () => {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(myUsername)}&background=5b21b6&color=fff&bold=true`;

      // Sidebar avatar + name
      document.getElementById("my-avatar").src        = avatarUrl;
      document.getElementById("my-username").textContent = myUsername;

      // Welcome screen
      document.getElementById("welcome-heading").textContent = `Welcome ${myUsername} 👋`;

      // Profile modal
      document.getElementById("profile-view-avatar").src          = avatarUrl;
      document.getElementById("profile-view-username").textContent = myUsername;
      document.getElementById("profile-view-userid").textContent   = myUserId;

      // Edit profile modal – pre-fill username input
      document.getElementById("edit-username").value = myUsername;
    });
  </script>

<body>
  <div class="chat-app">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">

        <div class="current-user-info">
          <div class="user-avatar" id="my-avatar-container">
            <!-- src set by JS after JWT decode -->
            <img src="" alt="Profile" id="my-avatar">
            <div class="user-status online" id="my-status"></div>
          </div>
          <div class="user-details">
            <!-- text set by JS after JWT decode -->
            <h3 id="my-username"></h3>
            <p id="my-user-id">Connecting...</p>
          </div>
        </div>
        <a href="<?= site_url('AuthController/Logout') ?>" class="logout-btn">
          <i class="fas fa-sign-out-alt"></i>
          Logout
        </a>
      </div>

      <div class="search-create-container">
        <input type="text" class="search-box" placeholder="Search chats..." id="search-users">
        <button id="create-group-btn" class="create-group-btn">
          <i class="fas fa-users"></i>
          New Group
        </button>
      </div>

      <div class="chats-container">
        <!-- Online Users -->
        <div class="section-header">
          <h3>Online Now</h3>
          <span class="online-count" id="online-count" hidden="true">0</span>
        </div>
        <div class="ai-chat-entry" id="ai-chat-btn">
          <div class="ai-chat-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                fill="#6366f1" />
            </svg>
          </div>
          <div class="ai-chat-info">
            <div class="ai-chat-name">AI Assistant</div>
            <div class="ai-chat-hint">Ask me anything</div>
          </div>
        </div>
        <div class="chat-list" id="online-users-list">
          <div class="loading">Loading online users...</div>
        </div>

        <!-- All Conversations -->
        <div class="section-header">
          <h3>Recent Chats</h3>
        </div>
        <div class="chat-list" id="conversations-list">
          <div class="loading">Loading conversations...</div>
        </div>

        <!-- Group Chats -->
        <div class="section-header" id="groups-header" style="display: none;">
          <h3>Group Chats</h3>
        </div>
        <div class="chat-list" id="group-chats-list">
          <!-- Groups will be loaded here -->
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="main-chat" id="main-chat">
      <div class="welcome-screen" id="welcome-screen">
        <div class="welcome-icon">
          <i class="fas fa-comments"></i>
        </div>
        <!-- text set by JS after JWT decode -->
        <h2 id="welcome-heading">Welcome 👋</h2>
        <p>Select a conversation from the sidebar to start chatting. You can message individual users or create group
          chats.</p>
      </div>

      <div class="chat-header-area" id="chat-header" style="display: none; cursor: pointer;">
        <div class="chat-header-avatar">
          <img src="https://ui-avatars.com/api/?name=User&background=94a3b8&color=fff" alt="Profile"
            id="current-user-avatar">
        </div>
        <div class="chat-header-info">
          <h2 id="current-chat-title">Select a chat</h2>
          <p id="current-chat-status">Select a user to start chatting</p>
          <div class="typing-indicator" id="typing-indicator" style="display: none;"></div>
        </div>
      </div>

      <div class="messages-container" id="chat-messages" style="display: none;"></div>

      <div class="chat-input-area" id="chat-input-area" style="display: none;">
        <div class="file-attachment">
          <input type="file" id="attachment" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt">
          <button class="attach-btn" id="attachments">
            <i class="fas fa-paperclip"></i>
          </button>
        </div>
        <span id="file-name" class="file-name"></span>
        <input type="text" class="message-input" id="message-input" placeholder="Type your message here..." disabled>
        <button class="send-button" id="send-button" disabled>
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Group Creation Modal -->
  <div class="modal-overlay" id="group-modal" style="display: none;">
    <div class="modal">
      <div class="modal-header">
        <h3>Create New Group</h3>
        <button class="close-modal" id="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-input" id="group-name" placeholder="Enter group name (e.g., 'Project Team')">
        <div class="selected-users" id="selected-users-list">
          <div class="hint">No users selected yet</div>
        </div>
        <div class="users-list" id="available-users-list"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-group">Cancel</button>
        <button class="btn btn-primary" id="create-group-final">Create Group</button>
      </div>
    </div>
  </div>

  <!-- Profile Modal (View Only) -->
  <div class="profile-modal" id="profile-modal">
    <div class="profile-modal-content">
      <div class="profile-modal-header">
        <h3>My Profile</h3>
      </div>
      <div class="profile-modal-body">
        <div class="profile-avatar">
          <!-- src set by JS after JWT decode -->
          <img src="" alt="Profile" id="profile-view-avatar">
        </div>
        <div class="profile-info">
          <div class="profile-field">
            <label><i class="fas fa-user"></i> Username</label>
            <!-- text set by JS after JWT decode -->
            <span id="profile-view-username"></span>
          </div>
          <div class="profile-field">
            <label><i class="fas fa-id-card"></i> User ID</label>
            <!-- text set by JS after JWT decode -->
            <span id="profile-view-userid"></span>
          </div>
          <div class="profile-field">
            <label><i class="fas fa-circle"></i> Status</label>
            <span id="profile-view-status">Online</span>
          </div>
        </div>
        <div class="profile-modal-footer">
          <button class="profile-btn" id="profile-close">
            <i class="fas fa-times"></i> Close
          </button>
          <button class="profile-btn profile-btn-primary" id="profile-edit">
            <i class="fas fa-edit"></i> Edit Profile
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Profile Modal -->
  <div class="edit-modal" id="edit-modal">
    <div class="edit-modal-content">
      <div class="edit-modal-header">
        <h3>Edit Profile</h3>
      </div>
      <div class="edit-modal-body">
        <div class="edit-form-group">
          <label><i class="fas fa-user"></i> Username</label>
          <!-- value set by JS after JWT decode -->
          <input type="text" class="edit-form-input" id="edit-username" value="">
        </div>
        <div class="edit-form-group">
          <label><i class="fas fa-lock"></i> Current Password</label>
          <input type="password" class="edit-form-input" id="edit-current-password"
            placeholder="Enter current password">
          <div class="password-hint">
            <i class="fas fa-info-circle"></i>
            Required for any changes to your account
          </div>
        </div>
        <div class="edit-form-group">
          <label><i class="fas fa-key"></i> New Password (Optional)</label>
          <input type="password" class="edit-form-input" id="edit-new-password" placeholder="Enter new password">
          <div class="password-hint">
            <i class="fas fa-shield-alt"></i>
            Leave empty to keep your current password
          </div>
        </div>
        <div class="edit-form-group">
          <label><i class="fas fa-check-circle"></i> Confirm New Password</label>
          <input type="password" class="edit-form-input" id="edit-confirm-password" placeholder="Confirm new password">
        </div>
        <div class="edit-modal-footer">
          <button class="edit-btn" id="edit-cancel">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="edit-btn edit-btn-primary" id="edit-save">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.APP = {
      // Get username from PHP
      myRealUsername: <?php echo json_encode($username); ?>,
      myRealId: <?php echo json_encode($userId); ?>,

      // Socket.IO connection
      serverorigin: <?= json_encode($serverorigin) ?>
    }

    // Set access token in localStorage
    <?php if (!empty($access_token)): ?>
    localStorage.setItem('jwt_token', <?php echo json_encode($access_token); ?>);
    <?php endif; ?>

  </script>

  <script src="<?php echo base_url('assets/js/dashboardfunctions.js') ?>"></script>

</body>

</html>