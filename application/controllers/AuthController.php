<?php
defined("BASEPATH") or exit("No direct script access allowed");
class AuthController extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper(["url", "cookie", "jwt"]);
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
        $this->form_validation->set_rules(
            "password",
            "Password",
            "required|min_length[6]"
        );
        $this->form_validation->set_rules(
            "cpassword",
            "Confirm Password",
            "required|matches[password]"
        );

        if ($this->form_validation->run() == false) {
            // Validation failed → reload form with errors
            $this->load->view("Register");
        } else {
            $serverorigin = $this->config->item('server_origin');
            // Validation passed → save user
            $url = $serverorigin . "/api/register";
            $data = [
                "username" => $this->input->post("uname"),
                "password" => $this->input->post("password"),
            ];

            // Send JSON to Node backend
            $response = $this->curl_library->simple_post($url, $data);


            if ($response === false || empty($response)) {
                $data["error"] = "Auth server unreachable";
                $this->load->view("Register", $data);
                return;
            }

            $res = json_decode($response, true); // decode JSON into array

            if (isset($res["error"])) {
                // Show error message from backend
                $data["error"] = $res["error"];
                $this->load->view("Register", $data);
                return;
            }

            $this->session->set_flashdata(
                'toast_success',
                'Registration successful. Please login.'
            );
            // echo $response;
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

        $res = json_decode($response, true); // decode as array

        // If decoding failed (backend sent plain text)
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data["error"] = $response; // raw message
            $this->load->view("Login", $data);
            return;
        }

        if (isset($res["token"])) {
            $token = $res["token"];
            $payload = decode_jwt($token);

            if ($payload && isset($payload["username"])) {
                $this->session->set_userdata("username", $payload["username"]);
                $this->session->set_userdata("userId", $payload["id"]);
            }


            set_cookie([
                "name" => "jwt_token",
                "value" => $res["token"],
                "expire" => 7 * 24 * 60 * 60,
                "secure" => false,
                "httponly" => true,
            ]);
            // Redirect to dashboard
            redirect("DashboardController");
            return;
        }
        // ❌ Error case: backend returned { error: "..."}
        $data["error"] = isset($res["error"]) ? $res["error"] : "Login Failed!";
        $this->load->view("Login", $data);
    }


    public function Logout()
    {
        $this->session->unset_userdata('username');
        $this->session->sess_destroy();

        // Delete JWT cookie
        delete_cookie('jwt_token');

        // Redirect to login page
        $this->load->view('Login');
    }
}
/* End of file AuthController.php */
/* Location: ./application/controllers/AuthController.php */
?>