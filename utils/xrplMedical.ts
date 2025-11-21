import { Client, Wallet, xrpToDrops } from "xrpl";

export async function writeMetadataToXRPL(metadataCid: string, doctorSeed: string) {
  const client = new Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();

  const doctorWallet = Wallet.fromSeed(doctorSeed);

  const memo = Buffer.from(
    JSON.stringify({ type: "MedicalRecord", metadataCid })
  ).toString("hex");

  const tx = {
    TransactionType: "Payment",
    Account: doctorWallet.address,
    Destination: doctorWallet.address, // self-send
    Amount: xrpToDrops("0.00001"),
    Memos: [{ Memo: { MemoData: memo } }],
  };

  const txResponse = await client.submitAndWait(tx, { wallet: doctorWallet });
  await client.disconnect();
  return txResponse.result.tx_json.hash;
}

export async function getPatientRecords(patientAddress: string) {
  const client = new Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();

  const transactions = await client.request({
    command: "account_tx",
    account: patientAddress,
    ledger_index_min: -1,
    ledger_index_max: -1,
    limit: 100,
  });

  const records = transactions.result.transactions
    .map((t: any) => t.tx.Memos?.[0]?.Memo?.MemoData)
    .filter(Boolean)
    .map((hex: string) => JSON.parse(Buffer.from(hex, "hex").toString()));

  await client.disconnect();
  return records;
}
