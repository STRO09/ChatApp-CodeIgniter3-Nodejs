<?php
defined('BASEPATH') OR exit('No direct script access allowed');
?><!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Welcome to CodeIgniter</title>
		<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
		<script>
			const socket = io("http://10.10.15.140:5555");
		</script>
	</head>
	<body>
		<div id="container">
			<h1>Welcome to CodeIgniter!</h1>
			<form action="" method="post" accept-charset="utf-8" id="createRoom">
				Enter User name : <input type="text" name="" id="username" required> <br>
				Enter Room name : <input type="text" name="room" id="room" required> <br>
				<button type="submit">Submit</button>
			</form>
			<ul id="list">
			</ul>
			<form method="get" accept-charset="utf-8" id="chatRoom" style="display: none">
				<input type="text" id="msg"> <br>
				<button type="submit">Send message</button>
			</form>
		</div>
		<script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
		<script>
			let roomName;
			let username;
			$('#createRoom').submit((e)=> {
				e.preventDefault();
				 roomName = $('#room').val();
				 username = $('#username').val();
				$('#createRoom').hide();
				socket.emit('joinRoom',{roomName,username});
				$('#chatRoom').show();
			});
			$('#chatRoom').submit(function(e) {
				e.preventDefault();
				let msg = $('#msg').val();
				console.log(msg);
				socket.emit('chatRoom', {room: roomName, name: username , message : msg});
			});
			socket.on('chatRoom', (data)=> {
				console.log(data);
				const li = $('<li></li>').text(`${data.name} : ${data.message}`);

				$('#list').append(li);
			} )
		</script>
	</body>
</html>