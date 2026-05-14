document.addEventListener("DOMContentLoaded", async () => {
  const resultDiv = document.getElementById("result");
  const refreshBtn = document.getElementById("refreshBtn");

  async function loadResult() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      resultDiv.innerHTML =
        '<div class="safe">❌ Không lấy được tab hiện tại</div>';
      return;
    }
    chrome.runtime.sendMessage({ type: "GET_RESULT", tabId: tab.id }, (res) => {
      const data = res?.data;
      if (!data) {
        resultDiv.innerHTML =
          '<div class="safe">🔍 Chưa có dữ liệu. Hãy tải lại trang hoặc bấm "Kiểm tra lại".</div>';
        return;
      }
      let cls =
        data.level === "scam"
          ? "scam"
          : data.level === "dangerous"
            ? "dangerous"
            : "safe";
      resultDiv.innerHTML = `
        <div class="${cls}" style="padding:6px;">
          <strong>${data.category}</strong><br>
          ${data.message}<br>
          <div class="url">🔗 ${data.originalUrl}</div>
        </div>
      `;
    });
  }

  await loadResult();

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Đang kiểm tra...";
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url) {
      chrome.runtime.sendMessage(
        { type: "FORCE_CHECK", url: tab.url, tabId: tab.id },
        () => {
          setTimeout(() => {
            loadResult();
            refreshBtn.disabled = false;
            refreshBtn.textContent = "🔄 Kiểm tra lại";
          }, 1500);
        },
      );
    } else {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "🔄 Kiểm tra lại";
    }
  });
});
