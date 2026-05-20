(function() {
  const script = document.currentScript;
  const workspaceId = script.getAttribute('data-workspace-id');
  const baseUrl = 'http://localhost:3001'; // The URL of your frontend

  if (!workspaceId) {
    console.error('SupportBot: data-workspace-id is missing');
    return;
  }

  // Create Container
  const container = document.createElement('div');
  container.id = 'support-bot-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-end';
  document.body.appendChild(container);

  // Create Iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}/chat-frame?workspaceId=${workspaceId}`;
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '24px';
  iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
  iframe.style.display = 'none';
  iframe.style.transition = 'all 0.3s ease';
  iframe.style.marginBottom = '15px';
  container.appendChild(iframe);

  // Create Bubble
  const bubble = document.createElement('div');
  bubble.style.width = '60px';
  bubble.style.height = '60px';
  bubble.style.borderRadius = '50%';
  bubble.style.backgroundColor = '#6366f1'; // Brand Color
  bubble.style.cursor = 'pointer';
  bubble.style.display = 'flex';
  bubble.style.alignItems = 'center';
  bubble.style.justifyContent = 'center';
  bubble.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
    </svg>
  `;
  container.appendChild(bubble);

  let isOpen = false;
  bubble.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    bubble.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
  };

  // Adjust for mobile
  const mediaQuery = window.matchMedia('(max-width: 480px)');
  function handleMobile(e) {
    if (e.matches) {
      iframe.style.width = 'calc(100vw - 40px)';
      iframe.style.height = 'calc(100vh - 100px)';
    } else {
      iframe.style.width = '400px';
      iframe.style.height = '600px';
    }
  }
  mediaQuery.addListener(handleMobile);
  handleMobile(mediaQuery);
})();
