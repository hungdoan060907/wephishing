// ------------------- DANH SÁCH TRẮNG -------------------
const WHITELIST = [
  "account.garena.com",
  "garena.com",
  "chatgpt.com",
  "openai.com",
  "google.com",
  "facebook.com",
  "youtube.com",
  "github.com",
  "wikipedia.org",
  "microsoft.com",
  "apple.com",
  "amazon.com",
  "netflix.com",
  "zoom.us",
  "zing.vn",
  "vnexpress.net",
  "dantri.com.vn",
  "chinhphu.vn",
];

// ------------------- DANH SÁCH ĐEN CỨNG -------------------
const BLACKLIST_DOMAINS = [
  "chuky.vn",
  "noh-ikasu.jp.net",
  "ku11.net",
  "fun88.vn",
  "w88.com",
  "m88.com",
  "sbobet.com",
  "188bet.com",
  "cmd368.com",
];

// ------------------- MẪU URL LỪA ĐẢO -------------------
const SCAM_PATTERNS = [
  /rut[-_\.]?kc/i, /rut[-_\.]?tien/i, /mien[-_\.]?phi/i, /nhan[-_\.]?qua/i,
  /trung[-_\.]?thuong/i, /free[-_\.]?money/i, /giveaway/i, /withdraw/i,
  /bonus/i, /khuyen[-_\.]?mai/i, /hoan[-_\.]?tra/i, /tặng[-_\.]?quà/i,
  /chiết[-_\.]?khấu/i, /ưu[-_\.]?đãi/i, /qr[-_\.]?code/i, /rút[-_\.]?tiền/i,
  /miễn[-_\.]?phí/i, /lì[-_\.]?xì/i, /quà[-_\.]?tặng/i, /trúng[-_\.]?thưởng/i,
];

// ------------------- MẪU URL CỜ BẠC -------------------
const GAMBLING_PATTERNS = [
  /casino/i, /bet/i, /slot/i, /poker/i, /baccarat/i, /blackjack/i,
  /roulette/i, /noh/i, /xocdia/i, /lode/i, /taixiu/i, /xoso/i,
  /loto/i, /kubet/i, /fun88/i, /m88/i, /w88/i, /dafabet/i,
  /188bet/i, /sbobet/i, /cá[-_\.]?cược/i, /cờ[-_\.]?bạc/i,
  /đánh[-_\.]?bài/i, /nổ[-_\.]?hũ/i,
];

const SUSPICIOUS_TLDS = [
  ".top", ".xyz", ".club", ".online", ".vip", ".work", ".click",
  ".loan", ".jp.net", ".tk", ".ml", ".ga", ".cf", ".gq", ".date", ".download",
];

// Cấu hình độ dài URL tối đa (Ví dụ: 100 ký tự)
const MAX_URL_LENGTH = 100;

// ================== HÀM KIỂM TRA ==================
function isChromeInternalUrl(url) {
  return url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:");
}

function isWhitelisted(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return WHITELIST.some((d) => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}

function getHardcodedThreat(url) {
  const lower = url.toLowerCase();

  // 1. Kiểm tra độ dài URL (Mới thêm)
  if (url.length > MAX_URL_LENGTH) {
    return { 
      level: "dangerous", 
      reason: `URL quá dài (${url.length} ký tự). Đây thường là dấu hiệu của web giả mạo hoặc chứa mã độc.` 
    };
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    
    // 2. Blacklist domain
    if (BLACKLIST_DOMAINS.some((d) => host.includes(d)))
      return { level: "scam", reason: "Domain nằm trong danh sách đen độc hại." };
    
    // 3. Tên miền rác
    for (let tld of SUSPICIOUS_TLDS)
      if (host.endsWith(tld))
        return { level: "dangerous", reason: `Tên miền đuôi ${tld} có độ tin cậy thấp.` };
  } catch (e) {}

  // 4. Pattern lừa đảo
  for (let p of SCAM_PATTERNS)
    if (p.test(lower)) return { level: "scam", reason: "Phát hiện từ khóa lừa đảo trong URL." };

  // 5. Pattern cờ bạc
  for (let p of GAMBLING_PATTERNS)
    if (p.test(lower)) return { level: "dangerous", reason: "Phát hiện từ khóa cờ bạc/cá cược." };

  return null;
}

async function saveAndNotify(tabId, result) {
  await chrome.storage.session.set({ [`result_${tabId}`]: result });
  
  // 1. Cập nhật Badge (Dấu tích xanh trên thanh công cụ)
  let text = "", color = "#808080";
  if (result.level === "scam") { 
    text = "❗"; color = "#FF0000"; 
  } else if (result.level === "dangerous") { 
    text = "⚠️"; color = "#FFA500"; 
  } else { 
    text = "✓"; color = "#2ecc71"; // Đây là dấu tích xanh bạn muốn giữ
  }
  
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });

  // 2. Kiểm tra điều kiện trước khi hiện Popup thông báo (Banner)
  // Nếu level là "safe" (an toàn), chúng ta sẽ KHÔNG gửi tin nhắn đến content.js
  if (result.level !== "safe") {
    chrome.tabs.sendMessage(tabId, { type: "ANALYSIS_RESULT", data: result }).catch(() => {});
  }
}

// Tìm đến hàm checkWebsite và thay đổi nội dung trả về
async function checkWebsite(url, tabId) {
  if (isChromeInternalUrl(url)) return;

  if (isWhitelisted(url)) {
    await saveAndNotify(tabId, {
      level: "safe",
      message: "Trang web nằm trong danh sách xác thực an toàn.", // Bỏ chữ Whitelist/AI
      category: "XÁC THỰC",
      originalUrl: url,
    });
    return;
  }

  const threat = getHardcodedThreat(url);
  if (threat) {
    await saveAndNotify(tabId, {
      level: threat.level,
      message: threat.reason,
      category: threat.level === "scam" ? "NGUY HIỂM" : "CẢNH BÁO",
      originalUrl: url,
    });
  } else {
    await saveAndNotify(tabId, {
      level: "safe",
      message: "Hệ thống không phát hiện rủi ro từ URL này.",
      category: "BÌNH THƯỜNG",
      originalUrl: url,
    });
  }
} 

// Lắng nghe sự kiện
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    checkWebsite(tab.url, tabId);
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_RESULT") {
    chrome.storage.session.get([`result_${req.tabId}`], (res) => sendResponse({ data: res[`result_${req.tabId}`] }));
    return true;
  }
  if (req.type === "FORCE_CHECK") {
    checkWebsite(req.url, req.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
});