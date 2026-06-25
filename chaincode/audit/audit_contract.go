package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// AuditContract stores hash-only audit transactions on a Fabric ledger.
// It deliberately avoids nondeterministic logic such as local time and random values.
type AuditContract struct {
	contractapi.Contract
}

// AuditRecord is the ledger object stored by the audit chaincode.
type AuditRecord struct {
	AuditID       string `json:"audit_id"`
	RoundID       string `json:"round_id"`
	ClientID      string `json:"client_id"`
	ShardID       string `json:"shard_id"`
	UpdateHash    string `json:"update_hash"`
	PrototypeHash string `json:"prototype_hash"`
	MetadataJSON  string `json:"metadata_json"`
	CreatedAt     string `json:"created_at"`
	TxID          string `json:"tx_id"`
}

// RecordAudit writes one audit transaction. The timestamp is passed by the client
// so all endorsing peers execute deterministic chaincode logic.
func (s *AuditContract) RecordAudit(
	ctx contractapi.TransactionContextInterface,
	auditID string,
	roundID string,
	clientID string,
	shardID string,
	updateHash string,
	prototypeHash string,
	metadataJSON string,
	createdAt string,
) error {
	if strings.TrimSpace(auditID) == "" {
		return fmt.Errorf("auditID must not be empty")
	}
	if strings.TrimSpace(roundID) == "" {
		return fmt.Errorf("roundID must not be empty")
	}
	if strings.TrimSpace(clientID) == "" {
		return fmt.Errorf("clientID must not be empty")
	}
	if strings.TrimSpace(updateHash) == "" || strings.TrimSpace(prototypeHash) == "" {
		return fmt.Errorf("updateHash and prototypeHash must not be empty")
	}
	if !json.Valid([]byte(metadataJSON)) {
		return fmt.Errorf("metadataJSON must be a valid JSON string")
	}

	exists, err := s.AuditExists(ctx, auditID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("audit record %s already exists", auditID)
	}

	record := AuditRecord{
		AuditID:       auditID,
		RoundID:       roundID,
		ClientID:      clientID,
		ShardID:       shardID,
		UpdateHash:    updateHash,
		PrototypeHash: prototypeHash,
		MetadataJSON:  metadataJSON,
		CreatedAt:     createdAt,
		TxID:          ctx.GetStub().GetTxID(),
	}

	recordBytes, err := json.Marshal(record)
	if err != nil {
		return err
	}

	if err := ctx.GetStub().PutState(auditID, recordBytes); err != nil {
		return err
	}

	roundIndexKey, err := ctx.GetStub().CreateCompositeKey("round~audit", []string{roundID, auditID})
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(roundIndexKey, []byte{0x00})
}

// QueryAudit returns one audit record by id.
func (s *AuditContract) QueryAudit(ctx contractapi.TransactionContextInterface, auditID string) (*AuditRecord, error) {
	recordBytes, err := ctx.GetStub().GetState(auditID)
	if err != nil {
		return nil, fmt.Errorf("failed to read audit record %s: %v", auditID, err)
	}
	if recordBytes == nil {
		return nil, fmt.Errorf("audit record %s does not exist", auditID)
	}

	var record AuditRecord
	if err := json.Unmarshal(recordBytes, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

// QueryByRound returns all audit records in a federated-learning round.
func (s *AuditContract) QueryByRound(ctx contractapi.TransactionContextInterface, roundID string) ([]*AuditRecord, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("round~audit", []string{roundID})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var records []*AuditRecord
	for iterator.HasNext() {
		item, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		_, parts, err := ctx.GetStub().SplitCompositeKey(item.Key)
		if err != nil {
			return nil, err
		}
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid composite key: %s", item.Key)
		}

		record, err := s.QueryAudit(ctx, parts[1])
		if err != nil {
			return nil, err
		}
		records = append(records, record)
	}
	return records, nil
}

// AuditExists checks whether an audit id already exists.
func (s *AuditContract) AuditExists(ctx contractapi.TransactionContextInterface, auditID string) (bool, error) {
	recordBytes, err := ctx.GetStub().GetState(auditID)
	if err != nil {
		return false, err
	}
	return recordBytes != nil, nil
}
