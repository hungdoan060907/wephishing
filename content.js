let currentBanner = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ANALYSIS_RESULT") showBanner(msg.data);
});

function showBanner(data) {
  if (currentBanner) currentBanner.remove();

  let accentColor, icon;
  if (data.level === "scam") {
    accentColor = "#ef4444"; // Đỏ hiện đại
    icon = "🚨";
  } else if (data.level === "dangerous") {
    accentColor = "#f59e0b"; // Cam hiện đại
    icon = "⚠️";
  } else {
    return; // Không hiện banner nếu an toàn
  }

  const banner = document.createElement("div");
  banner.id = "security-protector-notice";
  
  // Style mới phong cách Glassmorphism (Kính mờ)
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    width: 380px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    border: 1px solid rgba(255, 255, 255, 0.4);
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #1e293b;
    display: flex;
    gap: 16px;
    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // Thêm hiệu ứng trượt vào
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);

  banner.innerHTML = `
    <div style="font-size: 32px; display: flex; align-items: center;">${icon}</div>
    <div style="flex: 1;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <strong style="font-size: 15px; color: #0f172a;">Cảnh Báo Bảo Mật</strong>
      </div>
      <div style="font-size: 13.5px; line-height: 1.5; color: #475569;">${data.message}</div>
      <div style="margin-top: 8px; font-weight: 800; font-size: 11px; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.5px;">
        ${data.category}
      </div>
    </div>
    <button id="close-banner" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer; padding:0; line-height:1; align-self: flex-start;">&times;</button>
  `;

  document.body.appendChild(banner);
  currentBanner = banner;

  document.getElementById("close-banner").addEventListener("click", () => banner.remove());
  
  // Tự động đóng sau 15 giây
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 15000);
}