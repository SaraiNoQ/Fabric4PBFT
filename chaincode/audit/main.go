package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
	chaincode, err := contractapi.NewChaincode(new(AuditContract))
	if err != nil {
		log.Panicf("failed to create audit chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("failed to start audit chaincode: %v", err)
	}
}
