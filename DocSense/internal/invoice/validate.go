package invoice

import "fmt"

// Issue is a single validation problem found on an invoice.
type Issue struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Validate checks required fields and that all monetary totals reconcile.
// An empty result means the invoice is safe to approve.
func Validate(inv Invoice) []Issue {
	var issues []Issue
	add := func(field, msg string) { issues = append(issues, Issue{Field: field, Message: msg}) }

	if inv.VendorName == "" {
		add("vendor_name", "vendor name is missing")
	}
	if inv.InvoiceNumber == "" {
		add("invoice_number", "invoice number is missing")
	}
	if inv.IssueDate.IsZero() {
		add("issue_date", "issue date is missing or unparseable")
	}
	if len(inv.Currency) != 3 {
		add("currency", "currency must be a 3-letter code")
	}
	if len(inv.LineItems) == 0 {
		add("line_items", "no line items were extracted")
	}

	var lineSum int64
	for idx, line := range inv.LineItems {
		if line.Quantity <= 0 || line.UnitPriceCents < 0 || line.AmountCents < 0 {
			add(fmt.Sprintf("line_items[%d]", idx), "negative or zero amounts are not allowed")
		}
		if line.Quantity*line.UnitPriceCents != line.AmountCents {
			add(fmt.Sprintf("line_items[%d]", idx), "quantity * unit price does not equal the line amount")
		}
		lineSum += line.AmountCents
	}

	if len(inv.LineItems) > 0 && lineSum != inv.SubtotalCents {
		add("subtotal_cents", "line items do not sum to the subtotal")
	}
	if inv.SubtotalCents+inv.TaxCents != inv.TotalCents {
		add("total_cents", "subtotal + tax does not equal the total")
	}
	return issues
}
