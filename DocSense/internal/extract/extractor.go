// Package extract turns raw invoice documents into structured invoices.
package extract

import (
	"context"

	"docsense/internal/invoice"
)

// Extractor parses raw document text into a structured invoice. The returned
// invoice has no ID or Status set; the ingest layer assigns those.
type Extractor interface {
	Extract(ctx context.Context, text string) (invoice.Invoice, error)
}
