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

        // Get JWT from cookie (accessToken set by AuthController)
        $jwt = get_cookie("accessToken");
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
        $isBot = isset($payload['isBot']) ? $payload['isBot'] : false;
        $email = isset($payload['email']) ? $payload['email'] : '';

        $data['userId'] = $userId;
        $data['username'] = $username;
        $data['isBot'] = $isBot;
        $data['email'] = $email;
        $data['access_token'] = $this->session->userdata('access_token');

        // Clear the access token from session after passing to view
        $this->session->unset_userdata('access_token');

        $this->load->view("Dashboard", $data);
    }
}
?>