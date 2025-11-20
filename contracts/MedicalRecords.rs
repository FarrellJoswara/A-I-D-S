#![no_std]
use soroban_sdk::{contractimpl, vec, Address, Env, Vec, Map, Symbol, BytesN};

#[derive(Clone)]
pub struct MedicalRecord {
    pub id: u32,
    pub patient: Address,
    pub institution: Address,
    pub ipfs_cid: String,
    pub file_hash: BytesN<32>,
    pub prev_record_id: u32,
}

#[derive(Clone)]
pub struct Permission {
    pub can_view: bool,
    pub can_update: bool,
    pub expiry: u64, // Unix timestamp, 0 = no expiry
}

pub struct MedicalRecordsContract;

#[contractimpl]
impl MedicalRecordsContract {
    // Initialize owner
    pub fn initialize(env: Env, owner: Address) {
        env.storage().set(&Symbol::short("owner"), &owner);
        env.storage().set(&Symbol::short("next_id"), &1u32);
    }

    fn owner(env: &Env) -> Address {
        env.storage().get_unchecked(&Symbol::short("owner")).unwrap()
    }

    fn next_id(env: &Env) -> u32 {
        env.storage().get_unchecked(&Symbol::short("next_id")).unwrap()
    }

    fn increment_next_id(env: &Env) {
        let next_id = Self::next_id(env) + 1;
        env.storage().set(&Symbol::short("next_id"), &next_id);
    }

    // Key helpers
    fn record_key(record_id: u32) -> Vec<u8> {
        let mut key = Vec::new();
        key.extend_from_slice(b"record:");
        key.extend_from_slice(&record_id.to_be_bytes());
        key
    }

    fn permission_key(record_id: u32, user: &Address) -> Vec<u8> {
        let mut key = Vec::new();
        key.extend_from_slice(b"perm:");
        key.extend_from_slice(&record_id.to_be_bytes());
        key.extend_from_slice(user.to_bytes().as_slice());
        key
    }

    // Access control
    fn only_owner(env: &Env) {
        let invoker = env.invoker();
        if invoker != Self::owner(env) {
            panic!("Only owner can call this");
        }
    }

    fn only_patient(env: &Env, record: &MedicalRecord) {
        let invoker = env.invoker();
        if invoker != record.patient {
            panic!("Only patient can call this");
        }
    }

    // =====================================
    // CORE FUNCTIONS
    // =====================================

    pub fn add_record(
        env: Env,
        patient: Address,
        ipfs_cid: String,
        file_hash: BytesN<32>,
        prev_record_id: u32,
    ) -> u32 {
        let invoker = env.invoker();
        // Check if invoker is authorized institution
        let institutions: Vec<Address> = env.storage().get(&Symbol::short("institutions")).unwrap_or_default();
        if !institutions.contains(&invoker) {
            panic!("Not authorized institution");
        }

        let record_id = Self::next_id(&env);
        Self::increment_next_id(&env);

        let record = MedicalRecord {
            id: record_id,
            patient: patient.clone(),
            institution: invoker.clone(),
            ipfs_cid: ipfs_cid.clone(),
            file_hash: file_hash.clone(),
            prev_record_id,
        };

        env.storage().set(&Self::record_key(record_id), &record);

        // Patient always has access
        let perm = Permission { can_view: true, can_update: true, expiry: 0 };
        env.storage().set(&Self::permission_key(record_id, &patient), &perm);

        env.events().publish((Symbol::short("RecordAdded"),), record_id);

        record_id
    }

    pub fn grant_access(env: Env, record_id: u32, user: Address, expiry: u64) {
        let record: MedicalRecord = env.storage().get_unchecked(&Self::record_key(record_id)).unwrap();
        Self::only_patient(&env, &record);

        let perm = Permission { can_view: true, can_update: false, expiry };
        env.storage().set(&Self::permission_key(record_id, &user), &perm);

        env.events().publish((Symbol::short("AccessGranted"),), (record_id, user));
    }

    pub fn revoke_access(env: Env, record_id: u32, user: Address) {
        let record: MedicalRecord = env.storage().get_unchecked(&Self::record_key(record_id)).unwrap();
        Self::only_patient(&env, &record);

        let perm = Permission { can_view: false, can_update: false, expiry: 0 };
        env.storage().set(&Self::permission_key(record_id, &user), &perm);

        env.events().publish((Symbol::short("AccessRevoked"),), (record_id, user));
    }

    pub fn has_valid_permission(env: Env, record_id: u32, user: Address) -> bool {
        let perm: Option<Permission> = env.storage().get(&Self::permission_key(record_id, &user));
        if perm.is_none() { return false; }
        let perm = perm.unwrap();
        if !perm.can_view { return false; }
        if perm.expiry != 0 && perm.expiry < env.ledger().timestamp() { return false; }
        true
    }

    pub fn record_viewed(env: Env, record_id: u32) {
        let record: MedicalRecord = env.storage().get_unchecked(&Self::record_key(record_id)).unwrap();
        let invoker = env.invoker();
        if invoker != record.patient && !Self::has_valid_permission(env.clone(), record_id, invoker.clone()) {
            panic!("No permission or permission expired");
        }

        env.events().publish((Symbol::short("RecordViewed"),), record_id);
    }

    pub fn update_record(
        env: Env,
        prev_record_id: u32,
        ipfs_cid: String,
        file_hash: BytesN<32>,
    ) -> u32 {
        let prev_record: MedicalRecord = env.storage().get_unchecked(&Self::record_key(prev_record_id)).unwrap();

        let invoker = env.invoker();
        if invoker != prev_record.patient && !Self::has_valid_permission(env.clone(), prev_record_id, invoker.clone()) {
            panic!("No permission or expired");
        }

        let new_id = Self::next_id(&env);
        Self::increment_next_id(&env);

        let new_record = MedicalRecord {
            id: new_id,
            patient: prev_record.patient.clone(),
            institution: invoker.clone(),
            ipfs_cid,
            file_hash,
            prev_record_id,
        };

        env.storage().set(&Self::record_key(new_id), &new_record);
        env.events().publish((Symbol::short("RecordUpdated"),), (prev_record_id, new_id));

        new_id
    }

    pub fn get_record_metadata(env: Env, record_id: u32) -> MedicalRecord {
        env.storage().get_unchecked(&Self::record_key(record_id)).unwrap()
    }
}
