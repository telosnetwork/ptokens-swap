import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RedeemPTokenTLOSModule = buildModule("RedeemPTokenTLOSModule", (m) => {

  const redeem = m.contract("RedeemPTokenTLOS", [], {
  });

  return { redeem };
});

export default RedeemPTokenTLOSModule;
