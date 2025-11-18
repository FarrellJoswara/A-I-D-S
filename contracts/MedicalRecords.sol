// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title MedicalRecords
 * @dev Fully functional medical record smart contract with auth, expiry, and versioning
 */
contract MedicalRecords {

    // =============================================
    // STRUCTS
    // =============================================
    
    struct MedicalRecord {
        uint256 id;
        address patient;
        address institution;
        string ipfsCID;
        bytes32 fileHash;
        uint256 timestamp;
        uint256 prevRecordId;
    }

    struct Permission {
        bool canView;
        bool canUpdate;
        uint256 expiry;  // Unix timestamp for expiry, 0 = no expiry
    }

    // =============================================
    // STORAGE
    // =============================================

    uint256 public nextRecordId = 1;
    mapping(uint256 => MedicalRecord) public records;
    mapping(uint256 => mapping(address => Permission)) public permissions;

    mapping(address => bool) public institutions; // authorized institutions
    address public owner;

    // =============================================
    // EVENTS
    // =============================================

    event RecordAdded(uint256 indexed recordId, address indexed patient, address indexed institution, string ipfsCID, bytes32 fileHash, uint256 prevRecordId, uint256 timestamp);
    event AccessGranted(uint256 indexed recordId, address indexed patient, address indexed institution, uint256 expiry, uint256 timestamp);
    event AccessRevoked(uint256 indexed recordId, address indexed patient, address indexed institution, uint256 timestamp);
    event RecordViewed(uint256 indexed recordId, address indexed viewer, uint256 timestamp);
    event RecordUpdated(uint256 indexed recordId, uint256 newRecordId, address indexed updater, uint256 timestamp);
    event InstitutionAdded(address indexed institution);

    // =============================================
    // MODIFIERS
    // =============================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyInstitution() {
        require(institutions[msg.sender], "Not authorized institution");
        _;
    }

    modifier onlyPatient(uint256 recordId) {
        require(records[recordId].patient == msg.sender, "Only patient can perform this");
        _;
    }

    modifier recordExists(uint256 recordId) {
        require(recordId > 0 && recordId < nextRecordId, "Record does not exist");
        _;
    }

    // =============================================
    // CONSTRUCTOR
    // =============================================

    constructor() {
        owner = msg.sender;
    }

    function addInstitution(address _institution) external onlyOwner {
        institutions[_institution] = true;
        emit InstitutionAdded(_institution);
    }

    // =============================================
    // CORE FUNCTIONS
    // =============================================

    function addRecord(
        address patient,
        string calldata ipfsCID,
        bytes32 fileHash,
        uint256 prevRecordId
    ) external onlyInstitution returns (uint256) {
        require(patient != address(0), "Invalid patient");
        require(bytes(ipfsCID).length > 0, "IPFS CID required");
        require(fileHash != bytes32(0), "File hash required");
        if (prevRecordId != 0) {
            require(prevRecordId < nextRecordId, "Invalid previous record ID");
        }

        uint256 newRecordId = nextRecordId++;
        records[newRecordId] = MedicalRecord({
            id: newRecordId,
            patient: patient,
            institution: msg.sender,
            ipfsCID: ipfsCID,
            fileHash: fileHash,
            timestamp: block.timestamp,
            prevRecordId: prevRecordId
        });

        // Patient always has access
        permissions[newRecordId][patient] = Permission(true, true, 0);

        emit RecordAdded(newRecordId, patient, msg.sender, ipfsCID, fileHash, prevRecordId, block.timestamp);
        return newRecordId;
    }

    function grantAccess(uint256 recordId, address user, uint256 expiry) 
        external 
        recordExists(recordId) 
        onlyPatient(recordId) 
    {
        permissions[recordId][user] = Permission(true, false, expiry);
        emit AccessGranted(recordId, msg.sender, user, expiry, block.timestamp);
    }

    function revokeAccess(uint256 recordId, address user)
        external
        recordExists(recordId)
        onlyPatient(recordId)
    {
        permissions[recordId][user] = Permission(false, false, 0);
        emit AccessRevoked(recordId, msg.sender, user, block.timestamp);
    }

    function hasValidPermission(uint256 recordId, address user) public view returns (bool) {
        Permission memory p = permissions[recordId][user];
        if (!p.canView) return false;
        if (p.expiry != 0 && block.timestamp > p.expiry) return false;
        return true;
    }

    function recordViewed(uint256 recordId)
        external
        recordExists(recordId)
    {
        require(
            msg.sender == records[recordId].patient || hasValidPermission(recordId, msg.sender),
            "No permission or permission expired"
        );
        emit RecordViewed(recordId, msg.sender, block.timestamp);
    }

    function updateRecord(
        uint256 prevRecordId,
        string calldata ipfsCID,
        bytes32 fileHash
    ) external recordExists(prevRecordId) returns (uint256) {
        MedicalRecord memory prevRecord = records[prevRecordId];

        // Only patient or valid permission can update
        require(
            msg.sender == prevRecord.patient || hasValidPermission(prevRecordId, msg.sender),
            "No permission or expired"
        );

        uint256 newRecordId = nextRecordId++;
        records[newRecordId] = MedicalRecord({
            id: newRecordId,
            patient: prevRecord.patient,
            institution: msg.sender,
            ipfsCID: ipfsCID,
            fileHash: fileHash,
            timestamp: block.timestamp,
            prevRecordId: prevRecordId
        });

        permissions[newRecordId][prevRecord.patient] = Permission(true, true, 0);

        emit RecordUpdated(prevRecordId, newRecordId, msg.sender, block.timestamp);
        emit RecordAdded(newRecordId, prevRecord.patient, msg.sender, ipfsCID, fileHash, prevRecordId, block.timestamp);
        return newRecordId;
    }

    function getRecordMetadata(uint256 recordId) external view recordExists(recordId) returns (MedicalRecord memory) {
        return records[recordId];
    }

    function getRecordsForPatient(uint256 start, uint256 count, address patient) external view returns (MedicalRecord[] memory) {
        MedicalRecord[] memory results = new MedicalRecord[](count);
        uint256 resultsIndex = 0;
        for (uint256 i = start; i < nextRecordId && resultsIndex < count; i++) {
            if (records[i].patient == patient) {
                results[resultsIndex] = records[i];
                resultsIndex++;
            }
        }
        return results;
    }
}
