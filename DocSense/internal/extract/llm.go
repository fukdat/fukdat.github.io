package extract

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"docsense/internal/invoice"
)

// LLMClient is the minimal seam over a large-language-model provider. In
// production this is implemented by an Anthropic API client; in tests it is a
// fake returning canned JSON.
type LLMClient interface {
	Complete(ctx context.Context, prompt string) (string, error)
}

// LLMExtractor extracts invoices by prompting an LLM to emit strict JSON.
type LLMExtractor struct {
	Client LLMClient
}

const promptTemplate = `Extract the invoice as JSON with exactly these keys: ` +
	`vendor_name, invoice_number, issue_date (YYYY-MM-DD), currency, ` +
	`subtotal_cents, tax_cents, total_cents, and line_items (array of ` +
	`{description, quantity, unit_price_cents, amount_cents}). ` +
	`All money is integer cents. Return only JSON.

Document:
%s`

type lineItemDTO struct {
	Description    string `json:"description"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	AmountCents    int64  `json:"amount_cents"`
}

type invoiceDTO struct {
	VendorName    string        `json:"vendor_name"`
	InvoiceNumber string        `json:"invoice_number"`
	IssueDate     string        `json:"issue_date"`
	Currency      string        `json:"currency"`
	SubtotalCents int64         `json:"subtotal_cents"`
	TaxCents      int64         `json:"tax_cents"`
	TotalCents    int64         `json:"total_cents"`
	LineItems     []lineItemDTO `json:"line_items"`
}

// Extract prompts the model and parses its JSON response into an invoice.
func (e LLMExtractor) Extract(ctx context.Context, text string) (invoice.Invoice, error) {
	raw, err := e.Client.Complete(ctx, fmt.Sprintf(promptTemplate, text))
	if err != nil {
		return invoice.Invoice{}, fmt.Errorf("llm completion failed: %w", err)
	}

	var dto invoiceDTO
	if err := json.Unmarshal([]byte(raw), &dto); err != nil {
		return invoice.Invoice{}, fmt.Errorf("llm returned invalid json: %w", err)
	}

	inv := invoice.Invoice{
		VendorName:    dto.VendorName,
		InvoiceNumber: dto.InvoiceNumber,
		Currency:      dto.Currency,
		SubtotalCents: dto.SubtotalCents,
		TaxCents:      dto.TaxCents,
		TotalCents:    dto.TotalCents,
	}
	if dto.IssueDate != "" {
		if d, err := time.Parse("2006-01-02", dto.IssueDate); err == nil {
			inv.IssueDate = d
		}
	}
	for _, l := range dto.LineItems {
		inv.LineItems = append(inv.LineItems, invoice.LineItem(l))
	}
	return inv, nil
}
