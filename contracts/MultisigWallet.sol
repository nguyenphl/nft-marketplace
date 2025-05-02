// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MultisigWallet is EIP712 {
    uint256 public required;
    bool private locked;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmationCount;
    }

    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;
    mapping(address => bool) public isOwner;

    event TransactionProposed(
        uint256 indexed transactionId,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionConfirmed(uint256 indexed transactionId, address indexed owner);
    event TransactionRevoked(uint256 indexed transactionId, address indexed owner);
    event TransactionExecuted(
        uint256 indexed transactionId,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionFailed(uint256 indexed transactionId, string reason);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    bytes32 private constant _TRANSACTION_CONFIRMATION =
        keccak256("ConfirmTransaction(uint256 transactionId)");

    constructor(address[] memory _owners, uint256 _required) EIP712("MultisigWallet", "Version 1") {
        require(_owners.length > 0, "Owners array is empty");
        require(_owners.length <= 50, "Owners array is too long");
        require(
            _required > 0 && _required <= _owners.length,
            "Invalid required number of confirmations"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Invalid owner address");
            isOwner[_owners[i]] = true;
        }
        required = _required;
    }

    function proposeTransaction(address to, uint256 value, bytes memory data) public onlyOwner {
        require(to != address(0), "Invalid address");

        transactions.push(
            Transaction({to: to, value: value, data: data, executed: false, confirmationCount: 0})
        );

        emit TransactionProposed(transactions.length - 1, to, value, data);

        _confirmTransaction(transactions.length - 1, msg.sender);
    }

    function confirmTransaction(uint256 transactionId) public onlyOwner {
        _confirmTransaction(transactionId, msg.sender);

        if (transactions[transactionId].confirmationCount >= required) {
            executeTransaction(transactionId);
        }
    }

    function _confirmTransaction(uint256 transactionId, address owner) internal {
        require(transactionId < transactions.length, "Invalid transaction ID");
        Transaction storage t = transactions[transactionId];
        require(!t.executed, "Transaction already executed");
        require(!isConfirmed[transactionId][owner], "Already confirmed");

        t.confirmationCount++;
        isConfirmed[transactionId][owner] = true;
        emit TransactionConfirmed(transactionId, owner);
    }

    function confirmTransaction(uint256 transactionId, bytes[] memory signature) public {
        for (uint256 i = 0; i < signature.length; i++) {
            address signer = getConfirmSigner(transactionId, signature[i]);
            require(isOwner[signer], "Not an owner");
            _confirmTransaction(transactionId, signer);
        }

        if (transactions[transactionId].confirmationCount >= required) {
            executeTransaction(transactionId);
        }
    }

    function getConfirmSigner(
        uint256 transactionId,
        bytes memory signature
    ) public view returns (address signer) {
        bytes32 hash = _hashTypedDataV4(
            keccak256(abi.encode(_TRANSACTION_CONFIRMATION, transactionId))
        );
        signer = ECDSA.recover(hash, signature);
    }

    function executeTransaction(uint256 transactionId) public nonReentrant {
        require(transactionId < transactions.length, "Invalid transaction ID");
        Transaction storage t = transactions[transactionId];
        require(!t.executed, "Transaction already executed");
        require(t.confirmationCount >= required, "Transaction not confirmed");

        t.executed = true;
        (bool success, ) = t.to.call{value: t.value}(t.data);
        if (success) {
            emit TransactionExecuted(transactionId, t.to, t.value, t.data);
        } else {
            t.executed = false;
            emit TransactionFailed(transactionId, "Execution failed");
        }
    }

    function revokeConfirmation(uint256 transactionId) public onlyOwner {
        require(transactionId < transactions.length, "Invalid transaction ID");
        Transaction storage t = transactions[transactionId];
        require(!t.executed, "Transaction already executed");
        require(isConfirmed[transactionId][msg.sender], "Transaction not confirmed");

        t.confirmationCount--;
        isConfirmed[transactionId][msg.sender] = false;
        emit TransactionRevoked(transactionId, msg.sender);
    }

    receive() external payable {}
}
