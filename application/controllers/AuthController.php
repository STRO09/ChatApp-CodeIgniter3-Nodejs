<?php
defined("BASEPATH") or exit("No direct script access allowed");

class AuthController extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper(["url", "cookie"]);
        $this->load->library(['form_validation', 'api_client']);
    }

    // -------------------------------
    // Input Sanitization & Security
    // -------------------------------
    private function sanitizeInput($input)
    {
        // Remove potential script tags and other dangerous content
        return trim(
            preg_replace([
                '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i',
                '/<[^>]*>/',
                '/javascript:/i',
                '/on\w+\s*=/i'
            ], '', $input)
        );
    }

    private function checkForMaliciousInput($input)
    {
        $maliciousPatterns = [
            '/<script/i',
            '/<iframe/i',
            '/<object/i',
            '/<embed/i',
            '/<form/i',
            '/javascript:/i',
            '/data:/i',
            '/vbscript:/i',
            '/on\w+\s*=/i',
            '/eval\s*\(/i',
            '/alert\s*\(/i',
            '/confirm\s*\(/i',
            '/prompt\s*\(/i',
            '/document\.cookie/i',
            '/localStorage/i',
            '/sessionStorage/i',
            '/window\.location/i',
            '/\bunion\b\s+\bselect\b/i',
            '/\bdrop\b\s+\btable\b/i',
            '/--/i',
            '/;/i',
            '/\/\*/i',
            '/\*\//i',
        ];

        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        return false;
    }

    // -------------------------------
    // Validation Functions
    // -------------------------------
    private function validateUsername($username)
    {
        if (empty($username)) {
            return "Username is required";
        }

        if (strlen($username) < 3) {
            return "Username must be at least 3 characters long";
        }

        if (!preg_match('/^[a-zA-Z0-9]+$/', $username)) {
            return "Username can only contain letters and numbers";
        }

        if (!preg_match('/^(?=(?:.*[a-zA-Z]){3,}).+$/', $username)) {
            return "Username must contain at least 3 alphabets";
        }

        return true;
    }

    private function validateEmail($email)
    {
        if (empty($email)) {
            return "Email is required";
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return "Invalid email format";
        }

        return true;
    }

    private function calculatePasswordStrength($password)
    {
        $requirements = [
            'length' => strlen($password) >= 8,
            'uppercase' => preg_match('/[A-Z]/', $password),
            'lowercase' => preg_match('/[a-z]/', $password),
            'number' => preg_match('/[0-9]/', $password),
            'special' => preg_match('/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/', $password),
        ];

        $met = count(array_filter($requirements));

        if ($met >= 5)
            $strength = "strong";
        elseif ($met >= 4)
            $strength = "good";
        elseif ($met >= 3)
            $strength = "fair";
        else
            $strength = "weak";

        return ['strength' => $strength, 'requirements' => $requirements];
    }

    private function validateLoginUsername($username)
    {
        if (empty($username)) {
            return "Username or email is required";
        }

        if ($this->checkForMaliciousInput($username)) {
            return "Invalid characters detected in input";
        }

        if (strlen($username) > 254) {
            return "Username or email is too long";
        }

        // Check if it looks like an email
        $looksLikeEmail = strpos($username, '@') !== false;

        if ($looksLikeEmail && !filter_var($username, FILTER_VALIDATE_EMAIL)) {
            return "Please enter a valid email address";
        }

        if (!$looksLikeEmail) {
            if (!preg_match('/^[a-zA-Z0-9_.-]+$/', $username)) {
                return "Username can only contain letters, numbers, dots, hyphens, and underscores";
            }
            if (strlen($username) < 3) {
                return "Username must be at least 3 characters";
            }
        }

        return true;
    }

    private function validateLoginPassword($password)
    {
        if (empty($password)) {
            return "Password is required";
        }

        if ($this->checkForMaliciousInput($password)) {
            return "Invalid characters detected in input";
        }

        if (strlen($password) > 128) {
            return "Password is too long";
        }

        if (strlen($password) < 4) {
            return "Password must be at least 4 characters";
        }

        return true;
    }

    public function index()
    {
        $this->load->view("Login");
    }

    public function register()
    {
        $this->load->view("Register");
    }

    public function createUser()
    {
        $username = $this->input->post("uname");
        $email = $this->input->post("email");
        $password = $this->input->post("password");
        $cpassword = $this->input->post("cpassword");

        // Sanitize inputs
        $username = $this->sanitizeInput($username);
        $email = $this->sanitizeInput($email);
        $password = $this->sanitizeInput($password);
        $cpassword = $this->sanitizeInput($cpassword);

        // Check for malicious input
        if (
            $this->checkForMaliciousInput($username) ||
            $this->checkForMaliciousInput($email) ||
            $this->checkForMaliciousInput($password) ||
            $this->checkForMaliciousInput($cpassword)
        ) {
            $data["error"] = "Invalid characters detected in input";
            $this->load->view("Register", $data);
            return;
        }

        // Validate username
        $usernameValidation = $this->validateUsername($username);
        if ($usernameValidation !== true) {
            $data["error"] = $usernameValidation;
            $this->load->view("Register", $data);
            return;
        }

        // Validate email
        $emailValidation = $this->validateEmail($email);
        if ($emailValidation !== true) {
            $data["error"] = $emailValidation;
            $this->load->view("Register", $data);
            return;
        }

        // Check password confirmation
        if ($password !== $cpassword) {
            $data["error"] = "Passwords do not match";
            $this->load->view("Register", $data);
            return;
        }

        // Check password strength
        $passwordStrength = $this->calculatePasswordStrength($password);
        if (!in_array($passwordStrength['strength'], ['good', 'strong'])) {
            $data["error"] = "Password is too weak. Please use a stronger password.";
            $this->load->view("Register", $data);
            return;
        }

        $postData = [
            "username" => $username,
            "email" => $email,
            "password" => $password,
        ];

        // Make API request
        $response = $this->api_client->post('/api/v1/register', $postData);

        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            // Prefer API-provided error message, fallback to full response for debugging
            if (isset($result['error']['message'])) {
                $errorMessage = $result['error']['message'];
            } elseif (isset($result['message'])) {
                $errorMessage = $result['message'];
            } else {
                $errorMessage = 'Registration failed. Response: ' . json_encode($result);
            }

            $data["error"] = $errorMessage;
            $this->load->view("Register", $data);
            return;
        }

        $this->session->set_flashdata(
            'toast_success',
            'Registration successful. Please login.'
        );
        redirect("AuthController", "refresh");
    }

    public function loginUser()
{
        $uid = $this->input->post("uid");
        $password = $this->input->post("password");

        // Sanitize inputs
        $uid = $this->sanitizeInput($uid);
        $password = $this->sanitizeInput($password);

        // Check for malicious input
        // if ($this->checkForMaliciousInput($uid) || $this->checkForMaliciousInput($password)) {
        //     $data["error"] = "Invalid characters detected in input";
        //     $this->load->view("Login", $data);
        //     return;
        // }

        // Validate username
        $usernameValidation = $this->validateLoginUsername($uid);
        if ($usernameValidation !== true) {
            $data["error"] = $usernameValidation;
            $this->load->view("Login", $data);
            return;
        }

        // Validate password
        $passwordValidation = $this->validateLoginPassword($password);
        if ($passwordValidation !== true) {
            $data["error"] = $passwordValidation;
            $this->load->view("Login", $data);
            return;
        }

        // Check for common weak passwords (warning, but allow login)
        $commonWeakPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'password123', 'admin', 'letmein'];
        if (in_array(strtolower($password), $commonWeakPasswords)) {
            $this->session->set_flashdata('toast_warning', 'This password is very common and easily guessed. Consider using a stronger password.');
        }

        // Check for repeated characters (warning)
        if (preg_match('/(.)\1{3,}/', $password)) {
            $this->session->set_flashdata('toast_warning', 'Password contains too many repeated characters. Consider using a stronger password.');
        }

        $postData = [
            "uid" => $uid,
            "password" => $password,
        ];

        // Make API request
        $response = $this->api_client->post('/api/v1/login', $postData);

        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            // Prefer API-provided error message, fallback to full response for debugging
            if (isset($result['error']['message'])) {
                $errorMessage = $result['error']['message'];
            } elseif (isset($result['message'])) {
                $errorMessage = $result['message'];
            } else {
                $errorMessage = 'Login failed. Response: ' . json_encode($result);
            }

            $data["error"] = $errorMessage;
            $this->load->view("Login", $data);
            return;
        }

        // Store ONLY user info in session (for PHP template usage)
        // if (isset($result['data']['user'])) {
        //     $user = $result['data']['user'];
        //     $this->session->set_userdata("username", $user['username']);
        //     $this->session->set_userdata("userId", $user['id']);
        //     $this->session->set_userdata("email", $user['email']);
        // }
        // Store access token info for client-side
        if (isset($result['data']['accessToken'])) {
            // Set access token in an HttpOnly cookie
            set_cookie([
                "name" => "accessToken",
                "value" => $result['data']['accessToken'],
                "expire" => 15 * 60, // 15 mins
                "secure" => false,
                "httponly" => true,
                "path" => "/"
            ]);
            
            // Store access token in session for client-side to pick up (optional)
            $this->session->set_userdata("access_token", $result['data']['accessToken']);
            $this->session->set_userdata("has_access_token", true);
        }

        if (isset($result['data']['refreshToken'])) {
            // Set refresh token in an HttpOnly cookie
            set_cookie([
                "name" => "refreshToken",
                "value" => $result['data']['refreshToken'],
                "expire" => 7 * 24 * 60 * 60, // 7 days
                "secure" => false,
                "httponly" => true,
                "path" => "/"
            ]);
        }

        redirect("DashboardController");
    }

    public function forgotPassword()
    {
        $this->load->view("ForgotPassword");
    }

    public function sendResetLink()
    {
        $email = $this->input->post("email");

        // Sanitize input
        $email = $this->sanitizeInput($email);

        // Check for malicious input
        if ($this->checkForMaliciousInput($email)) {
            $data["error"] = "Invalid characters detected in input";
            $this->load->view("ForgotPassword", $data);
            return;
        }

        if (!$email) {
            $data["error"] = "Email is required";
            $this->load->view("ForgotPassword", $data);
            return;
        }
        // Validate email
        $emailValidation = $this->validateEmail($email);
        if ($emailValidation !== true) {
            $data["error"] = $emailValidation;
            $this->load->view("ForgotPassword", $data);
            return;
        }

        $response = $this->api_client->forgotPassword($email);
        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            $errorMessage = isset($result['error']['message'])
                ? $result['error']['message']
                : 'Failed to send reset link';

            $data["error"] = $errorMessage;
            $this->load->view("ForgotPassword", $data);
            return;
        }

        $this->session->set_flashdata(
            'toast_success',
            'Password reset link has been sent to your email.'
        );
        redirect("AuthController", "refresh");
    }

    public function resetPassword($token = null)
    {
        if (!$token) {
            $this->session->set_flashdata('toast_error', 'Invalid reset link');
            redirect("AuthController", "refresh");
            return;
        }

        // Verify token with backend
        $response = $this->api_client->verifyResetToken($token);
        $result = $this->api_client->handleResponse($response);

        if (!isset($result["valid"]) || !$result["valid"]) {
            $this->session->set_flashdata('toast_error', 'Invalid or expired reset link');
            redirect("AuthController", "refresh");
            return;
        }

        $data["token"] = $token;
        $this->load->view("ResetPassword", $data);
    }

    public function processResetPassword()
    {
        $token = $this->input->post("token");
        $password = $this->input->post("password");
        $cpassword = $this->input->post("cpassword");

        // Sanitize inputs
        $token = $this->sanitizeInput($token);
        $password = $this->sanitizeInput($password);
        $cpassword = $this->sanitizeInput($cpassword);

        // Check for malicious input
        if (
            $this->checkForMaliciousInput($token) ||
            $this->checkForMaliciousInput($password) ||
            $this->checkForMaliciousInput($cpassword)
        ) {
            $data["error"] = "Invalid characters detected in input";
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        if (!$token || !$password || !$cpassword) {
            $data["error"] = "All fields are required";
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        if ($password !== $cpassword) {
            $data["error"] = "Passwords do not match";
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        // Check password strength
        $passwordStrength = $this->calculatePasswordStrength($password);
        if (!in_array($passwordStrength['strength'], ['good', 'strong'])) {
            $data["error"] = "Password is too weak. Please use a stronger password.";
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        $response = $this->api_client->resetPassword($token, $password);
        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            $errorMessage = isset($result['error']['message'])
                ? $result['error']['message']
                : 'Failed to reset password';

            $data["error"] = $errorMessage;
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        $this->session->set_flashdata(
            'toast_success',
            'Password reset successful. Please login with your new password.'
        );
        redirect("AuthController", "refresh");
    }

    public function Logout()
    {
        // Call logout API (optional - can be done client-side)
        $this->api_client->logout();

        // Clear session data
        $this->session->unset_userdata('username');
        $this->session->unset_userdata('userId');
        $this->session->unset_userdata('email');
        $this->session->unset_userdata('access_token');
        $this->session->unset_userdata('has_access_token');
        $this->session->sess_destroy();
        
        // Clear cookies
        delete_cookie('accessToken');
        delete_cookie('refreshToken');

        redirect('AuthController', 'refresh');
    }

    public function logoutAllDevices()
    {
        // Call logout all API
        $this->api_client->logoutAllDevices();

        // Clear session data
        $this->session->unset_userdata('username');
        $this->session->unset_userdata('userId');
        $this->session->unset_userdata('email');
        $this->session->unset_userdata('access_token');
        $this->session->unset_userdata('has_access_token');
        $this->session->sess_destroy();

        // Clear cookies
        delete_cookie('accessToken');
        delete_cookie('refreshToken');

        redirect('AuthController', 'refresh');
    }

    public function refreshToken()
    {
        $response = $this->api_client->refreshToken();
        $result = $this->api_client->handleResponse($response);

        if ($result && isset($result['success']) && $result['success']) {
            if (isset($result['data']['accessToken'])) {
                set_cookie([
                    "name" => "accessToken",
                    "value" => $result['data']['accessToken'],
                    "expire" => 15 * 60,
                    "secure" => false,
                    "httponly" => true,
                    "path" => "/"
                ]);
                $this->session->set_userdata("access_token", $result['data']['accessToken']);
            }
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false]);
        }
    }
}