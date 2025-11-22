export type MedicalRecord = {
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
};

class UploadStorage {
  private records: MedicalRecord[] = [];

  addRecord(record: MedicalRecord) {
    this.records.push(record);
    console.log('Added record to storage:', record);
  }

  getRecordsForPatient(patientWallet: string): MedicalRecord[] {
    return this.records.filter(record => record.patientWallet === patientWallet)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getRecordsForDoctor(doctorWallet: string): MedicalRecord[] {
    return this.records.filter(record => record.doctorWallet === doctorWallet)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllRecords(): MedicalRecord[] {
    return [...this.records].sort((a, b) => b.timestamp - a.timestamp);
  }

  clear() {
    this.records = [];
  }
}

export const uploadStorage = new UploadStorage();