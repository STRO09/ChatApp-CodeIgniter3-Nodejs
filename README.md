# AI Chat App

A real-time messaging platform built with **CodeIgniter 3**, **Node.js**, **Socket.IO**, **MongoDB**, and **Ollama API**. The application supports direct messaging, group chats, file attachments, and an AI participant that behaves like a regular user within conversations.

---

## Overview

This project combines a traditional web application architecture with a dedicated real-time communication service to deliver low-latency messaging at scale.

Users can:

- Message any online user instantly
- Create conversations automatically when initiating a chat
- Continue conversations through the conversation history sidebar
- Participate in group chats
- Exchange file attachments
- Chat with an AI participant
- Receive real-time message delivery and updates
- Track unread messages across conversations
- Reset passwords through email verification
- Manage account credentials

---

## Repository Structure

This repository uses a branch-based organization:

| Branch | Purpose |
|----------|----------|
| `main` | Documentation and project overview |
| `frontend` | Chat application frontend |
| `backend` | CodeIgniter API, Node.js Socket.IO server, MongoDB integration, and AI services |

> The `main` branch contains only project documentation. Application source code is maintained in the dedicated frontend and backend branches.

---

## Tech Stack

### Backend

- CodeIgniter 3
- Node.js
- Socket.IO
- JWT Authentication
- Refresh Token Rotation

### Database

- MongoDB

### AI Integration

- Ollama API

### Real-Time Features

- WebSockets (Socket.IO)
- Online Presence Tracking
- Typing Indicators
- Read Receipts
- Real-Time Messaging
- Real-Time Conversation Updates

---

## Features

### Authentication & Security

- JWT-based authentication
- Refresh token authentication
- Refresh token rotation
- Secure login/logout flow
- Password reset via email verification
- Username update functionality
- Password update functionality

### Direct Messaging

- Real-time one-to-one messaging
- Automatic conversation creation when messaging a user
- Message delivery through Socket.IO
- Conversation history persistence
- Typing indicators
- Read receipts
- Unread message tracking per user

### Read State System

- Per-user conversation read tracking
- Last-seen message tracking
- Dynamic unread count calculation
- Aggregation-based unread count retrieval

### Online Users

- Dedicated online users section
- Real-time online/offline presence tracking
- Users can start conversations directly from the online list
- No friend requests or contact approval workflow
- Any online user can be messaged immediately

### Conversation History

- Separate conversation history sidebar
- Conversations remain accessible when participants go offline
- Last message previews
- Unread message counts
- Sidebar search for users and conversations

### Group Chats

- Create groups
- Add members
- Remove members
- Real-time group messaging
- Real-time group updates

### Attachments

- File attachment support
- Attachment delivery through chat messages
- Files currently stored on the application server in the `uploads/` directory

### AI User

- AI participant integrated as a first-class user
- AI conversations behave like normal user conversations
- Powered by Ollama API

### Performance Optimizations

- Designed to support conversations containing 100k+ messages
- Cursor-based pagination for efficient message loading
- Strategic compound indexing for fast retrieval
- ~50ms chat retrieval latency on large datasets
- Bulk aggregation pipeline for unread count calculation
- Eliminated N+1 query overhead across 500+ conversations

---

## Architecture Highlights

### Conversation-First Design

The application follows a lightweight conversation-first approach:

1. User selects an online user.
2. A conversation is automatically created (if one does not already exist).
3. Messages are exchanged in real time.
4. The conversation appears in the conversation history section.
5. Unread counts are calculated dynamically using per-user read-state metadata.

This eliminates the need for:

- Friend requests
- Contact management
- Manual conversation creation

### AI as a First-Class User

Instead of treating AI as a separate feature, the system models AI as a normal participant within the messaging architecture.

This allows:

- Reuse of existing messaging infrastructure
- Consistent conversation handling
- Shared unread/read-state logic
- Seamless AI-human interactions

---

## Current Limitations

- No friend/contact system
- No group roles or permissions
- No group administrators
- No message search inside conversations
- Attachments download directly without preview/open options
- No message editing
- No message deletion
- No message reactions
- No conversation archiving
- No pinned conversations
- Group ownership and moderation controls are not implemented

---

# Future Enhancements

## Messaging

- [ ] Search messages within conversations
- [ ] Message editing
- [ ] Message deletion
- [ ] Message forwarding
- [ ] Message replies
- [ ] Message reactions
- [ ] Pinned messages

## Attachments

- [ ] Image preview support
- [ ] Video preview support
- [ ] File preview support
- [ ] Drag-and-drop uploads
- [ ] Attachment thumbnails and metadata

## Groups

- [ ] Group administrators
- [ ] Role-based permissions
- [ ] Group ownership
- [ ] Owner transfer
- [ ] Group settings management
- [ ] Group avatar support
- [ ] Improved member add/remove event handling
- [ ] Robust group deletion workflow

## User Experience

- [ ] User avatars
- [ ] User profiles
- [ ] Conversation pinning
- [ ] Conversation archiving
- [ ] Notification center
- [ ] Dark mode

## Search

- [ ] Full-text message search
- [ ] Search filters
- [ ] Attachment search
- [ ] Group message search

## Security

- [ ] Device/session management
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Optional two-factor authentication

## AI Features

- [ ] AI participation in group chats
- [ ] Conversation summarization
- [ ] Smart reply suggestions
- [ ] Context-aware assistant capabilities
- [ ] Conversation insights

## Scalability

- [ ] Redis caching layer
- [ ] Distributed Socket.IO deployment
- [ ] Background job processing
- [ ] Migration from local `uploads/` storage to cloud object storage (AWS S3, MinIO, Cloudflare R2, etc.)
- [ ] Cloud object storage for attachments
- [ ] Horizontal scaling support

---

## Highlights

- Real-time messaging with Socket.IO
- AI integrated as a first-class chat participant
- JWT authentication with refresh token rotation
- Password reset via email verification
- Typing indicators and read receipts
- Cursor-based pagination
- Per-user read-state tracking
- Dynamic unread count calculation
- Optimized for 100k+ messages per conversation
- Compound indexing achieving ~50ms retrieval latency
- Aggregation-based unread count retrieval
- Elimination of N+1 query overhead across 500+ conversations

---

## Status

🚧 Active Development

Core messaging, authentication, groups, attachments, unread tracking, read receipts, typing indicators, and AI integration are functional. The next phase focuses on group permissions, message search, attachment previews, moderation controls, and advanced collaboration features.