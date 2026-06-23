# Frontend Setup

This branch contains the **CodeIgniter 3 frontend** for the AI Chat App.

## Prerequisites

Install one of the following local development environments:

### XAMPP (Recommended)

- Apache
- PHP 7.4+

### Laragon

- Apache/Nginx
- PHP 7.4+

---

## Clone the Repository

```bash
git clone <repository-url>
git checkout frontend
```

---

## Project Placement

### XAMPP

Place the project inside:

```text
xampp/htdocs/
```

Example:

```text
xampp/
└── htdocs/
    └── ai-chat-frontend/
```

### Laragon

Place the project inside:

```text
laragon/www/
```

Example:

```text
laragon/
└── www/
    └── ai-chat-frontend/
```

---

## Configuration

Open:

```text
application/config/config.php
```

Update the base URL:

```php
$config['base_url'] = 'http://localhost/ai-chat-frontend/';
```

Adjust the URL if your project folder name differs.

---

## Backend Configuration

Update the frontend configuration to point to your backend services.

Example:

```env
API_URL=http://localhost:8080
SOCKET_URL=http://localhost:3000
```

Replace the URLs and ports with your actual backend configuration.

---

## Start Required Services

### Apache

Start Apache using:

- XAMPP Control Panel
- Laragon

### Backend API

Start the backend service from the `backend` branch.

### Socket.IO Server

Start the Node.js Socket.IO server from the `backend` branch.

### MongoDB

Ensure MongoDB is running.

---

## Access the Application

Open:

```text
http://localhost/ai-chat-frontend
```

or (Laragon)

```text
http://ai-chat-frontend.test
```

---

## Features

- JWT Authentication
- Refresh Token Authentication
- Refresh Token Rotation
- Password Reset via Email Verification
- Real-Time Messaging
- Online User Discovery
- Conversation History
- Group Chats
- AI Chat Integration
- Typing Indicators
- Read Receipts
- Unread Message Tracking
- User Search
- Conversation Search
- File Attachments

---

## Troubleshooting

### Real-Time Features Not Working

Verify:

- Socket.IO server is running
- Correct socket URL is configured
- Browser can reach the socket endpoint

### Login Works But Data Does Not Load

Verify:

- Backend API is running
- MongoDB is running
- API URL configuration is correct

### 404 Errors

Verify:

- Apache is running
- Project is inside the correct web root directory
- Base URL is configured correctly

---

## Development Notes

This branch contains only the CodeIgniter 3 frontend application.

The `backend` branch contains:

- REST APIs
- Node.js Socket.IO server
- MongoDB integration
- Authentication services
- AI integration
- File upload handling