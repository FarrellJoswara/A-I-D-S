import axios from "axios";

export const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxZTdlYTllNS1mZWRhLTQ3ZjQtYWNlMC1kYTViYmFhZjc1YzkiLCJlbWFpbCI6ImZhcnJlbGxqb3N3YXJhQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJhNGY1NjBlM2JhYjU3YjBjYmEyOCIsInNjb3BlZEtleVNlY3JldCI6Ijg0ZTcyNjEyMDQ0YmI5YWM2MmM1MGQxMTNmNDA5ZjI3MTE2Y2RlMzMxZGUxN2JhMGM1NTU0NGIxYTg1ZjhmNjgiLCJleHAiOjE3OTUyMDc1NjJ9.6mbT0-sEMYHBhaQ-3iN_R2sEABzu5go629Cc17p8N40";

interface FileUpload {
  uri: string;
  type: string;
  name: string;
}

export async function uploadFileToPinata(file: FileUpload) {
  try {
    const formData = new FormData();
    
    // Append file to FormData - React Native handles this specially
    formData.append("file", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    console.log("Uploading file:", file.name, "Type:", file.type);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        transformRequest: (data, headers) => {
          // Let axios handle the FormData as-is
          return data;
        },
      }
    );

    console.log("Upload successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Pinata upload error:", error.response?.data || error.message);
    throw error;
  }
}

export async function uploadRecordMetadata(metadata: object) {
  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    console.log("Metadata upload successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Metadata upload error:", error.response?.data || error.message);
    throw error;
  }
}