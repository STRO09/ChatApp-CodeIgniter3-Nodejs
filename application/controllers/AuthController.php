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
        } else {
            $serverorigin = $this->config->item('server_origin');
            $url = $serverorigin . "/api/register";
            
            $data = [
                "username" => $this->input->post("uname"),
                "email" => $this->input->post("email"),
                "password" => $this->input->post("password"),
            ];

            $response = $this->curl_library->simple_post($url, $data);

            if ($response === false || empty($response)) {
                $data["error"] = "Auth server unreachable";
                $this->load->view("Register", $data);
                return;
            }

            $res = json_decode($response, true);

            if (isset($res["error"])) {
                $data["error"] = $res["error"];
                $this->load->view("Register", $data);
                return;
            }

            $this->session->set_flashdata(
                'toast_success',
                'Registration successful. Please login.'
            );
            redirect("AuthController", "refresh");
        }
    }

    public function loginUser()
    {
        $serverorigin = $this->config->item('server_origin');
        $url = $serverorigin . "/api/login";
        
        $data = [
            "username" => $this->input->post("uname"),
            "password" => $this->input->post("password"),
        ];

        $response = $this->curl_library->simple_post($url, $data);

        if ($response === false || empty($response)) {
            $data["error"] = "Auth server unreachable";
            $this->load->view("Login", $data);
            return;
        }

        $res = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $data["error"] = $response;
            $this->load->view("Login", $data);
            return;
        }

        if (isset($res["token"])) {
            $token = $res["token"];
            $payload = decode_jwt($token);

            if ($payload && isset($payload["username"])) {
                $this->session->set_userdata("username", $payload["username"]);
                $this->session->set_userdata("userId", $payload["id"]);
                if (isset($payload["email"])) {
                    $this->session->set_userdata("email", $payload["email"]);
                }
            }

            set_cookie([
                "name" => "jwt_token",
                "value" => $res["token"],
                "expire" => 7 * 24 * 60 * 60,
                "secure" => false,
                "httponly" => true,
            ]);

            redirect("DashboardController");
            return;
        }

        $data["error"] = isset($res["error"]) ? $res["error"] : "Login Failed!";
        $this->load->view("Login", $data);
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

        $serverorigin = $this->config->item('server_origin');
        $url = $serverorigin . "/api/forgot-password";
        
        $postData = ["email" => $email];
        $response = $this->curl_library->simple_post($url, $postData);

        if ($response === false || empty($response)) {
            $data["error"] = "Server unreachable. Please try again later.";
            $this->load->view("ForgotPassword", $data);
            return;
        }

        $res = json_decode($response, true);

        if (isset($res["error"])) {
            $data["error"] = $res["error"];
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
        $serverorigin = $this->config->item('server_origin');
        $url = $serverorigin . "/api/verify-reset-token/" . $token;
        
        $response = $this->curl_library->simple_get($url);

        if ($response === false || empty($response)) {
            $this->session->set_flashdata('toast_error', 'Server unreachable');
            redirect("AuthController", "refresh");
            return;
        }

        $res = json_decode($response, true);

        if (!isset($res["valid"]) || !$res["valid"]) {
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

        $serverorigin = $this->config->item('server_origin');
        $url = $serverorigin . "/api/reset-password";
        
        $postData = [
            "token" => $token,
            "newPassword" => $password
        ];

        $response = $this->curl_library->simple_post($url, $postData);

        if ($response === false || empty($response)) {
            $data["error"] = "Server unreachable. Please try again later.";
            $data["token"] = $token;
            $this->load->view("ResetPassword", $data);
            return;
        }

        $res = json_decode($response, true);

        if (isset($res["error"])) {
            $data["error"] = $res["error"];
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
        $this->session->unset_userdata('username');
        $this->session->unset_userdata('userId');
        $this->session->unset_userdata('email');
        $this->session->sess_destroy();

        delete_cookie('jwt_token');

        redirect('AuthController', 'refresh');
    }
}