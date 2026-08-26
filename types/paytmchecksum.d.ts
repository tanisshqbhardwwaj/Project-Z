declare module "paytmchecksum" {
  const PaytmChecksum: {
    generateSignature(body: string, merchantKey: string): Promise<string>;
    verifySignature(body: string, merchantKey: string, checksum: string): Promise<boolean>;
  };
  export default PaytmChecksum;
}
