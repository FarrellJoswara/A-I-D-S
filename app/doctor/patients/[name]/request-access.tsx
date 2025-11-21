import * as FileSystem from "expo-file-system";

export const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxZTdlYTllNS1mZWRhLTQ3ZjQtYWNlMC1kYTViYmFhZjc1YzkiLCJlbWFpbCI6ImZhcnJlbGxqb3N3YXJhQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJhNGY1NjBlM2JhYjU3YjBjYmEyOCIsInNjb3BlZEtleVNlY3JldCI6Ijg0ZTcyNjEyMDQ0YmI5YWM2MmM1MGQxMTNmNDA5ZjI3MTE2Y2RlMzMxZGUxN2JhMGM1NTU0NGIxYTg1ZjhmNjgiLCJleHAiOjE3OTUyMDc1NjJ9.6mbT0-sEMYHBhaQ-3iN_R2sEABzu5go629Cc17p8N40";

interface FileUpload {
  uri: string;
  type: string;
  name: string;
  data?: string; // base64 content
}

export async function uploadFileToPinata(file: FileUpload) {
  try {
    // Use Expo FileSystem's uploadAsync for reliable uploads
    const uploadResult = await FileSystem.uploadAsync(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      file.uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    if (uploadResult.status !== 200) {
      throw new Error(`Upload failed: ${uploadResult.status} - ${uploadResult.body}`);
    }

    const result = JSON.parse(uploadResult.body);
    return result;
  } catch (error) {
    console.error("Pinata upload error:", error);
    throw error;
  }
}

export async function uploadRecordMetadata(metadata: object) {
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}