# MedaWallet – Decentralized Medical Record Management

MedaWallet is a secure, decentralized application (dApp) designed to empower patients and healthcare providers by giving them full control over medical records. Using blockchain technology (XRPL) and decentralized storage (IPFS/Pinata), MedaWallet ensures that medical records are tamper-proof, easily shareable, and privacy-preserving.

---

## Features

- **Patient-Controlled Records**  
  Patients own their medical data and can grant/revoke access to doctors and institutions.

- **Decentralized Storage**  
  Files are stored securely on IPFS via Pinata, preventing single points of failure.

- **Blockchain Registration**  
  Medical records are optionally registered on the XRPL testnet, ensuring immutability and verifiable ownership.

- **Doctor Uploads**  
  Doctors can upload reports (PDFs, images, Word documents) with metadata including record type, hospital, and description.

- **Local Fallback**  
  If blockchain submission fails, transactions are stored locally until the network is available.

- **Quick Record Typing**  
  Common medical record types are available as quick buttons for faster uploads.

- **Secure Hashing**  
  Files are hashed using SHA256 before uploading to maintain integrity.

---

## Tech Stack

- **Frontend:** React Native, Expo
- **Blockchain:** XRP Ledger (XRPL) Testnet
- **Decentralized Storage:** IPFS (via Pinata)
- **State Management & Storage:** AsyncStorage
- **Security:** SHA256 file hashing, wallet signing via XRPL SDK
- **File Handling:** `expo-document-picker`, `expo-file-system`

---

## File Upload Flow

1. Doctor selects a file using the document picker.
2. File is hashed using SHA256 for integrity.
3. File is uploaded to IPFS via Pinata.
4. Metadata about the record is created and uploaded to IPFS.
5. Transaction is submitted to XRPL with multiple endpoint fallbacks.
6. If blockchain fails, transaction is stored locally for later submission.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/medawallet.git
cd medawallet

# Install dependencies
npm install

# Start the project
npx expo start
