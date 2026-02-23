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

        // Make API request using the library method
        $response = $this->api_client->register(
            $this->input->post("uname"),
            $this->input->post("email"),
            $this->input->post("password")
        );
        
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
        // Make API request using the library method
        $response = $this->api_client->login(
            $this->input->post("uname"),
            $this->input->post("password")
        );
        
        $result = $this->api_client->handleResponse($response);

        if (!$result['success']) {
            $errorMessage = isset($result['error']['message'])
                ? $result['error']['message']
                : 'Login failed';

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

        // Pass JWT to a view that will store it in localStorage via JavaScript
        // Then redirect to dashboard
        $data['tokenData'] = $result['data'];
        $this->load->view("LoginSuccess", $data);
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
        $this->session->sess_destroy();

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
        $this->session->sess_destroy();

        redirect('AuthController', 'refresh');
    }
}