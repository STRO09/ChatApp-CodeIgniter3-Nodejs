<?php
defined('BASEPATH') or exit('No direct script access allowed');

/**
 * API Client Library with Retry Logic and Token Management
 */
class Api_client
{
    protected $CI;
    protected $base_url;
    protected $api_version = 'v1';
    protected $max_retries = 3;
    protected $retry_delay = 1000; // milliseconds
    protected $timeout = 30;

    public function __construct()
    {
        $this->CI = &get_instance();
        $this->CI->load->helper('cookie');
        $this->base_url = $this->CI->config->item('server_origin');
    }

    /**
     * Build full API URL
     */
    private function buildUrl($endpoint)
    {
        $endpoint = ltrim($endpoint, '/');
        return "{$this->base_url}/api/{$this->api_version}/{$endpoint}";
    }

    /**
     * Get access token from localStorage (sent from frontend)
     * In practice, this should be sent in headers from the frontend
     */
    private function getAccessToken()
    {
        // For server-side requests, you might need to pass token differently
        // This is a placeholder - actual implementation depends on your architecture
        return null;
    }

    /**
     * Make HTTP request with retry logic
     */
    private function makeRequest($url, $method = 'GET', $data = null, $retryCount = 0)
    {
        $ch = curl_init();

        // Build headers
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];

        // Add authorization header if token exists
        $token = $this->getAccessToken();
        if ($token) {
            $headers[] = "Authorization: Bearer {$token}";
        }

        // Configure CURL
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_COOKIEJAR, APPPATH . 'cache/cookies.txt');
        curl_setopt($ch, CURLOPT_COOKIEFILE, APPPATH . 'cache/cookies.txt');

        // Set method and data
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        // Execute request
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        // Handle errors with retry logic
        if ($error || $httpCode >= 500) {
            if ($retryCount < $this->max_retries) {
                // Exponential backoff
                $delay = $this->retry_delay * pow(2, $retryCount);
                usleep($delay * 1000); // Convert to microseconds
                
                log_message('info', "Retrying request (attempt " . ($retryCount + 1) . "): {$url}");
                return $this->makeRequest($url, $method, $data, $retryCount + 1);
            }
            
            log_message('error', "Request failed after {$this->max_retries} retries: {$url}");
            return false;
        }

        // Handle token expiration (401)
        if ($httpCode === 401 && $retryCount === 0) {
            $responseData = json_decode($response, true);
            
            // Check if it's a token expiration error
            if (isset($responseData['error']['code']) && $responseData['error']['code'] === 1002) {
                // Try to refresh token
                if ($this->refreshToken()) {
                    // Retry original request with new token
                    return $this->makeRequest($url, $method, $data, $retryCount + 1);
                }
            }
        }

        return $response;
    }

    /**
     * Refresh access token
     */
    private function refreshToken()
    {
        $url = $this->buildUrl('refresh');
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_COOKIEJAR, APPPATH . 'cache/cookies.txt');
        curl_setopt($ch, CURLOPT_COOKIEFILE, APPPATH . 'cache/cookies.txt');

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            
            if (isset($data['success']) && $data['success'] && isset($data['data']['accessToken'])) {
                // Token refreshed successfully
                // You would need to update the token in your storage mechanism
                return true;
            }
        }

        // Refresh failed - redirect to login
        redirect('AuthController', 'refresh');
        return false;
    }

    /**
     * GET request
     */
    public function get($endpoint, $params = [])
    {
        $url = $this->buildUrl($endpoint);
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        return $this->makeRequest($url, 'GET');
    }

    /**
     * POST request
     */
    public function post($endpoint, $data = [])
    {
        $url = $this->buildUrl($endpoint);
        return $this->makeRequest($url, 'POST', $data);
    }

    /**
     * PUT request
     */
    public function put($endpoint, $data = [])
    {
        $url = $this->buildUrl($endpoint);
        return $this->makeRequest($url, 'PUT', $data);
    }

    /**
     * DELETE request
     */
    public function delete($endpoint)
    {
        $url = $this->buildUrl($endpoint);
        return $this->makeRequest($url, 'DELETE');
    }

    /**
     * Handle API response
     */
    public function handleResponse($response)
    {
        if ($response === false) {
            return [
                'success' => false,
                'error' => [
                    'message' => 'Server unreachable. Please try again later.'
                ]
            ];
        }

        $data = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => [
                    'message' => 'Invalid response from server'
                ]
            ];
        }

        return $data;
    }

    /**
     * Set custom retry configuration
     */
    public function setRetryConfig($maxRetries, $retryDelay)
    {
        $this->max_retries = $maxRetries;
        $this->retry_delay = $retryDelay;
    }

    /**
     * Set API version
     */
    public function setApiVersion($version)
    {
        $this->api_version = $version;
    }
}