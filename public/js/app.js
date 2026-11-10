const $ = (id) => document.getElementById(id);
const HISTORY_KEY = "qrverse-history-v1";
let currentQrText = "";
let scanner = null;
let scannerRunning = false;

const fieldTemplates = {
  url: [{ name: "url", label: "Website address", placeholder: "https://example.com", type: "url", required: true }],
  text: [{ name: "text", label: "Your text", placeholder: "Type anything you want to share...", textarea: true, required: true }],
  wifi: [
    { name: "ssid", label: "Wi-Fi network name (SSID)", placeholder: "My Wi-Fi", required: true },
    { name: "password", label: "Wi-Fi password", placeholder: "Password", type: "text" },
    { name: "security", label: "Security", select: ["WPA", "WEP", "nopass"] },
    { name: "hidden", label: "Hidden network?", checkbox: true }
  ],
  email: [
    { name: "address", label: "Email address", placeholder: "hello@example.com", type: "email", required: true },
    { name: "subject", label: "Subject", placeholder: "Hello" },
    { name: "body", label: "Message", placeholder: "Your message...", textarea: true }
  ],
  phone: [{ name: "phone", label: "Phone number", placeholder: "+911234567890", required: true }],
  sms: [{ name: "phone", label: "Phone number", placeholder: "+911234567890", required: true }, { name: "body", label: "Message", placeholder: "Your message...", textarea: true }],
  whatsapp: [{ name: "phone", label: "WhatsApp number (with country code)", placeholder: "919876543210", required: true }, { name: "body", label: "Pre-filled message", placeholder: "Hello!" }],
  contact: [
    { name: "name", label: "Full name", placeholder: "Aarav Sharma", required: true },
    { name: "phone", label: "Phone number", placeholder: "+911234567890" },
    { name: "email", label: "Email", placeholder: "aarav@example.com", type: "email" },
    { name: "organization", label: "Organization", placeholder: "Company name" },
    { name: "website", label: "Website", placeholder: "https://example.com" }
  ],
  location: [{ name: "location", label: "Address or Google Maps link", placeholder: "Enter an address or map URL", required: true }],
  upi: [
    { name: "vpa", label: "UPI ID", placeholder: "name@bank", required: true },
    { name: "payee", label: "Payee name", placeholder: "Your name", required: true },
    { name: "amount", label: "Amount (optional, INR)", placeholder: "100", type: "number" },
    { name: "note", label: "Payment note", placeholder: "Payment for..." }
  ],
  event: [
    { name: "title", label: "Event name", placeholder: "Community meetup", required: true },
    { name: "start", label: "Start date and time", type: "datetime-local", required: true },
    { name: "end", label: "End date and time", type: "datetime-local" },
    { name: "location", label: "Location", placeholder: "Event venue" },
    { name: "description", label: "Description", placeholder: "Event details...", textarea: true }
  ]
};

