# 🛒 PickFresh - Local Grocery Pre-Order and Pickup Mobile App
### SLIIT IT3060 - Human Computer Interaction (HCI) | Milestone 03
**Group ID:** KND_HCI_G10  
**Technology Stack:** React Native / Expo (Mobile Frontend) | React (Web Preview) | Node.js + Express.js (Backend) | MongoDB Atlas (Database) | JWT (Authentication)

---

## 🚀 How to Run the Project Locally

### 1. Running the Backend Server (Express + MongoDB REST API)
1. Open VS Code Terminal (`Ctrl + ~`):
   ```bash
   cd backend
   npm start
   ```
   *Base API Endpoint: `http://localhost:5000/api`*

---

### 2. Running the React Native Mobile Application (Android / iOS)
The mobile application is built using **React Native + Expo**. It wraps the complete PickFresh mobile interface with zero discrepancies, authentic native hardware back-button support, and responsive layouts.

1. Open a new terminal in VS Code:
   ```bash
   cd mobile
   npm start
   ```
2. **To Run on your Physical Phone (Android / iOS):**
   - Install **Expo Go** from Google Play Store or Apple App Store.
   - Scan the QR code displayed in your terminal using the Expo Go app (or camera app on iOS).
   - Ensure your phone and computer are connected to the same Wi-Fi network.
   - If your PC's IP address changes, you can tap **⚙️ Server IP** directly inside the mobile app to set your machine's IP (e.g. `http://192.168.1.111:5173`).

3. **To Run on Android Emulator:**
   - Press `a` in the Expo terminal window.

---

### 3. Running the Frontend Web Application (Browser Preview)
1. Open a terminal in VS Code:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open `http://localhost:5173/` in your browser.
   - *For Mobile Frame preview on Chrome: Press `F12` -> Click Mobile Toggle Icon (`Ctrl+Shift+M`) -> Select **iPhone 14 Pro** or **Pixel 7**.*

---

### 📦 Building Standalone Android APK (.apk)
To build a standalone installable Android `.apk` file for submission or viva demo:
```bash
cd mobile
npx eas build -p android --profile preview
```
