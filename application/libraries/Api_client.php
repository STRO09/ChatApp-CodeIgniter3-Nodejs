<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Api_client
{
    protected $CI;
    protected $base_url;
    protected $max_retries = 3;
    protected $retry_delay = 1000; // ms base delay for exponential backoff
    protected $timeout = 30;

    public function __construct()
    {
        $this->CI = &get_instance();
        $this->base_url = rtrim($this->CI->config->item('server_origin'), '/');
    }

    // ─────────────────────────────────────────
    // PUBLIC AUTH ENDPOINTS
    // ─────────────────────────────────────────

    public function register($username, $email, $password)
    {
        return $this->post('/api/register', [
            'username' => $username,
            'email'    => $email,
            'password' => $password,
        ]);
    }

    public function login($username, $password)
    {
        return $this->post('/api/login', [
            'username' => $username,
            'password' => $password,
        ]);
    }

    public function forgotPassword($email)
    {
        return $this->post('/api/forgot-password', ['email' => $email]);
    }

    public function resetPassword($token, $newPassword)
    {
        return $this->post('/api/reset-password', [
            'token'       => $token,
            'newPassword' => $newPassword,
        ]);
    }

    public function verifyResetToken($token)
    {
        return $this->get("/api/verify-reset-token/{$token}");
    }

    // ─────────────────────────────────────────
    // PROTECTED AUTH ENDPOINTS
    // ─────────────────────────────────────────

    public function logout()
    {
        return $this->post('/api/logout');
    }

    public function logoutAllDevices()
    {
        return $this->post('/api/logout-all');
    }

    // ─────────────────────────────────────────
    // SESSION ENDPOINTS
    // ─────────────────────────────────────────

    public function getSessions()
    {
        return $this->get('/api/sessions');
    }

    public function revokeSession($sessionId)
    {
        return $this->delete("/api/sessions/{$sessionId}");
    }

    // ─────────────────────────────────────────
    // USER ENDPOINTS
    // ─────────────────────────────────────────

    public function getUserById($userId)
    {
        return $this->get("/api/user/{$userId}");
    }

    public function getChatUsers($userId)
    {
        return $this->get("/api/users/chat/{$userId}");
    }

    public function getAllUsers($userId)
    {
        return $this->get("/api/users/all/{$userId}");
    }

    public function updateUserStatus($userId, $status, $isOnline = null)
    {
        $payload = ['status' => $status];
        if ($isOnline !== null) {
            $payload['isOnline'] = $isOnline;
        }
        return $this->put("/api/user/{$userId}/status", $payload);
    }

    public function updateProfile($userId, $data)
    {
        return $this->post('/api/user/update-profile', array_merge(
            ['userId' => $userId],
            $data
        ));
    }

    // ─────────────────────────────────────────
    // AI ENDPOINT
    // ─────────────────────────────────────────

    public function getOrCreateAiConversation($payload)
    {
        return $this->post('/api/ai/conversation', $payload);
    }

    // ─────────────────────────────────────────
    // RESPONSE HANDLER
    // ─────────────────────────────────────────

    /**
     * Decode and normalise a raw curl response.
     * Returns an array with at least ['success' => bool, 'error' => [...]] shape.
     */
    public function handleResponse($response)
    {
        if ($response === false) {
            return $this->errorPayload('Server unreachable. Please try again later.');
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->errorPayload('Invalid JSON received from server.');
        }

        return $data;
    }

    // ─────────────────────────────────────────
    // INTERNAL HTTP HELPERS
    // ─────────────────────────────────────────

    public function get($path, $params = [])
    {
        $url = $this->base_url . $path;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        return $this->makeRequest($url, 'GET');
    }

    public function post($path, $data = [])
    {
        return $this->makeRequest($this->base_url . $path, 'POST', $data);
    }

    public function put($path, $data = [])
    {
        return $this->makeRequest($this->base_url . $path, 'PUT', $data);
    }

    public function delete($path)
    {
        return $this->makeRequest($this->base_url . $path, 'DELETE');
    }

    // ─────────────────────────────────────────
    // CORE REQUEST + RETRY ENGINE
    // ─────────────────────────────────────────

    public function makeRequest($url, $method, $data = null, $attempt = 0)
    {
        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        $token = $this->getAccessToken();
        if ($token) {
            $headers[] = "Authorization: Bearer {$token}";
        }

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_HTTPHEADER     => $headers,
            // Shared cookie jar so the httpOnly refresh-token cookie travels
            // with every server-side request automatically.
            CURLOPT_COOKIEJAR      => APPPATH . 'cache/cookies.txt',
            CURLOPT_COOKIEFILE     => APPPATH . 'cache/cookies.txt',
        ]);

        switch ($method) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if ($data !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;

            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                if ($data !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;

            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // ── Network / 5xx → exponential backoff retry ──────────────────────
        if ($curlError || $httpCode >= 500) {
            if ($attempt < $this->max_retries) {
                $delay = $this->retry_delay * pow(2, $attempt); // 1 s, 2 s, 4 s
                log_message('info', "API retry {$attempt} → {$url} (delay {$delay}ms)");
                usleep($delay * 1000);
                return $this->makeRequest($url, $method, $data, $attempt + 1);
            }

            log_message('error', "API failed after {$this->max_retries} retries: {$url}");
            return false;
        }

        // ── 401 → try one token refresh then replay ─────────────────────────
        if ($httpCode === 401 && $attempt === 0) {
            $body = json_decode($response, true);
            // Only refresh when the backend explicitly says access token is
            // expired (code 1002). Other 401s (bad creds, revoked session,
            // etc.) fall through so the caller can surface the real error.
            if (isset($body['error']['code']) && $body['error']['code'] === 1002) {
                if ($this->refreshToken()) {
                    return $this->makeRequest($url, $method, $data, $attempt + 1);
                }
                // refreshToken() already redirected to login on failure.
            }
        }

        return $response;
    }

    // ─────────────────────────────────────────
    // TOKEN HELPERS
    // ─────────────────────────────────────────

    /**
     * The PHP layer never owns the JWT long-term (that lives in the browser's
     * localStorage). After login the controller stores it in the session so
     * server-side protected calls can forward it as a Bearer token.
     */
    public function getAccessToken()
    {
        return $this->CI->session->userdata('access_token') ?: null;
    }

    /**
     * Hit POST /api/refresh. The httpOnly refresh-token cookie is forwarded
     * automatically via the shared cookie jar. On success the new JWT is
     * persisted in the session for the rest of this request cycle.
     */
    private function refreshToken()
    {
        $url = $this->base_url . '/api/refresh';

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_COOKIEJAR      => APPPATH . 'cache/cookies.txt',
            CURLOPT_COOKIEFILE     => APPPATH . 'cache/cookies.txt',
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            if (!empty($data['success']) && !empty($data['data']['accessToken'])) {
                $this->CI->session->set_userdata('access_token', $data['data']['accessToken']);
                log_message('info', 'Access token refreshed successfully.');
                return true;
            }
        }

        log_message('error', "Token refresh failed (HTTP {$httpCode}) — redirecting to login.");
        redirect('AuthController', 'refresh');
        return false;
    }

    // ─────────────────────────────────────────
    // INTERNAL UTILITIES
    // ─────────────────────────────────────────

    public function errorPayload($message)
    {
        return [
            'success' => false,
            'error'   => ['message' => $message],
        ];
    }
}