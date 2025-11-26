<?php if (!defined('BASEPATH')) exit('No direct script access allowed');

if (!function_exists('decode_jwt')) {
    function decode_jwt($jwt) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        $payload = $parts[1];
        $decoded = base64_decode(strtr($payload, '-_', '+/'));
        return json_decode($decoded, true);
    }
}


?>