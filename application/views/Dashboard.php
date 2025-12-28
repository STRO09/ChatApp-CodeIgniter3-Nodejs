<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatapp</title>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  <link rel="stylesheet" href="<?php echo base_url("assets/dashboardstyles.css") ?>">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <?php $serverorigin = $this->config->item('server_origin'); ?>

</head>

<body>
  <div class="chat-app">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">

        <div class="current-user-info">
          <div class="user-avatar" id="my-avatar-container">
            <img
              src="https://ui-avatars.com/api/?name=<?php echo urlencode($username); ?>&background=5b21b6&color=fff&bold=true"
              alt="Profile" id="my-avatar">
            <div class="user-status online" id="my-status"></div>
          </div>
          <div class="user-details">
            <h3 id="my-username"><?php echo htmlspecialchars($username); ?></h3>
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
        <h2>Welcome <?php echo htmlspecialchars($username); ?> 👋</h2>
        <p>Select a conversation from the sidebar to start chatting. You can message individual users or create group
          chats.</p>
      </div>

      <div class="chat-header-area" id="chat-header" style="display: none;cursor: pointer;">
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

      <div class="messages-container" id="chat-messages" style="display: none;">

      </div>

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
        <div class="users-list" id="available-users-list">

        </div>
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
          <img
            src="https://ui-avatars.com/api/?name=<?php echo urlencode($username); ?>&background=5b21b6&color=fff&bold=true"
            alt="Profile" id="profile-view-avatar">
        </div>

        <div class="profile-info">
          <div class="profile-field">
            <label><i class="fas fa-user"></i> Username</label>
            <span id="profile-view-username"><?php echo htmlspecialchars($username); ?></span>
          </div>
          <div class="profile-field">
            <label><i class="fas fa-id-card"></i> User ID</label>
            <span id="profile-view-userid"><?php echo htmlspecialchars($userId); ?></span>
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
          <input type="text" class="edit-form-input" id="edit-username"
            value="<?php echo htmlspecialchars($username); ?>">
        </div>

        <div class="edit-form-group">
          <label><i class="fas fa-lock"></i> Current Password</label>
          <input type="password" class="edit-form-input" id="edit-current-password" placeholder="Enter current password">
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
      serverorigin : <?= json_encode($serverorigin) ?>
    }

  </script>
  <script src="<?php echo base_url('assets/js/dashboardfunctions.js') ?>"></script>


</body>

</html>