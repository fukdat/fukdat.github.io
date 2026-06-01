package extract

import (
	"context"
	"regexp"
	"strconv"
	"strings"
	"time"

	"docsense/internal/invoice"
)

// RuleBasedExtractor deterministically parses a semi-structured text invoice.
// It is the offline workhorse and the reference implementation used in tests.
type RuleBasedExtractor struct{}

var (
	reVendor   = regexp.MustCompile(`(?mi)^\s*Vendor:\s*(.+?)\s*$`)
	reNumber   = regexp.MustCompile(`(?mi)^\s*Invoice Number:\s*(.+?)\s*$`)
	reDate     = regexp.MustCompile(`(?mi)^\s*Date:\s*(\d{4}-\d{2}-\d{2})\s*$`)
	reCurrency = regexp.MustCompile(`(?mi)^\s*Currency:\s*([A-Za-z]{3})\s*$`)
	reLine     = regexp.MustCompile(`(?mi)^\s*-\s*(.+?)\s*\|\s*qty\s*(\d+)\s*\|\s*unit\s*(\d+)\s*\|\s*(\d+)\s*$`)
	reSubtotal = regexp.MustCompile(`(?mi)^\s*Subtotal:\s*(\d+)\s*$`)
	reTax      = regexp.MustCompile(`(?mi)^\s*Tax:\s*(\d+)\s*$`)
	reTotal    = regexp.MustCompile(`(?mi)^\s*Total:\s*(\d+)\s*$`)
)

func firstGroup(re *regexp.Regexp, text string) string {
	if m := re.FindStringSubmatch(text); m != nil {
		return m[1]
	}
	return ""
}

func firstInt(re *regexp.Regexp, text string) int64 {
	if m := re.FindStringSubmatch(text); m != nil {
		n, _ := strconv.ParseInt(m[1], 10, 64)
		return n
	}
	return 0
}

// Extract parses the document. Missing fields are left empty/zero so that
// validation can surface them rather than failing the whole extraction.
func (RuleBasedExtractor) Extract(_ context.Context, text string) (invoice.Invoice, error) {
	inv := invoice.Invoice{
		VendorName:    firstGroup(reVendor, text),
		InvoiceNumber: firstGroup(reNumber, text),
		Currency:      strings.ToUpper(firstGroup(reCurrency, text)),
		SubtotalCents: firstInt(reSubtotal, text),
		TaxCents:      firstInt(reTax, text),
		TotalCents:    firstInt(reTotal, text),
	}

	if raw := firstGroup(reDate, text); raw != "" {
		if d, err := time.Parse("2006-01-02", raw); err == nil {
			inv.IssueDate = d
		}
	}

	for _, m := range reLine.FindAllStringSubmatch(text, -1) {
		qty, _ := strconv.ParseInt(m[2], 10, 64)
		unit, _ := strconv.ParseInt(m[3], 10, 64)
		amount, _ := strconv.ParseInt(m[4], 10, 64)
		inv.LineItems = append(inv.LineItems, invoice.LineItem{
			Description:    strings.TrimSpace(m[1]),
			Quantity:       qty,
			UnitPriceCents: unit,
			AmountCents:    amount,
		})
	}
	return inv, nil
}
