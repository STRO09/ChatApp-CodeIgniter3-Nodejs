<?php
defined("BASEPATH") or exit("No direct script access allowed");

class AuthController extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper(["url", "cookie", "jwt"]);
        $this->load->library('form_validation');
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
        // Set validation rules
        $this->form_validation->set_rules("uname", "Username", "required|min_length[3]");
        $this->form_validation->set_rules("email", "Email", "required|valid_email");
        $this->form_validation->set_rules("password", "Password", "required|min_length[6]");
        $this->form_validation->set_rules("cpassword", "Confirm Password", "required|matches[password]");

        if ($this->form_validation->run() == false) {
            $this->load->view("Register");
            return;
        }

        $postData = [
            "username" => $this->input->post("uname"),
            "email" => $this->input->post("email"),
            "password" => $this->input->post("password"),
        ];

        // Make API request
        $response = $this->api_client->post('register', $postData);
        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            $errorMessage = isset($result['error']['message'])
                ? $result['error']['message']
                : 'Registration failed';

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
        $postData = [
            "username" => $this->input->post("uname"),
            "password" => $this->input->post("password"),
        ];

        // Make API request
        $response = $this->api_client->post('login', $postData);
        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            $errorMessage = isset($result['error']['message'])
                ? $result['error']['message']
                : 'Login failed';

            $data["error"] = $errorMessage;
            $this->load->view("Login", $data);
            return;
        }

        // Store user data in session
        if (isset($result['data']['user'])) {
            $user = $result['data']['user'];
            $this->session->set_userdata("username", $user['username']);
            $this->session->set_userdata("userId", $user['id']);
            $this->session->set_userdata("email", $user['email']);
        }

        // Store access token info for client-side
        if (isset($result['data']['accessToken'])) {
            $this->session->set_userdata("has_access_token", true);
            // Note: The actual token will be stored in localStorage on client side
            // We just set a flag here to indicate the user is authenticated
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

        if (!$email) {
            $data["error"] = "Email is required";
            $this->load->view("ForgotPassword", $data);
            return;
        }

        $postData = ["email" => $email];
        $response = $this->api_client->post('forgot-password', $postData);
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
        $response = $this->api_client->get("verify-reset-token/{$token}");
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


        $postData = [
            "token" => $token,
            "newPassword" => $password
        ];

        $response = $this->api_client->post('reset-password', $postData);
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
        // Call logout API
        $this->api_client->post('logout');

        // Clear session data
        $this->session->unset_userdata('username');
        $this->session->unset_userdata('userId');
        $this->session->unset_userdata('email');
        $this->session->unset_userdata('has_access_token');
        $this->session->sess_destroy();

        redirect('AuthController', 'refresh');
    }

    public function logoutAllDevices()
    {
        // Call logout all API
        $this->api_client->post('logout-all');

        // Clear session data
        $this->session->unset_userdata('username');
        $this->session->unset_userdata('userId');
        $this->session->unset_userdata('email');
        $this->session->unset_userdata('has_access_token');
        $this->session->sess_destroy();

        redirect('AuthController', 'refresh');
    }
}