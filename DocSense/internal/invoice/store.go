package invoice

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
)

// ErrNotFound is returned when an invoice id is unknown.
var ErrNotFound = errors.New("invoice not found")

// Store is a thread-safe, in-memory invoice repository. It is idempotent on
// DedupKey so re-submitting the same vendor+number returns the original.
type Store struct {
	mu    sync.RWMutex
	byID  map[string]Invoice
	byKey map[string]string
	newID func() string
}

// NewStore builds an empty store.
func NewStore() *Store {
	return &Store{byID: map[string]Invoice{}, byKey: map[string]string{}, newID: randomID}
}

func randomID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return "inv_" + hex.EncodeToString(b)
}

// Save stores a new invoice, returning the stored copy and whether it was
// newly created. A duplicate DedupKey returns the existing invoice.
func (s *Store) Save(inv Invoice) (Invoice, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if existingID, ok := s.byKey[inv.DedupKey()]; ok {
		return s.byID[existingID], false
	}
	if inv.ID == "" {
		inv.ID = s.newID()
	}
	s.byID[inv.ID] = inv
	s.byKey[inv.DedupKey()] = inv.ID
	return inv, true
}

// Get returns an invoice by id.
func (s *Store) Get(id string) (Invoice, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	inv, ok := s.byID[id]
	return inv, ok
}

// Update replaces an existing invoice identified by its id.
func (s *Store) Update(inv Invoice) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.byID[inv.ID]; !ok {
		return ErrNotFound
	}
	s.byID[inv.ID] = inv
	return nil
}

// List returns all stored invoices.
func (s *Store) List() []Invoice {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Invoice, 0, len(s.byID))
	for _, inv := range s.byID {
		out = append(out, inv)
	}
	return out
}
