<?php
defined("BASEPATH") or exit("No direct script access allowed");

class DashboardController extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->helper(['url', 'cookie', 'jwt']);
    }

    function index()
    {
        $this->load->helper('url');

        // Get JWT from cookie
        $jwt = get_cookie("jwt_token");
        if (!$jwt) {
            redirect('AuthController', 'refresh');
            return;
        }

        // Decode JWT payload
        $payload = decode_jwt($jwt);
        if (!$payload || !isset($payload['id'])) {
            echo "Invalid token!";
            return;
        }

        $userId = $payload['id'];
        $username = $payload['username'];
        $email = isset($payload['email']) ? $payload['email'] : '';

        $data['userId'] = $userId;
        $data['username'] = $username;
        $data['email'] = $email;

        $this->load->view("Dashboard", $data);
    }
}
?>