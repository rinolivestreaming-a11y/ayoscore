// AAFI Navbar Component
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const existing = document.querySelector('.navbar');
    if (existing) return;
    
    const html = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="index.html" class="navbar-brand">
          <div class="brand-logo">AAFI</div>
          <div class="brand-text">
            <span class="brand-name">AAFI League</span>
            <span class="brand-sub">Football System</span>
          </div>
        </a>
        <ul class="navbar-nav">
          <li><a href="index.html" class="nav-link">Home</a></li>
          <li><a href="standings.html" class="nav-link">Standings</a></li>
          <li><a href="fixtures.html" class="nav-link">Fixtures</a></li>
          <li><a href="results.html" class="nav-link">Results</a></li>
          <li><a href="match-center.html" class="nav-link">Match Center</a></li>
          <li><a href="teams.html" class="nav-link">Teams</a></li>
          <li><a href="players.html" class="nav-link">Players</a></li>
          <li><a href="statistics.html" class="nav-link">Stats</a></li>
          <li><a href="tournament.html" class="nav-link">Tournament</a></li>
          <li><a href="playoff.html" class="nav-link">Playoff</a></li>
          <li><a href="news.html" class="nav-link">News</a></li>
          <li><a href="scoreboard.html" class="nav-link">Scoreboard</a></li>
        </ul>
        <div class="navbar-actions">
          <div class="live-badge" id="live-indicator" style="display:none">
            <span class="live-dot"></span>LIVE
          </div>
          <a href="admin.html" class="btn-admin">Admin ⚡</a>
        </div>
      </div>
    </nav>
    <div class="toast-container"></div>`;
    document.body.insertAdjacentHTML('afterbegin', html);
    
    // Set active link
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('href') === path) link.classList.add('active');
    });
  });
})();
