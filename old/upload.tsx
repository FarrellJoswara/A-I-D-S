// UploadDownloadScreen.tsx
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text } from 'react-native';

export default function UploadDownloadScreen() {
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload file to Pinata
  const uploadFile = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.type !== 'success') {
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        name: result.name,  
        type: 'application/octet-stream',
      } as any);

      const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            pinata_api_key: 'YOUR_API_KEY',
            pinata_secret_api_key: 'YOUR_API_SECRET',
          },
        }
      );

      setIpfsHash(res.data.IpfsHash);
    } catch (err) {
      console.error('Upload error:', err);
    }
    setLoading(false);
  };

  // Download file from Pinata using IPFS hash
  const downloadUrl = ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={loading ? 'Uploading...' : 'Pick & Upload File'} onPress={uploadFile} disabled={loading} />

      {ipfsHash && (
        <>
          <Text style={styles.hashText}>IPFS Hash: {ipfsHash}</Text>
          {/* Display image if the file is an image */}
          <Image source={{ uri: downloadUrl! }} style={styles.image} />
          <Text>File URL: {downloadUrl}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hashText: {
    marginTop: 20,
    fontWeight: 'bold',
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 20,
    resizeMode: 'contain',
  },
});
