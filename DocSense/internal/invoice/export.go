package invoice

import (
	"bytes"
	"encoding/csv"
	"strconv"
)

// ToCSV renders an invoice as a flat, accounting-friendly CSV: one row per
// line item, each repeating the invoice header fields.
func ToCSV(inv Invoice) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	header := []string{
		"invoice_number", "vendor", "issue_date", "currency",
		"description", "quantity", "unit_price_cents", "amount_cents",
	}
	if err := w.Write(header); err != nil {
		return nil, err
	}
	date := ""
	if !inv.IssueDate.IsZero() {
		date = inv.IssueDate.Format("2006-01-02")
	}
	for _, line := range inv.LineItems {
		row := []string{
			inv.InvoiceNumber, inv.VendorName, date, inv.Currency,
			line.Description,
			strconv.FormatInt(line.Quantity, 10),
			strconv.FormatInt(line.UnitPriceCents, 10),
			strconv.FormatInt(line.AmountCents, 10),
		}
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