function renderFields() {
  const type = $("qrType").value;
  $("dynamicFields").innerHTML = "";
  fieldTemplates[type].forEach((field) => {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.className = "field-label";
    label.htmlFor = `field-${field.name}`;
    label.textContent = field.label;
    let input;
    if (field.select) {
      input = document.createElement("select");
      field.select.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value === "nopass" ? "No password" : value;
        input.appendChild(option);
      });
    } else if (field.checkbox) {
      input = document.createElement("input");
      input.type = "checkbox";
    } else if (field.textarea) {
      input = document.createElement("textarea");
      input.rows = 3;
      input.placeholder = field.placeholder || "";
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
      input.placeholder = field.placeholder || "";
    }
    input.id = `field-${field.name}`;
    input.dataset.field = field.name;
    if (field.required) input.required = true;
    wrap.append(label, input);
    $("dynamicFields").appendChild(wrap);
  });
}
function val(name) {
  const el = document.querySelector(`[data-field="${name}"]`);
  return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : "";
}
function escapeWifi(value) {
  return String(value).replace(/([\\;,:"])/g, "\\$1").replace(/[\r\n]/g, "");
}
function toUtcStamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Please enter a valid event date.");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function buildPayload() {
  const type = $("qrType").value;
  let text = "";
  switch (type) {
    case "url": {
      let url = val("url");
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try { new URL(url); } catch { throw new Error("Please enter a valid website address."); }
      text = url; break;
    }
    case "text": text = val("text"); break;
    case "wifi": {
      const ssid = val("ssid"), password = val("password"), security = val("security");
      if (!ssid) throw new Error("Please enter the Wi-Fi network name.");
      text = `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${val("hidden") ? "true" : "false"};;`; break;
    }
    case "email": {
      const address = val("address");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("Please enter a valid email address.");
      text = `mailto:${address}?subject=${encodeURIComponent(val("subject"))}&body=${encodeURIComponent(val("body"))}`; break;
    }
    case "phone": {
      const phone = val("phone");
      if (!/^\+?[0-9\s().-]{7,20}$/.test(phone)) throw new Error("Please enter a valid phone number.");
      text = `tel:${phone.replace(/[\s().-]/g, "")}`; break;
    }
    case "sms": {
      const phone = val("phone");
      if (!phone) throw new Error("Please enter a phone number.");
      text = `SMSTO:${phone}:${val("body")}`; break;
    }
    case "whatsapp": {
      const phone = val("phone").replace(/\D/g, "");
      if (phone.length < 8 || phone.length > 15) throw new Error("Enter a WhatsApp number with country code.");
      text = `https://wa.me/${phone}${val("body") ? `?text=${encodeURIComponent(val("body"))}` : ""}`; break;
    }
    case "contact": {
      const name = val("name");
      if (!name) throw new Error("Please enter the contact name.");
      const parts = name.trim().split(/\s+/);
      text = ["BEGIN:VCARD", "VERSION:3.0", `N:${parts.slice(1).join(" ")};${parts[0]};;;`, `FN:${name}`, val("organization") ? `ORG:${val("organization")}` : "", val("phone") ? `TEL;TYPE=CELL:${val("phone")}` : "", val("email") ? `EMAIL:${val("email")}` : "", val("website") ? `URL:${val("website")}` : "", "END:VCARD"].filter(Boolean).join("\n"); break;
    }
    case "location": {
      const location = val("location");
      if (!location) throw new Error("Please enter an address or map link.");
      text = /^https?:\/\//i.test(location) ? location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`; break;
    }
    case "upi": {
      const vpa = val("vpa"), payee = val("payee"), amount = val("amount");
      if (!/^[\w.-]+@[\w.-]+$/.test(vpa)) throw new Error("Please enter a valid UPI ID.");
      if (!payee) throw new Error("Please enter the payee name.");
      if (amount && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) throw new Error("Enter a valid positive amount.");
      const params = new URLSearchParams({ pa: vpa, pn: payee, cu: "INR" });
      if (amount) params.set("am", Number(amount).toFixed(2));
      if (val("note")) params.set("tn", val("note"));
      text = `upi://pay?${params.toString()}`; break;
    }
    case "event": {
      if (!val("title") || !val("start")) throw new Error("Please enter an event name and start time.");
      const start = toUtcStamp(val("start"));
      const end = val("end") ? toUtcStamp(val("end")) : "";
      if (end && end <= start) throw new Error("Event end must be after its start.");
      text = ["BEGIN:VEVENT", `SUMMARY:${val("title").replace(/\n/g, " ")}`, `DTSTART:${start}`, end ? `DTEND:${end}` : "", val("location") ? `LOCATION:${val("location").replace(/\n/g, " ")}` : "", val("description") ? `DESCRIPTION:${val("description").replace(/\n/g, " ")}` : "", "END:VEVENT"].filter(Boolean).join("\r\n"); break;
    }
  }
  if (!text) throw new Error("Please complete the required field(s).");
  if (text.length > 2500) throw new Error("This QR content is too long. Please shorten it.");
  return text;
}
async function requestQr(text, dark, light) {
  const response = await fetch("/api/qr/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dark, light, errorCorrectionLevel: "H" })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "QR generation failed.");
  return data.dataUrl;
}
function drawImageToCanvas(dataUrl, canvas, size, logoUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = $("lightColor").value; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      if (!logoUrl) return resolve();
      const logo = new Image();
      logo.onload = () => {
        const box = size * 0.22, pad = size * 0.025, x = (size - box) / 2, y = (size - box) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.roundRect(x - pad, y - pad, box + pad * 2, box + pad * 2, size * .025); ctx.fill();
        const ratio = Math.min(box / logo.width, box / logo.height);
        const w = logo.width * ratio, h = logo.height * ratio;
        ctx.drawImage(logo, (size - w) / 2, (size - h) / 2, w, h);
        resolve();
      };
      logo.onerror = () => reject(new Error("Could not read the selected logo image."));
      logo.src = logoUrl;
    };
    img.onerror = () => reject(new Error("Could not render the QR code."));
    img.src = dataUrl;
  });
}
function readLogo() {
  const file = $("logoFile").files[0];
  if (!file) return Promise.resolve("");
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error("Logo must be smaller than 2 MB."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read logo file."));
    reader.readAsDataURL(file);
  });
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(text, type) {
  const items = getHistory();
  items.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, type, createdAt: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30)));
  renderHistory();
}
function renderHistory() {
  const items = getHistory();
  const list = $("historyList");
  list.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p"); empty.className = "empty-history"; empty.textContent = "No QR codes saved yet. Generate one and it will appear here."; list.appendChild(empty); return;
  }
  items.forEach((item) => {
    const row = document.createElement("div"); row.className = "history-item";
    const info = document.createElement("div"); info.className = "history-info";
    const title = document.createElement("strong"); title.textContent = `${item.type.toUpperCase()} · ${new Date(item.createdAt).toLocaleString()}`;
    const content = document.createElement("span"); content.textContent = item.text;
    info.append(title, content);
    const button = document.createElement("button"); button.className = "text-button"; button.textContent = "Use again";
    button.addEventListener("click", () => {
      $("qrType").value = "text"; renderFields(); $("field-text").value = item.text; $("generateBtn").click(); $("generator").scrollIntoView({ behavior: "smooth" });
    });
    row.append(info, button); list.appendChild(row);
  });
}
function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a"); link.href = dataUrl; link.download = filename; link.click();
}
function safeFileName(text) {
  return text.slice(0, 35).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "qr-code";
}
async function generateCurrent() {
  $("formMessage").textContent = "";
  $("generateBtn").disabled = true;
  try {
    const text = buildPayload();
    const logo = await readLogo();
    const dataUrl = await requestQr(text, $("darkColor").value, $("lightColor").value);
    currentQrText = text;
    await drawImageToCanvas(dataUrl, $("qrCanvas"), Number($("qrSize").value), logo);
    $("qrPlaceholder").classList.add("hidden");
    $("qrResult").classList.remove("hidden");
    saveHistory(text, $("qrType").value);
  } catch (error) {
    $("formMessage").textContent = error.message;
  } finally {
    $("generateBtn").disabled = false;
  }
}
function downloadSvg() {
  if (!currentQrText) return;
  const qrType = $("qrType").value;
  const text = currentQrText;
  const size = Number($("qrSize").value);
  // SVG is generated by the QR library through the server endpoint's companion route below.
  fetch("/api/qr/svg", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dark: $("darkColor").value, light: $("lightColor").value, size })
  }).then(async (r) => {
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "SVG download failed.");
    const blob = new Blob([data.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob); downloadDataUrl(url, `${safeFileName(text)}.svg`); URL.revokeObjectURL(url);
  }).catch((error) => { $("formMessage").textContent = error.message; });
}
async function startScanner() {
  $("scanMessage").textContent = "";
  if (!window.Html5Qrcode) { $("scanMessage").textContent = "Scanner library did not load. Check your internet connection and refresh."; return; }
  if (!scanner) scanner = new Html5Qrcode("reader");
  try {
    await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 230, height: 230 } },
      (decoded) => showDecoded(decoded), () => {});
    scannerRunning = true; $("startScan").disabled = true; $("stopScan").disabled = false;
  } catch (error) { $("scanMessage").textContent = "Camera could not start. Allow camera access or use image upload."; }
}
async function stopScanner() {
  if (scanner && scannerRunning) {
    try { await scanner.stop(); } catch {}
    scannerRunning = false; $("startScan").disabled = false; $("stopScan").disabled = true;
  }
}
function showDecoded(text) {
  $("decodedText").textContent = text;
  $("scanResult").classList.remove("hidden");
}
async function scanImage(file) {
  if (!file || !window.Html5Qrcode) { $("scanMessage").textContent = "Scanner library is unavailable."; return; }
  try {
    if (!scanner) scanner = new Html5Qrcode("reader");
    const result = await scanner.scanFile(file, true);
    showDecoded(result); $("scanMessage").textContent = "";
  } catch { $("scanMessage").textContent = "No readable QR code was found in that image."; }
}

