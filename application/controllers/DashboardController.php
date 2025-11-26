<?php
class DashboardController extends CI_Controller{
		public function __construct()
	{
		parent::__construct();
		$this->load->helper(['url', 'cookie']);
		$this->load->helper('jwt');

	}
	function index(){
		$this->load->helper('url');

        //  Get JWT from session
        $jwt = $this->session->userdata('jwt_token');

        if (!$jwt) {
            echo "Not logged in!";
            return;
        }
        // Decode JWT payload
        $payload = decode_jwt($jwt);
        if (!$payload || !isset($payload['id'])) {
            echo "Invalid token!";
            return;
        }

        $userId = $payload['id'];

        // ✅ Call Node backend with Authorization header
        $url = "http://10.10.15.140:5555/api/conversations/$userId";
        $headers = ["Authorization: Bearer $jwt"];

        $response = $this->curl_library->simple_get($url, $headers);

        $data['conversations'] = json_decode($response, true);
        $this->load->view("Dashboard", $data);
	}
}
?>