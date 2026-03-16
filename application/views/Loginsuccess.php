<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Logging in...</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Logging you in...</p>
  </div>

  <script>
    // Store JWT in localStorage
    const tokenData = <?php echo json_encode($tokenData); ?>;
    
    if (tokenData && tokenData.accessToken) {
      // Store access token
      localStorage.setItem('access_token', tokenData.accessToken);
      
      // Calculate and store expiry time
      const expiresIn = tokenData.expiresIn || '15m';
      let expiryMs;
      
      if (typeof expiresIn === 'number') {
        expiryMs = expiresIn * 1000;
      } else {
        // Parse "15m" format
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
          expiryMs = value * (multipliers[unit] || 60000);
        } else {
          expiryMs = 15 * 60 * 1000; // default 15 minutes
        }
      }
      
      // Subtract 1 minute safety margin
      const expiryTime = Date.now() + expiryMs - 60000;
      localStorage.setItem('token_expiry', expiryTime.toString());
      
      console.log('Token stored successfully');
    } else {
      console.error('No token data received');
    }
    
    // Redirect to dashboard
    window.location.href = '<?= site_url('DashboardController') ?>';
  </script>
</body>
</html>