$("qrType").addEventListener("change", renderFields);
$("generateBtn").addEventListener("click", generateCurrent);
$("downloadPng").addEventListener("click", () => downloadDataUrl($("qrCanvas").toDataURL("image/png"), `${safeFileName(currentQrText)}.png`));
$("downloadSvg").addEventListener("click", downloadSvg);
$("printQr").addEventListener("click", () => window.print());
$("startScan").addEventListener("click", startScanner);
$("stopScan").addEventListener("click", stopScanner);
$("scanFile").addEventListener("change", (e) => scanImage(e.target.files[0]));
$("copyDecoded").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("decodedText").textContent); $("scanMessage").textContent = "Copied."; }
  catch { $("scanMessage").textContent = "Copy is not available in this browser."; }
});
$("bulkInput").addEventListener("input", () => {
  const count = $("bulkInput").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean).length;
  $("bulkCount").textContent = `${count} / 30 items`;
});
$("bulkGenerate").addEventListener("click", async () => {
  const lines = $("bulkInput").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  $("bulkMessage").textContent = "";
  if (!lines.length) { $("bulkMessage").textContent = "Enter at least one URL or text item."; return; }
  if (lines.length > 30) { $("bulkMessage").textContent = "Please enter no more than 30 items at a time."; return; }
  if (!window.JSZip) { $("bulkMessage").textContent = "ZIP library did not load. Check your internet connection."; return; }
  $("bulkGenerate").disabled = true;
  try {
    const zip = new JSZip();
    for (let i = 0; i < lines.length; i++) {
      const dataUrl = await requestQr(lines[i], $("darkColor").value, $("lightColor").value);
      zip.file(`qr-${String(i + 1).padStart(2, "0")}.png`, dataUrl.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob); downloadDataUrl(url, "qrverse-bulk-codes.zip"); URL.revokeObjectURL(url);
    $("bulkMessage").textContent = `Successfully created ${lines.length} QR codes.`;
  } catch (error) { $("bulkMessage").textContent = error.message; }
  finally { $("bulkGenerate").disabled = false; }
});
$("exportHistory").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); downloadDataUrl(url, "qrverse-history.json"); URL.revokeObjectURL(url);
});
$("clearHistory").addEventListener("click", () => {
  if (confirm("Clear all QRVerse history saved in this browser?")) { localStorage.removeItem(HISTORY_KEY); renderHistory(); }
});
$("qrSize").addEventListener("change", () => { if (currentQrText) $("generateBtn").click(); });
$("year").textContent = new Date().getFullYear();
renderFields();
renderHistory();
