# QRVerse — Universal QR Toolkit

A full-stack QR code generator built with HTML, CSS, vanilla JavaScript, Node.js and Express. It does not use a cloud database or user accounts.

## Features

- Generate URL, text, Wi-Fi, email, phone, SMS, WhatsApp, contact (vCard), location, UPI and event QR codes.
- Customize foreground/background colours and output size.
- Optional centre logo.
- Download PNG and SVG; print QR codes.
- Scan QR codes using a camera or uploaded image.
- Bulk-generate up to 30 QR codes into a ZIP file.
- Save recent QR content in browser LocalStorage and export history as JSON.
- Responsive layout.

## Requirements

- Node.js 18 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

For normal production-style local run:

```bash
npm start
```

## Deploy on Render

1. Push this project to a GitHub repository.
2. Sign in to Render and choose **New → Web Service**.
3. Connect your repository.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Choose a plan and deploy. Render supplies the `PORT` environment variable automatically.
7. Open the public `onrender.com` URL.

No database or environment variables are required.

## API

### `POST /api/qr/generate`

Request:

```json
{
  "text": "https://example.com",
  "dark": "#111827",
  "light": "#ffffff",
  "errorCorrectionLevel": "H"
}
```

Response:

```json
{
  "dataUrl": "data:image/png;base64,...",
  "encodedText": "https://example.com"
}
```

### `GET /api/health`

Returns a basic health status.

## Privacy and limitations

- QR content sent to `/api/qr/generate` is processed in memory to create the image; the server does not write it to a database or file.
- QR history is stored in the current browser's LocalStorage. It is not synchronized between devices and may be lost if browser data is cleared.
- Camera scanning generally requires HTTPS after deployment (localhost is also treated as a secure context by browsers).
- Scanner and ZIP libraries are loaded from public CDNs, so those two features require internet access.
- A static QR code does not provide scan analytics or editable destinations. Those features need a redirect service and persistent storage.
- Logo overlays can reduce scan reliability. Test each generated QR with another device before distributing it.
- UPI QR codes encode payment details; always verify the payee and amount in the payment app before approving a payment.

## Project structure

```text
QRVerse/
├── controllers/
│   └── qrController.js
├── routes/
│   └── qrRoutes.js
├── public/
│   ├── css/style.css
│   ├── js/app.js
│   └── index.html
├── server.js
├── package.json
└── README.md
```
