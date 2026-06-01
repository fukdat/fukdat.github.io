// Package httpapi exposes the invoice service over HTTP using only stdlib.
package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"docsense/internal/extract"
	"docsense/internal/invoice"
)

// Server wires the store and the available extractors into HTTP handlers.
type Server struct {
	store      *invoice.Store
	extractors map[string]extract.Extractor
}

// NewServer constructs a Server.
func NewServer(store *invoice.Store, extractors map[string]extract.Extractor) *Server {
	return &Server{store: store, extractors: extractors}
}

// Handler returns the configured router.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /invoices", s.create)
	mux.HandleFunc("GET /invoices", s.list)
	mux.HandleFunc("GET /invoices/{id}", s.get)
	mux.HandleFunc("POST /invoices/{id}/approve", s.approve)
	mux.HandleFunc("POST /invoices/{id}/reject", s.reject)
	mux.HandleFunc("GET /invoices/{id}/export", s.export)
	return mux
}

type createRequest struct {
	Text      string `json:"text"`
	Extractor string `json:"extractor"`
}

type invoiceResponse struct {
	Invoice invoice.Invoice `json:"invoice"`
	Issues  []invoice.Issue `json:"issues"`
}

func (s *Server) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Text == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "text is required")
		return
	}
	name := req.Extractor
	if name == "" {
		name = "rulebased"
	}
	extractor, ok := s.extractors[name]
	if !ok {
		writeError(w, http.StatusBadRequest, "validation_error", "unknown extractor: "+name)
		return
	}

	inv, err := extractor.Extract(r.Context(), req.Text)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "extraction_failed", err.Error())
		return
	}
	inv.Status = invoice.StatusNeedsReview

	stored, created := s.store.Save(inv)
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, invoiceResponse{Invoice: stored, Issues: invoice.Validate(stored)})
}

func (s *Server) list(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.List())
}

func (s *Server) get(w http.ResponseWriter, r *http.Request) {
	inv, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "invoice not found")
		return
	}
	writeJSON(w, http.StatusOK, invoiceResponse{Invoice: inv, Issues: invoice.Validate(inv)})
}

func (s *Server) approve(w http.ResponseWriter, r *http.Request) {
	s.transition(w, r, func(inv invoice.Invoice) (invoice.Invoice, error) {
		return invoice.Approve(inv)
	})
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func (s *Server) reject(w http.ResponseWriter, r *http.Request) {
	var req rejectRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	s.transition(w, r, func(inv invoice.Invoice) (invoice.Invoice, error) {
		return invoice.Reject(inv, req.Reason)
	})
}

func (s *Server) transition(
	w http.ResponseWriter,
	r *http.Request,
	fn func(invoice.Invoice) (invoice.Invoice, error),
) {
	inv, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "invoice not found")
		return
	}
	updated, err := fn(inv)
	if err != nil {
		code, status := mapWorkflowError(err)
		writeError(w, status, code, err.Error())
		return
	}
	if err := s.store.Update(updated); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, invoiceResponse{Invoice: updated, Issues: invoice.Validate(updated)})
}

func (s *Server) export(w http.ResponseWriter, r *http.Request) {
	inv, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "invoice not found")
		return
	}
	csvBytes, err := invoice.ToCSV(inv)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+inv.InvoiceNumber+".csv\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvBytes)
}

func mapWorkflowError(err error) (code string, status int) {
	switch {
	case errors.Is(err, invoice.ErrBlockingIssues):
		return "blocking_issues", http.StatusUnprocessableEntity
	case errors.Is(err, invoice.ErrNotReviewable), errors.Is(err, invoice.ErrNotApproved):
		return "invalid_state", http.StatusConflict
	default:
		return "internal_error", http.StatusInternalServerError
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]map[string]string{
		"error": {"code": code, "message": message},
	})
}
