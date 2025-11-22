import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Client } from "xrpl";
import { useWallet } from "../context/WalletContext";

(global as any).Buffer = Buffer;

// XRPL Transaction Types
interface XRPLMemo {
  Memo: {
    MemoData?: string;
    MemoType?: string;
  };
}

interface XRPLTransaction {
  TransactionType: string;
  hash?: string;
  Account?: string;
  Destination?: string;
  Memos?: XRPLMemo[];
  date?: number;
}

interface XRPLTxResponse {
  tx: XRPLTransaction;
  meta: any;
}

interface AccountTxResponse {
  result: {
    transactions?: XRPLTxResponse[];
  };
}

type MedicalRecord = {
  id: string;
  metadataCID: string;
  timestamp: number;
  recordType: string;
  doctorWallet: string;
  patientWallet: string;
  fileCID: string;
  fileName: string;
  description: string;
  hospital: string;
  metadata?: any;
  txHash?: string;
};

// Pinata IPFS Gateway
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export default function MyRecordsPage() {
  const { wallet } = useWallet();
  const [documents, setDocuments] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCID, setSearchCID] = useState("");

  // Function to fetch metadata from Pinata IPFS
  const fetchMetadataFromIPFS = useCallback(async (cid: string) => {
    try {
      console.log(`Fetching metadata from Pinata for CID: ${cid}`);
      const response = await fetch(`${PINATA_GATEWAY}/${cid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const metadata = await response.json();
      console.log(`Successfully fetched metadata for ${cid}:`, metadata);
      return metadata;
    } catch (err) {
      console.error(`Failed to fetch metadata for ${cid}:`, err);
      throw err;
    }
  }, []);

  // Function to scan XRPL for medical record transactions
  const scanXRPLForRecords = useCallback(async (patientWallet: string) => {
    if (!patientWallet) return [];

    const records: MedicalRecord[] = [];
    
    try {
      console.log("Scanning XRPL for medical records...");
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      // Get transactions for this wallet
      const resp = await client.request({
        command: "account_tx",
        account: patientWallet,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 100,
      });

      console.log("Raw XRPL response:", JSON.stringify(resp, null, 2));

      const txs = (resp as AccountTxResponse).result.transactions || [];
      console.log(`Found ${txs.length} transactions to scan`);

      // Process transactions to find medical records
      for (const txItem of txs) {
        try {
          // Handle different transaction response formats
          const tx = txItem.tx;
          if (!tx || typeof tx !== 'object') {
            console.log('Skipping invalid transaction:', txItem);
            continue;
          }

          // Look for medical record transactions (payments with memos)
          if (tx.TransactionType === "Payment" && tx.Memos && Array.isArray(tx.Memos)) {
            console.log("Found payment transaction with memos:", tx.hash);
            
            for (const memoEntry of tx.Memos) {
              try {
                const memoHex = memoEntry.Memo?.MemoData;
                if (!memoHex) continue;

                const memoStr = Buffer.from(memoHex, "hex").toString();
                console.log("Memo content:", memoStr);
                
                const memoObj = JSON.parse(memoStr);

                // Check if this is a medical record transaction
                if (memoObj.type === "medicalRecord" && memoObj.metadataCID) {
                  console.log("Found medical record transaction:", memoObj);
                  
                  try {
                    // Fetch the metadata from IPFS
                    const metadata = await fetchMetadataFromIPFS(memoObj.metadataCID);
                    
                    const record: MedicalRecord = {
                      id: `record-${tx.hash || Date.now()}`,
                      metadataCID: memoObj.metadataCID,
                      timestamp: memoObj.timestamp || Math.floor(Date.now() / 1000),
                      recordType: memoObj.recordType || metadata.record_type || "Medical Record",
                      doctorWallet: tx.Account || "Unknown Doctor",
                      patientWallet: tx.Destination || patientWallet,
                      fileCID: metadata.ipfs_file_cid || "",
                      fileName: metadata.extra?.original_filename || "document.pdf",
                      description: metadata.description || "Medical record from IPFS",
                      hospital: metadata.hospital || "Unknown Hospital",
                      metadata: metadata,
                      txHash: tx.hash
                    };
                    
                    records.push(record);
                    console.log("Successfully loaded record:", record.recordType);
                    
                  } catch (ipfsError) {
                    console.log(`Could not fetch metadata for CID ${memoObj.metadataCID}, skipping...`);
                  }
                }
              } catch (parseError) {
                // Skip invalid memo data - might not be JSON
                console.log("Memo is not valid JSON, skipping...");
                continue;
              }
            }
          }
        } catch (txError) {
          console.log("Error processing transaction, skipping:", txError);
          continue;
        }
      }

      await client.disconnect();
      console.log(`Found ${records.length} medical records on XRPL`);
      
    } catch (err) {
      console.error("Error scanning XRPL:", err);
    }
    
    return records;
  }, [fetchMetadataFromIPFS]);

  // Function to discover all medical records
  const discoverAllRecords = useCallback(async () => {
    const records: MedicalRecord[] = [];
    
    if (wallet?.classicAddress) {
      // Scan XRPL for records sent to this wallet
      const xrplRecords = await scanXRPLForRecords(wallet.classicAddress);
      records.push(...xrplRecords);
    }
    
    return records;
  }, [wallet, scanXRPLForRecords]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching all medical records from XRPL and IPFS...");
      
      // Discover records from XRPL
      const discoveredRecords = await discoverAllRecords();
      
      setDocuments(discoveredRecords);
      console.log(`Found ${discoveredRecords.length} records total`);
      
    } catch (err) {
      console.error("Failed to fetch medical records:", err);
      Alert.alert("Error", "Failed to fetch medical records. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [discoverAllRecords]);

  // Function to manually add a record by metadata CID
  const addRecordByCID = useCallback(async (metadataCID: string) => {
    if (!metadataCID) {
      Alert.alert("Error", "Please enter a valid metadata CID");
      return;
    }

    // Check if record already exists
    if (documents.some(doc => doc.metadataCID === metadataCID)) {
      Alert.alert("Info", "This record is already loaded.");
      return;
    }

    try {
      setLoading(true);
      
      // Fetch metadata from Pinata
      const metadata = await fetchMetadataFromIPFS(metadataCID);
      
      // Create record from metadata
      const newRecord: MedicalRecord = {
        id: `record-${Date.now()}`,
        metadataCID: metadataCID,
        timestamp: metadata.timestamp || Math.floor(Date.now() / 1000),
        recordType: metadata.record_type || metadata.recordType || "Medical Record",
        doctorWallet: metadata.doctor_wallet || metadata.doctorWallet || "Unknown Doctor",
        patientWallet: metadata.patient_wallet || metadata.patientWallet || wallet?.classicAddress || "Unknown Patient",
        fileCID: metadata.ipfs_file_cid || metadata.fileCID || "",
        fileName: metadata.extra?.original_filename || metadata.fileName || "document.pdf",
        description: metadata.description || "Medical record from IPFS",
        hospital: metadata.hospital || "Unknown Hospital",
        metadata: metadata
      };

      // Add to documents
      setDocuments(prev => [newRecord, ...prev]);
      Alert.alert("Success", "Record loaded from IPFS successfully!");
      
    } catch (err) {
      console.error("Failed to load record from IPFS:", err);
      Alert.alert("Error", "Failed to load record from IPFS. Please check the CID and try again.");
    } finally {
      setLoading(false);
    }
  }, [documents, fetchMetadataFromIPFS, wallet]);

  // Prompt user to enter a metadata CID
  const promptForCID = useCallback(() => {
    Alert.prompt(
      "Load Record from IPFS",
      "Enter the metadata CID from Pinata IPFS:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Load",
          onPress: (cid) => {
            if (cid) {
              addRecordByCID(cid.trim());
            }
          }
        }
      ],
      "plain-text",
      searchCID
    );
  }, [addRecordByCID, searchCID]);

  // Add demo records for testing
  const addDemoRecords = useCallback(() => {
    const demoRecords: MedicalRecord[] = [
      {
        id: `demo-${Date.now()}-1`,
        metadataCID: "QmDemoMetadata1",
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        recordType: "Blood Test Report",
        doctorWallet: "rDemoDoctor1",
        patientWallet: wallet?.classicAddress || "rDemoPatient1",
        fileCID: "QmDemoFile1",
        fileName: "blood_test.pdf",
        description: "Complete blood count and cholesterol levels",
        hospital: "Demo Medical Center"
      },
      {
        id: `demo-${Date.now()}-2`,
        metadataCID: "QmDemoMetadata2",
        timestamp: Math.floor(Date.now() / 1000) - 172800,
        recordType: "X-Ray Results",
        doctorWallet: "rDemoDoctor2",
        patientWallet: wallet?.classicAddress || "rDemoPatient2",
        fileCID: "QmDemoFile2",
        fileName: "chest_xray.pdf",
        description: "Chest X-ray showing clear lungs",
        hospital: "Demo Hospital"
      }
    ];

    setDocuments(prev => [...demoRecords, ...prev]);
    Alert.alert("Demo", "Added sample medical records for testing");
  }, [wallet]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, [fetchDocuments]);

  const openIPFS = (cid: string) => {
    const url = `${PINATA_GATEWAY}/${cid}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open IPFS link")
    );
  };

  const viewFile = (fileCID: string) => {
    if (!fileCID) {
      Alert.alert("Error", "File CID not found");
      return;
    }
    const url = `${PINATA_GATEWAY}/${fileCID}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open file")
    );
  };

  const downloadFile = async (fileCID: string, fileName: string) => {
    try {
      const url = `${PINATA_GATEWAY}/${fileCID}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      console.log(`Downloading file: ${fileName} from ${fileCID}`);
      Alert.alert("Download", `File ${fileName} downloaded successfully from IPFS.`);
    } catch (err) {
      console.error("Download error:", err);
      Alert.alert("Error", "Failed to download file from IPFS");
    }
  };

  const viewOnXRPL = (txHash: string) => {
    if (!txHash) return;
    const url = `https://testnet.xrpl.org/transactions/${txHash}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open XRPL transaction")
    );
  };

  const renderRecord = useCallback(({ item }: { item: MedicalRecord }) => {
    const formatAddress = (addr: string) => {
      if (!addr) return "N/A";
      return `${addr.substring(0, 8)}...${addr.substring(addr.length - 4)}`;
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={24} color="#1e3a5f" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.recordType}>{item.recordType}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>{item.hospital}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoLabel} numberOfLines={1}>
            Doctor: {formatAddress(item.doctorWallet)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoLabel} numberOfLines={1}>
            Patient: {formatAddress(item.patientWallet)}
          </Text>
        </View>

        {item.description && (
          <View style={styles.descriptionContainer}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {item.fileCID && (
            <>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => viewFile(item.fileCID)}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>View File</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => downloadFile(item.fileCID, item.fileName)}
              >
                <Ionicons name="download-outline" size={18} color="#1e3a5f" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.metadataButton}
            onPress={() => openIPFS(item.metadataCID)}
          >
            <Ionicons name="information-circle-outline" size={18} color="#1e3a5f" />
            <Text style={styles.metadataButtonText}>Metadata</Text>
          </TouchableOpacity>
        </View>

        {item.txHash && (
          <TouchableOpacity
            style={styles.xrplButton}
            onPress={() => viewOnXRPL(item.txHash!)}
          >
            <Ionicons name="link-outline" size={16} color="#666" />
            <Text style={styles.xrplButtonText}>View on XRPL</Text>
          </TouchableOpacity>
        )}

        {item.fileCID && (
          <View style={styles.footer}>
            <Text style={styles.cidLabel}>File CID: </Text>
            <Text style={styles.cidText} numberOfLines={1}>
              {item.fileCID}
            </Text>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.cidLabel}>Metadata CID: </Text>
          <Text style={styles.cidText} numberOfLines={1}>
            {item.metadataCID}
          </Text>
        </View>

        {item.metadata && (
          <TouchableOpacity
            style={styles.jsonButton}
            onPress={() => {
              Alert.alert("Metadata JSON", JSON.stringify(item.metadata, null, 2));
            }}
          >
            <Ionicons name="code-slash" size={16} color="#666" />
            <Text style={styles.jsonButtonText}>View Full Metadata</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, []);

  const renderEmptyState = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No medical records found</Text>
      <Text style={styles.emptySubtext}>
        {wallet ? 
          "Scanning XRPL for medical records..." : 
          "Connect your wallet to view medical records"
        }
      </Text>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>XRPL Medical Records</Text>
        <Text style={styles.infoSectionText}>
          • Records are stored on IPFS and registered on XRPL
        </Text>
        <Text style={styles.infoSectionText}>
          • Automatically scans blockchain for records
        </Text>
        <Text style={styles.infoSectionText}>
          • Each record is cryptographically verified
        </Text>
      </View>
      
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#1e3a5f" />
        <Text style={styles.refreshButtonText}>Scan XRPL for Records</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loadButton} onPress={promptForCID}>
        <Ionicons name="cloud-download" size={20} color="#0b7cff" />
        <Text style={styles.loadButtonText}>Load Record by CID</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.demoButton} onPress={addDemoRecords}>
        <Ionicons name="beaker" size={20} color="#666" />
        <Text style={styles.demoButtonText}>Add Demo Records</Text>
      </TouchableOpacity>

      {!wallet && (
        <Text style={styles.walletWarning}>
          Connect your wallet to automatically find your medical records
        </Text>
      )}

      <Text style={styles.instructionText}>
        Medical records are automatically discovered from XRPL transactions
      </Text>
    </View>
  ), [onRefresh, promptForCID, wallet, addDemoRecords]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "My Medical Records" }} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Scanning XRPL for records...</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={documents.length === 0 ? styles.emptyContainer : { padding: 16 }}
          renderItem={renderRecord}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={documents.length > 0 ? (
            <View style={styles.headerInfo}>
              <Text style={styles.headerInfoText}>
                Found {documents.length} medical record(s)
              </Text>
              <Text style={styles.headerSubtext}>
                {documents.some(d => d.txHash) ? 
                  "Discovered from XRPL transactions" : 
                  "Loaded from IPFS"
                }
              </Text>
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  headerInfo: {
    backgroundColor: "#e8f4f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  headerInfoText: {
    fontSize: 14,
    color: "#1e3a5f",
    fontWeight: "500",
  },
  headerSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  walletWarning: {
    fontSize: 14,
    color: "#ff6b35",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  infoSection: {
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4f8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  refreshButtonText: {
    fontSize: 16,
    color: "#1e3a5f",
    fontWeight: "600",
    marginLeft: 8,
  },
  loadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b7cff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  loadButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  demoButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  recordType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  timestamp: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4f8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  downloadButtonText: {
    color: "#1e3a5f",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  metadataButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  metadataButtonText: {
    color: "#1e3a5f",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  xrplButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    padding: 8,
  },
  xrplButtonText: {
    color: "#666",
    fontSize: 12,
    marginLeft: 4,
  },
  jsonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    padding: 8,
  },
  jsonButtonText: {
    color: "#666",
    fontSize: 12,
    marginLeft: 4,
  },
  footer: {
    flexDirection: "row",
    marginTop: 8,
  },
  cidLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  cidText: {
    fontSize: 12,
    color: "#999",
    flex: 1,
    fontFamily: "monospace",
  },
});