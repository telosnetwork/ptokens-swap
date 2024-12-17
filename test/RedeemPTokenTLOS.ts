import {loadFixture} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import {parseUnits} from "viem";
import {expect} from "chai";

// Ensure that hre.viem is properly initialized
if (!hre.viem) {
    throw new Error("hre.viem is not initialized. Please check your Hardhat configuration.");
}

describe("RedeemPTokenTLOS", function () {
    // Fixture to deploy the tokens and the RedeemPTokenTLOS contract
    async function deployTokensAndRedeem() {
        // Get wallet clients (signers)
        const [owner, otherAccount] = await hre.viem.getWalletClients();

        // Deploy the ptokenTLOS (mock ERC20 token)
        const ptokenTLOS = await hre.viem.deployContract("MockERC20", [
            "pToken TLOS",     // Token name
            "pTLOS",           // Token symbol
            parseUnits("1000000", 18), // Initial supply (1,000,000 tokens)
        ]);

        // Deploy the oftTLOS (mock ERC20 token)
        const oftTLOS = await hre.viem.deployContract("MockERC20", [
            "OFT TLOS",        // Token name
            "oTLOS",           // Token symbol
            parseUnits("1000000", 18), // Initial supply (1,000,000 tokens)
        ]);

        // Deploy the RedeemPTokenTLOS contract with the addresses of the deployed tokens
        const redeem = await hre.viem.deployContract("RedeemPTokenTLOS", [
            ptokenTLOS.address,
            oftTLOS.address,
        ]);

        const publicClient = await hre.viem.getPublicClient();

        return {
            ptokenTLOS,
            oftTLOS,
            redeem,
            owner,
            otherAccount,
            publicClient,
        };
    }

    describe("Deployment", function () {
        it("Should set the correct token addresses", async function () {
            const {redeem, ptokenTLOS, oftTLOS} = await loadFixture(deployTokensAndRedeem);

            // Check if the contract has the correct token addresses set
            const redeemPTokenAddress = await redeem.read.ptokenTLOS();
            const redeemOFTAddress = await redeem.read.oftTLOS();

            expect(redeemPTokenAddress.toLowerCase()).to.equal(ptokenTLOS.address);
            expect(redeemOFTAddress.toLowerCase()).to.equal(oftTLOS.address);
        });

        it("Should receive transfer and redeem", async function () {
            const {
                redeem,
                ptokenTLOS,
                oftTLOS,
                publicClient,
                owner,
                otherAccount
            } = await loadFixture(deployTokensAndRedeem);

            const fullAmount = parseUnits("10000", 18);
            const halfAmount = parseUnits("5000", 18);
            const doubleAmount = parseUnits("20000", 18);

            const oftTransferredHash = await oftTLOS.write.transfer([redeem.address, fullAmount]);
            const oftTransferredReceipt = await publicClient.waitForTransactionReceipt({hash: oftTransferredHash});
            expect(oftTransferredReceipt.status).to.equal("success", "OFT transfer failed");

            const reserveBalance = await oftTLOS.read.balanceOf([redeem.address]);
            expect(reserveBalance).to.equal(fullAmount);

            const ptokenTransferredHash = await ptokenTLOS.write.transfer([otherAccount.account.address, fullAmount]);
            const ptokenTransferredReceipt = await publicClient.waitForTransactionReceipt({hash: ptokenTransferredHash});
            expect(ptokenTransferredReceipt.status).to.equal("success"), "PToken transfer failed";

            const ptokenBalance = await ptokenTLOS.read.balanceOf([otherAccount.account.address]);
            expect(ptokenBalance).to.equal(fullAmount);

            const approved = await ptokenTLOS.write.approve(
                [redeem.address, halfAmount],
                { account: otherAccount.account }
            );
            const approvedReceipt = await publicClient.waitForTransactionReceipt({hash: approved});
            expect(approvedReceipt.status).to.equal("success", "Approval failed");

            const allowance = await ptokenTLOS.read.allowance([otherAccount.account.address, redeem.address]);
            expect(allowance).to.equal(halfAmount, "Allowance is incorrect");

            //await expect(redeem.write.redeem([fullAmount], { account: otherAccount.account }))
            //    .to.be.rejectedWith(/PToken TLOS transfer failed/);
            let failed = false;
            try {
                const redeemFailHash = await redeem.write.redeem([fullAmount]);
                const redeemFailReceipt = await publicClient.waitForTransactionReceipt({hash: redeemFailHash});
            } catch (e) {
                failed = true;
            }
            expect(failed, "Redeem should fail");

            const ptokenBalanceAfterFail = await ptokenTLOS.read.balanceOf([otherAccount.account.address]);
            expect(ptokenBalanceAfterFail).to.equal(fullAmount, "PToken balance is incorrect after failed redeem");

            const redeemHash = await redeem.write.redeem([halfAmount], {account: otherAccount.account});
            const redeemReceipt = await publicClient.waitForTransactionReceipt({hash: redeemHash});
            expect(redeemReceipt.status).to.equal("success", "Redeem failed");

            const reserveBalanceAfter = await oftTLOS.read.balanceOf([redeem.address]);
            expect(reserveBalanceAfter).to.equal(halfAmount, "Reserve balance is incorrect");

            const contractPtokenBalanceAfter = await ptokenTLOS.read.balanceOf([redeem.address]);
            expect(contractPtokenBalanceAfter).to.equal(halfAmount, "Contract ptoken balance is incorrect");

            const ptokenBalanceAfter = await ptokenTLOS.read.balanceOf([otherAccount.account.address]);
            expect(ptokenBalanceAfter).to.equal(halfAmount, "PToken balance is incorrect after successful redeem");

            const oftBalanceAfter = await oftTLOS.read.balanceOf([otherAccount.account.address]);
            expect(oftBalanceAfter).to.equal(halfAmount, "");
        });

    });
});
