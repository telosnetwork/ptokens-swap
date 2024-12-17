// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RedeemPTokenTLOS is Ownable {
    IERC20 public ptokenTLOS;
    IERC20 public oftTLOS;

    event TokensRedeemed(address indexed user, uint256 amount);

    /**
     * @dev Sets the `ptokenTLOS` and `oftTLOS` contracts.
     */
    constructor(IERC20 _ptokenTLOS, IERC20 _oftTLOS) Ownable(msg.sender) {
        ptokenTLOS = _ptokenTLOS;
        oftTLOS = _oftTLOS;
    }

    /**
     * @dev Redeem function for 1:1 exchange of `ptokenTLOS` for `oftTLOS`.
     * The user must approve this contract to spend their `ptokenTLOS` before calling this function.
     * The contract must have enough `oftTLOS` balance to complete the redemption.
     */
    function redeem(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(
            oftTLOS.balanceOf(address(this)) >= amount,
            "Insufficient OFT TLOS tokens in contract"
        );

        // Transfer `paymentToken` from user to the contract
        require(
            ptokenTLOS.transferFrom(msg.sender, address(this), amount),
            "PToken TLOS transfer failed"
        );

        // Send `oftTLOS` to the user
        require(
            oftTLOS.transfer(msg.sender, amount),
            "Reward token transfer failed"
        );

        emit TokensRedeemed(msg.sender, amount);
    }

    /**
     * @dev Allows the owner to withdraw `paymentToken` accumulated in the contract.
     */
    function withdrawPTokens(uint256 amount) external onlyOwner {
        require(
            ptokenTLOS.transfer(owner(), amount),
            "Withdrawal of ptokenTLOS failed"
        );
    }

    /**
     * @dev Allows the owner to withdraw `rewardToken` from the contract.
     */
    function withdrawOFTokens(uint256 amount) external onlyOwner {
        require(
            oftTLOS.transfer(owner(), amount),
            "Withdrawal of oftTLOS failed"
        );
    }

}
