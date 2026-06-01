// Package invoice models extracted invoices and their lifecycle.
package invoice

import "time"

// Status is a stage in the invoice review lifecycle.
type Status string

const (
	StatusNeedsReview Status = "needs_review"
	StatusApproved    Status = "approved"
	StatusRejected    Status = "rejected"
	StatusExported    Status = "exported"
)

// LineItem is a single billed line on an invoice. Money is in integer cents.
type LineItem struct {
	Description    string `json:"description"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	AmountCents    int64  `json:"amount_cents"`
}

// Invoice is a structured document extracted from a raw source.
type Invoice struct {
	ID            string     `json:"id"`
	VendorName    string     `json:"vendor_name"`
	InvoiceNumber string     `json:"invoice_number"`
	IssueDate     time.Time  `json:"issue_date"`
	Currency      string     `json:"currency"`
	LineItems     []LineItem `json:"line_items"`
	SubtotalCents int64      `json:"subtotal_cents"`
	TaxCents      int64      `json:"tax_cents"`
	TotalCents    int64      `json:"total_cents"`
	Status        Status     `json:"status"`
	RejectReason  string     `json:"reject_reason,omitempty"`
}

// DedupKey identifies a logical invoice for idempotent storage.
func (i Invoice) DedupKey() string {
	return i.VendorName + "|" + i.InvoiceNumber
}
